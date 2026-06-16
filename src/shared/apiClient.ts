import { dataUrlToMimeAndBase64 } from './imageData';
import { parsePromptAnalysis } from './jsonRepair';
import type { AppSettings, PromptAnalysis } from './types';

const API_TIMEOUT_MS = 180_000;
const API_TIMEOUT_SECONDS = API_TIMEOUT_MS / 1_000;
const API_RETRY_DELAYS_MS = [800, 1_800];
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

interface OpenAiContentPart {
  type?: string;
  text?: string;
}

export function normalizeChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Base URL is required.');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

export async function analyzeImageWithApi(input: {
  settings: AppSettings;
  imageDataUrl: string;
  promptText: string;
  signal?: AbortSignal;
}): Promise<PromptAnalysis> {
  throwIfAborted(input.signal);
  const { mime, base64 } = dataUrlToMimeAndBase64(input.imageDataUrl);
  const url = normalizeChatCompletionsUrl(input.settings.baseUrl);
  const requestBody = JSON.stringify({
    model: input.settings.model,
    temperature: 0.18,
    max_tokens: 12288,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: input.promptText },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
        ]
      }
    ]
  });

  for (let attempt = 0; attempt <= API_RETRY_DELAYS_MS.length; attempt += 1) {
    let result: ApiResponsePayload;
    try {
      throwIfAborted(input.signal);
      result = await postAnalysisRequest(url, input.settings.apiKey, requestBody, input.signal);
    } catch (error) {
      if (isAbortError(error)) {
        if (input.signal?.aborted) throw error;
        throw new Error(`API 请求超过 ${API_TIMEOUT_SECONDS} 秒未返回。`);
      }
      if (attempt < API_RETRY_DELAYS_MS.length && isRetryableTransportError(error)) {
        await delay(API_RETRY_DELAYS_MS[attempt], input.signal);
        continue;
      }
      throw error;
    }

    if (result.response.ok) {
      return parsePromptAnalysis(extractAssistantText(result.payload));
    }

    const message = extractApiError(result.payload) || `API request failed: ${result.response.status}`;
    if (attempt < API_RETRY_DELAYS_MS.length && isRetryableApiFailure(result.response.status, message)) {
      await delay(API_RETRY_DELAYS_MS[attempt], input.signal);
      continue;
    }
    throw new Error(normalizeApiErrorMessage(message));
  }

  throw new Error('API request failed.');
}

interface ApiResponsePayload {
  response: Response;
  payload: unknown;
}

async function postAnalysisRequest(url: string, apiKey: string, requestBody: string, signal?: AbortSignal): Promise<ApiResponsePayload> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const abortCurrentRequest = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abortCurrentRequest, { once: true });
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: requestBody
    });
    return { response, payload: await readJson(response) };
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortCurrentRequest);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function extractAssistantText(payload: unknown): string {
  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const typedPart = part as OpenAiContentPart;
        return typedPart.type === 'text' || typedPart.text ? typedPart.text || '' : '';
      })
      .join('');
  }

  throw new Error('API response did not include assistant content.');
}

function extractApiError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (record.error && typeof record.error === 'object') {
    const error = record.error as Record<string, unknown>;
    if (typeof error.message === 'string') return error.message;
  }
  return undefined;
}

function isRetryableApiFailure(status: number, message: string): boolean {
  return RETRYABLE_STATUS_CODES.has(status) || isProxyServiceUnavailable(message);
}

function isRetryableTransportError(error: unknown): boolean {
  return error instanceof TypeError || isProxyServiceUnavailable(errorToMessage(error));
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function normalizeApiErrorMessage(message: string): string {
  if (isProxyServiceUnavailable(message)) {
    return 'BridgeDeck 或上游代理暂时不可用（503）。已自动重试仍失败，请稍后再试；如果连续出现，请检查本地 BridgeDeck、上游模型服务或代理配置。';
  }
  return message;
}

function isProxyServiceUnavailable(message: string): boolean {
  return /ProxyError:\s*503\s+Service Unavailable/i.test(message) || /503\s+Service Unavailable/i.test(message);
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Analysis canceled.', 'AbortError');
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, ms);
    const abort = () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException('Analysis canceled.', 'AbortError'));
    };
    if (!signal) return;
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}
