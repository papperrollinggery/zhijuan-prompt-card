import { dataUrlToMimeAndBase64, getDataUrlImageDimensions, type ImageDimensions } from './imageData';
import { parsePromptAnalysis, type SourceFrameEvidence } from './jsonRepair';
import type { AppSettings, PromptAnalysis } from './types';
import { DEFAULT_API_TIMEOUT_SECONDS, MAX_API_TIMEOUT_SECONDS, MIN_API_TIMEOUT_SECONDS } from './defaults';

const API_RETRY_DELAYS_MS = [800, 1_800];
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const ANALYSIS_TEMPERATURE = 0.18;
const ANALYSIS_MAX_OUTPUT_TOKENS = 12_288;
const ANALYSIS_REASONING_EFFORT: ReasoningEffort = 'medium';
const ANALYSIS_IMAGE_DETAIL: ImageDetail = 'high';

interface OpenAiContentPart {
  type?: string;
  text?: string;
}

type UnsupportedParameterName = 'max_tokens' | 'temperature' | 'reasoning_effort' | 'image_detail';
export type ReasoningEffort = 'low' | 'medium' | 'high';
type ImageDetail = 'high';

export interface AnalysisRequestOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  reasoning_effort?: ReasoningEffort;
  image_detail?: ImageDetail;
}

export function normalizeChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Base URL is required.');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function buildAnalysisRequestOptions(model: string): AnalysisRequestOptions {
  const trimmedModel = model.trim();
  if (usesReasoningCompletionOptions(trimmedModel)) {
    return {
      model: trimmedModel,
      max_completion_tokens: ANALYSIS_MAX_OUTPUT_TOKENS,
      reasoning_effort: ANALYSIS_REASONING_EFFORT,
      image_detail: ANALYSIS_IMAGE_DETAIL
    };
  }

  return {
    model: trimmedModel,
    temperature: ANALYSIS_TEMPERATURE,
    max_tokens: ANALYSIS_MAX_OUTPUT_TOKENS,
    image_detail: ANALYSIS_IMAGE_DETAIL
  };
}

export function applyUnsupportedParameterFallback(options: AnalysisRequestOptions, message: string): boolean {
  const parameter = extractUnsupportedParameter(message);
  if (!parameter) return false;

  if (parameter === 'max_tokens') {
    if (options.max_tokens === undefined) return false;
    options.max_completion_tokens ??= options.max_tokens;
    delete options.max_tokens;
    return true;
  }

  if (parameter === 'temperature') {
    if (options.temperature === undefined) return false;
    delete options.temperature;
    return true;
  }

  if (parameter === 'image_detail') {
    if (options.image_detail === undefined) return false;
    delete options.image_detail;
    return true;
  }

  if (parameter === 'reasoning_effort') {
    if (options.reasoning_effort === undefined) return false;
    delete options.reasoning_effort;
    return true;
  }

  return false;
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
  const requestOptions = buildAnalysisRequestOptions(input.settings.model);
  const timeoutMs = buildApiTimeoutMs(input.settings.apiTimeoutSeconds);
  let sourceFrameEvidence: SourceFrameEvidence | undefined;
  let sourceFrameMetadata = '';
  try {
    const dimensions = await getDataUrlImageDimensions(input.imageDataUrl, input.signal);
    sourceFrameEvidence = dimensions ? buildSourceFrameEvidence(dimensions) : undefined;
    sourceFrameMetadata = sourceFrameEvidence ? formatSourceImageFrameMetadata(sourceFrameEvidence) : '';
  } catch (error) {
    if (isAbortError(error)) throw error;
  }

  let retryDelayIndex = 0;
  while (true) {
    let result: ApiResponsePayload;
    try {
      throwIfAborted(input.signal);
      const requestBody = buildAnalysisRequestBody(requestOptions, input.promptText, mime, base64, sourceFrameMetadata);
      result = await postAnalysisRequest(url, input.settings.apiKey, requestBody, timeoutMs, input.signal);
    } catch (error) {
      if (isAbortError(error)) {
        if (input.signal?.aborted) throw error;
        throw new Error(`API 请求超过 ${timeoutMs / 1_000} 秒未返回。`);
      }
      if (retryDelayIndex < API_RETRY_DELAYS_MS.length && isRetryableTransportError(error)) {
        await delay(API_RETRY_DELAYS_MS[retryDelayIndex], input.signal);
        retryDelayIndex += 1;
        continue;
      }
      throw error;
    }

    if (result.response.ok) {
      return parsePromptAnalysis(extractAssistantText(result.payload), sourceFrameEvidence);
    }

    const message = extractApiError(result.payload) || `API request failed: ${result.response.status}`;
    if (applyUnsupportedParameterFallback(requestOptions, message)) {
      continue;
    }

    if (retryDelayIndex < API_RETRY_DELAYS_MS.length && isRetryableApiFailure(result.response.status, message)) {
      await delay(API_RETRY_DELAYS_MS[retryDelayIndex], input.signal);
      retryDelayIndex += 1;
      continue;
    }
    throw new Error(normalizeApiErrorMessage(message));
  }
}

export function buildApiTimeoutMs(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const seconds = Number.isFinite(numericValue) ? numericValue : DEFAULT_API_TIMEOUT_SECONDS;
  return Math.min(MAX_API_TIMEOUT_SECONDS, Math.max(MIN_API_TIMEOUT_SECONDS, Math.round(seconds))) * 1_000;
}

export function buildAnalysisRequestBody(
  options: AnalysisRequestOptions,
  promptText: string,
  mime: string,
  base64: string,
  sourceFrameMetadata = ''
): string {
  const { image_detail, ...requestOptions } = options;
  const imageUrl: { url: string; detail?: ImageDetail } = { url: `data:${mime};base64,${base64}` };
  if (image_detail) imageUrl.detail = image_detail;

  return JSON.stringify({
    ...requestOptions,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: appendSourceImageFrameMetadata(promptText, sourceFrameMetadata) },
          { type: 'image_url', image_url: imageUrl }
        ]
      }
    ]
  });
}

export function buildSourceFrameEvidence(dimensions: ImageDimensions): SourceFrameEvidence {
  const width = Math.max(1, Math.round(dimensions.width));
  const height = Math.max(1, Math.round(dimensions.height));
  const orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
  const aspectRatio = formatApproximateAspectRatio(width, height);
  return { width, height, orientation, aspectRatio };
}

export function formatSourceImageFrameMetadata(sourceFrame: SourceFrameEvidence): string {
  return [
    'Source image frame metadata:',
    `- Uploaded image dimensions: ${sourceFrame.width} px wide x ${sourceFrame.height} px tall.`,
    `- Observed orientation: ${sourceFrame.orientation}.`,
    `- Observed aspect ratio: approximately ${sourceFrame.aspectRatio}.`,
    'Use this metadata as hard source-frame evidence. Preserve this orientation, aspect ratio, and crop in every prompt field. Do not call the image horizontal, landscape, widescreen, vertical, portrait, or square unless that matches this metadata.'
  ].join('\n');
}

function appendSourceImageFrameMetadata(promptText: string, sourceFrameMetadata: string): string {
  return sourceFrameMetadata ? `${promptText.trim()}\n\n${sourceFrameMetadata}` : promptText;
}

function formatApproximateAspectRatio(width: number, height: number): string {
  const divisor = greatestCommonDivisor(width, height);
  const reducedWidth = width / divisor;
  const reducedHeight = height / divisor;
  if (Math.max(reducedWidth, reducedHeight) <= 100) return `${reducedWidth}:${reducedHeight}`;
  if (width >= height) return `${trimRatio(width / height)}:1`;
  return `1:${trimRatio(height / width)}`;
}

function trimRatio(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

interface ApiResponsePayload {
  response: Response;
  payload: unknown;
}

async function postAnalysisRequest(
  url: string,
  apiKey: string,
  requestBody: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<ApiResponsePayload> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
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

function usesReasoningCompletionOptions(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  const modelId = normalized.split(/[/:]/).filter(Boolean).at(-1) || normalized;
  return /^gpt-5(?:$|[-_.])/.test(modelId) || /^o\d+(?:$|[-_.])/.test(modelId) || /(?:^|[-_.])reasoning(?:$|[-_.])/.test(modelId);
}

function extractUnsupportedParameter(message: string): UnsupportedParameterName | undefined {
  if (!/(unsupported|not supported|does not support|unknown|unrecognized|unexpected)/i.test(message)) return undefined;
  if (mentionsParameter(message, 'max_tokens')) return 'max_tokens';
  if (mentionsParameter(message, 'temperature')) return 'temperature';
  if (mentionsParameter(message, 'reasoning_effort')) return 'reasoning_effort';
  if (mentionsParameter(message, 'image_detail')) return 'image_detail';
  return undefined;
}

function mentionsParameter(message: string, parameter: UnsupportedParameterName): boolean {
  if (parameter === 'reasoning_effort') return /reasoning[\s_-]?effort/i.test(message);
  if (parameter === 'image_detail') return /(?:image_url\.)?detail|image[\s_-]?detail/i.test(message);
  return message.toLowerCase().includes(parameter);
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
