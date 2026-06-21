import { DEFAULT_SETTINGS, HISTORY_LIMIT, MAX_API_TIMEOUT_SECONDS, MIN_API_TIMEOUT_SECONDS, STORAGE_KEYS } from './defaults';
import type { AppSettings, HistoryEntry, InterfaceLanguage, PromptAnalysis } from './types';

type StorageRecord = Record<string, unknown>;

const THUMBNAIL_MAX_BYTES = 180_000;
const THUMBNAIL_BUDGET_BYTES = 5_400_000;
const THUMBNAIL_KEEP_LIMIT = 80;
const memoryStorage = new Map<string, unknown>();
let historyMutationQueue: Promise<unknown> = Promise.resolve();

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

async function readLocal<T>(keys: string[]): Promise<Record<string, T | undefined>> {
  if (!hasChromeStorage()) {
    return Object.fromEntries(keys.map((key) => [key, memoryStorage.get(key) as T | undefined]));
  }
  try {
    return await chrome.storage.local.get(keys) as Record<string, T | undefined>;
  } catch (error) {
    if (isExtensionContextInvalidated(error)) return Object.fromEntries(keys.map((key) => [key, memoryStorage.get(key) as T | undefined]));
    throw error;
  }
}

async function writeLocal(values: StorageRecord): Promise<void> {
  if (!hasChromeStorage()) {
    for (const [key, value] of Object.entries(values)) memoryStorage.set(key, value);
    return;
  }
  try {
    await chrome.storage.local.set(values);
  } catch (error) {
    if (!isExtensionContextInvalidated(error)) throw error;
    for (const [key, value] of Object.entries(values)) memoryStorage.set(key, value);
  }
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return /extension context invalidated/i.test(error instanceof Error ? error.message : String(error));
}

export async function getSettings(): Promise<AppSettings> {
  const record = await readLocal<Partial<AppSettings>>([STORAGE_KEYS.settings]);
  return normalizeSettings(record[STORAGE_KEYS.settings]);
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const merged = normalizeSettings(settings);
  await writeLocal({ [STORAGE_KEYS.settings]: merged });
  return merged;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const record = await readLocal<HistoryEntry[]>([STORAGE_KEYS.history]);
  const value = record[STORAGE_KEYS.history];
  const history: HistoryEntry[] = Array.isArray(value) ? value : [];
  return history.slice(0, HISTORY_LIMIT);
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<HistoryEntry[]> {
  return enqueueHistoryMutation(async () => {
    const history = await getHistory();
    const next = compactHistoryEntries([entry, ...history.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT));
    await writeLocal({ [STORAGE_KEYS.history]: next });
    return next;
  });
}

export async function updateHistoryEntry(id: string, patch: Partial<HistoryEntry>): Promise<HistoryEntry | undefined> {
  return enqueueHistoryMutation(async () => {
    const history = await getHistory();
    let updated: HistoryEntry | undefined;
    const next = history.map((entry) => {
      if (entry.id !== id) return entry;
      updated = { ...entry, ...patch };
      return updated;
    });
    await writeLocal({ [STORAGE_KEYS.history]: compactHistoryEntries(next) });
    return updated;
  });
}

export async function failRunningHistoryEntries(error = '上次识别未完成，已自动结束。'): Promise<void> {
  await enqueueHistoryMutation(async () => {
    const history = await getHistory();
    const next = history.map((entry) => (entry.status === 'running' ? { ...entry, status: 'failed' as const, error } : entry));
    await writeLocal({ [STORAGE_KEYS.history]: compactHistoryEntries(next) });
  });
}

export async function compactHistoryStorage(): Promise<void> {
  await enqueueHistoryMutation(async () => {
    const history = await getHistory();
    await writeLocal({ [STORAGE_KEYS.history]: compactHistoryEntries(history) });
  });
}

export async function deleteHistoryEntry(id: string): Promise<HistoryEntry[]> {
  return enqueueHistoryMutation(async () => {
    const next = (await getHistory()).filter((entry) => entry.id !== id);
    await writeLocal({ [STORAGE_KEYS.history]: next });
    return next;
  });
}

export async function clearHistory(): Promise<void> {
  await enqueueHistoryMutation(async () => {
    await writeLocal({ [STORAGE_KEYS.history]: [] });
  });
}

export function createRunningHistoryEntry(input: {
  imageUrl?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
  title?: string;
}): HistoryEntry {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    imageUrl: input.imageUrl,
    thumbnailUrl: input.thumbnailUrl,
    pageUrl: input.pageUrl,
    title: input.title || 'Running analysis',
    favorite: false,
    status: 'running'
  };
}

function compactHistoryEntries(history: HistoryEntry[]): HistoryEntry[] {
  let thumbnailBytes = 0;
  let thumbnailCount = 0;

  return history.slice(0, HISTORY_LIMIT).map((entry) => {
    const next = entry.imageUrl?.startsWith('data:') ? { ...entry, imageUrl: undefined } : { ...entry };
    const thumbnailUrl = next.thumbnailUrl;
    if (!thumbnailUrl) return next;

    const bytes = estimateAsciiBytes(thumbnailUrl);
    if (!thumbnailUrl.startsWith('data:image/') || bytes > THUMBNAIL_MAX_BYTES || thumbnailCount >= THUMBNAIL_KEEP_LIMIT || thumbnailBytes + bytes > THUMBNAIL_BUDGET_BYTES) {
      return { ...next, thumbnailUrl: undefined };
    }

    thumbnailBytes += bytes;
    thumbnailCount += 1;
    return next;
  });
}

function enqueueHistoryMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = historyMutationQueue.catch(() => undefined).then(operation);
  historyMutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function estimateAsciiBytes(value: string): number {
  return value.length;
}

export function buildHistoryTitle(analysis?: PromptAnalysis, fallback = 'Untitled image'): string {
  const subject = analysis?.json_prompt?.subject?.trim();
  if (subject) return truncate(subject, 96);
  const summary = analysis?.json_prompt?.summary?.trim();
  if (summary) return truncate(summary, 96);
  const legacyAnalysis = analysis as (PromptAnalysis & { recreation_prompt?: string }) | undefined;
  const prompt = legacyAnalysis?.recreation_prompt?.trim() || analysis?.en?.prompt?.trim() || analysis?.zh?.prompt?.trim();
  if (prompt) return truncate(prompt, 72);
  return fallback;
}

function normalizeSettings(input?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    enabled: input?.enabled ?? DEFAULT_SETTINGS.enabled,
    baseUrl: input?.baseUrl?.trim() || DEFAULT_SETTINGS.baseUrl,
    apiKey: input?.apiKey ?? DEFAULT_SETTINGS.apiKey,
    model: input?.model?.trim() || DEFAULT_SETTINGS.model,
    apiTimeoutSeconds: normalizeApiTimeoutSeconds(input?.apiTimeoutSeconds),
    interfaceLanguage: normalizeInterfaceLanguage(input?.interfaceLanguage ?? DEFAULT_SETTINGS.interfaceLanguage),
    defaultGeneratorSite: input?.defaultGeneratorSite || DEFAULT_SETTINGS.defaultGeneratorSite,
    persistentFloatingButton: input?.persistentFloatingButton ?? DEFAULT_SETTINGS.persistentFloatingButton
  };
}

function normalizeApiTimeoutSeconds(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_SETTINGS.apiTimeoutSeconds;
  return Math.min(MAX_API_TIMEOUT_SECONDS, Math.max(MIN_API_TIMEOUT_SECONDS, Math.round(numericValue)));
}

function normalizeInterfaceLanguage(language: unknown): InterfaceLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
