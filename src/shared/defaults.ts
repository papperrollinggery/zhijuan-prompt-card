import type { AppSettings, GeneratorSite } from './types';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:8876/v1';
export const DEFAULT_API_KEY = 'local-bridge';
export const DEFAULT_MODEL = 'gpt-5.5';
export const DEFAULT_API_TIMEOUT_SECONDS = 600;
export const MIN_API_TIMEOUT_SECONDS = 60;
export const MAX_API_TIMEOUT_SECONDS = 1_800;
export const HISTORY_LIMIT = 120;

export const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  baseUrl: DEFAULT_BASE_URL,
  apiKey: DEFAULT_API_KEY,
  model: DEFAULT_MODEL,
  apiTimeoutSeconds: DEFAULT_API_TIMEOUT_SECONDS,
  interfaceLanguage: 'zh',
  defaultGeneratorSite: 'chatgpt',
  persistentFloatingButton: true
};

export const STORAGE_KEYS = {
  settings: 'zhijuan.settings',
  history: 'zhijuan.history'
} as const;

export const GENERATOR_SITE_IDS: GeneratorSite[] = ['chatgpt', 'codex', 'jimeng', 'gemini', 'midjourney', 'lovart'];
