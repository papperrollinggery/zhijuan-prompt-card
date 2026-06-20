import type { HistoryEntry, InterfaceLanguage, PromptAnalysis } from './types';

export type HistoryDisplayLanguage = 'zh' | 'en';

const jsonPromptKeyOrder: Array<keyof PromptAnalysis['json_prompt']> = [
  'schema_version',
  'summary',
  'subject',
  'action_pose',
  'details_appearance',
  'environment_background',
  'lighting_atmosphere',
  'composition_framing',
  'style_camera',
  'aspect_ratio',
  'likely_generation_intent',
  'colors',
  'materials',
  'quality_modifiers',
  'fidelity_priorities',
  'global_fingerprint',
  'observation_units',
  'text_elements',
  'reconstruction_priorities',
  'spatial_dynamics',
  'generation_prompt',
  'generation_negative_prompt'
];

const globalFingerprintKeyOrder: Array<keyof PromptAnalysis['json_prompt']['global_fingerprint']> = [
  'style_index',
  'density',
  'spatial_flow',
  'optical_finish',
  'render_finish',
  'palette'
];

const observationUnitKeyOrder: Array<keyof PromptAnalysis['json_prompt']['observation_units'][number]> = [
  'id',
  'kind',
  'priority',
  'prompt',
  'evidence',
  'location',
  'must_preserve',
  'avoid_drift'
];

const textElementKeyOrder: Array<keyof PromptAnalysis['json_prompt']['text_elements'][number]> = [
  'content',
  'language',
  'role',
  'location',
  'typography',
  'legibility',
  'priority'
];

const reconstructionPriorityKeyOrder: Array<keyof PromptAnalysis['json_prompt']['reconstruction_priorities'][number]> = [
  'cue',
  'priority',
  'tradeoff',
  'compile_to_en_prompt',
  'risk_if_missing'
];

export function normalizeHistoryLanguage(language: InterfaceLanguage): HistoryDisplayLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

export function getHistoryPrompt(entry: HistoryEntry, language: InterfaceLanguage | HistoryDisplayLanguage = 'en'): string {
  return getGeneratorPrompt(entry.analysis);
}

export function getGeneratorPrompt(analysis?: PromptAnalysis): string {
  const legacyAnalysis = analysis as (PromptAnalysis & { recreation_prompt?: string }) | undefined;
  return firstSanitizedPrompt(
    analysis?.json_prompt?.generation_prompt,
    legacyAnalysis?.recreation_prompt,
    analysis?.en.prompt,
    analysis?.zh.prompt
  );
}

export function stringifyJsonPrompt(jsonPrompt: PromptAnalysis['json_prompt'] | undefined): string {
  const ordered = orderKnownKeys(toRecord(jsonPrompt), jsonPromptKeyOrder);
  if (isRecord(ordered.global_fingerprint)) {
    ordered.global_fingerprint = orderKnownKeys(ordered.global_fingerprint, globalFingerprintKeyOrder);
  }
  if (Array.isArray(ordered.observation_units)) {
    ordered.observation_units = ordered.observation_units.map((unit) => orderKnownKeysIfRecord(unit, observationUnitKeyOrder));
  }
  if (Array.isArray(ordered.text_elements)) {
    ordered.text_elements = ordered.text_elements.map((element) => orderKnownKeysIfRecord(element, textElementKeyOrder));
  }
  if (Array.isArray(ordered.reconstruction_priorities)) {
    ordered.reconstruction_priorities = ordered.reconstruction_priorities.map((priority) => orderKnownKeysIfRecord(priority, reconstructionPriorityKeyOrder));
  }
  return JSON.stringify(ordered, null, 2);
}

export function stringifyPromptAnalysis(analysis: PromptAnalysis): string {
  const source = toRecord(analysis);
  const ordered: Record<string, unknown> = {};
  const knownKeys = ['zh', 'en', 'zh_style_tags', 'en_style_tags', 'json_prompt', 'prompt_core', 'negative_prompt'];
  for (const key of knownKeys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    ordered[key] = key === 'json_prompt' ? JSON.parse(stringifyJsonPrompt(source[key] as PromptAnalysis['json_prompt'])) : source[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (!knownKeys.includes(key) && key !== 'recreation_prompt') ordered[key] = value;
  }
  return JSON.stringify(ordered, null, 2);
}

export function getHistoryPreviewText(entry: HistoryEntry, language: InterfaceLanguage | HistoryDisplayLanguage = 'en'): string {
  const prompt = getHistoryPrompt(entry, language);
  if (prompt) return prompt;
  if (entry.error) return entry.error;
  if (entry.status === 'running') return normalizeHistoryLanguage(language as InterfaceLanguage) === 'zh' ? '正在生成提示词。' : 'Prompt generation is running.';
  if (entry.status === 'canceled') return normalizeHistoryLanguage(language as InterfaceLanguage) === 'zh' ? '已取消。' : 'Canceled.';
  return entry.title || (normalizeHistoryLanguage(language as InterfaceLanguage) === 'zh' ? '无标题记录' : 'Untitled record');
}

export function getHistoryImageSrc(entry: HistoryEntry): string {
  return entry.thumbnailUrl || entry.imageUrl || '';
}

export function canShowHistoryImage(entry: HistoryEntry, imageSrc = getHistoryImageSrc(entry)): boolean {
  return entry.status === 'success' && Boolean(imageSrc);
}

export function getHistoryImageKey(entry: HistoryEntry, imageSrc = getHistoryImageSrc(entry)): string {
  if (!imageSrc) return `${entry.id}:missing`;
  return `${entry.id}:${imageSrc.length}:${imageSrc.slice(0, 32)}`;
}

export function getHistorySource(entry: HistoryEntry): string | undefined {
  return entry.imageUrl || entry.pageUrl;
}

export function getHistoryStatusLabel(status: HistoryEntry['status'], language: InterfaceLanguage | HistoryDisplayLanguage): string {
  if (normalizeHistoryLanguage(language as InterfaceLanguage) !== 'zh') return status;
  if (status === 'success') return '成功';
  if (status === 'failed') return '失败';
  if (status === 'running') return '运行中';
  return '已取消';
}

export function getVisualHistoryEntries(entries: HistoryEntry[], limit = 8): HistoryEntry[] {
  const withImages: HistoryEntry[] = [];
  const withoutImages: HistoryEntry[] = [];
  entries.forEach((entry) => {
    if (canShowHistoryImage(entry)) {
      withImages.push(entry);
    } else {
      withoutImages.push(entry);
    }
  });
  return [...withImages, ...withoutImages].slice(0, limit);
}

function orderKnownKeys(value: Record<string, unknown>, keyOrder: readonly string[]): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const knownKeys = new Set<string>(keyOrder.map(String));
  for (const key of keyOrder) {
    if (Object.prototype.hasOwnProperty.call(value, key)) ordered[String(key)] = value[String(key)];
  }
  for (const [key, item] of Object.entries(value)) {
    if (!knownKeys.has(key)) ordered[key] = item;
  }
  return ordered;
}

function orderKnownKeysIfRecord(value: unknown, keyOrder: readonly string[]): unknown {
  return isRecord(value) ? orderKnownKeys(value, keyOrder) : value;
}

function firstSanitizedPrompt(...prompts: Array<string | undefined>): string {
  for (const prompt of prompts) {
    const sanitized = sanitizeGeneratorPromptText(prompt || '');
    if (sanitized) return sanitized;
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function sanitizeGeneratorPromptText(prompt: string): string {
  return prompt
    .trim()
    .replace(/"?schema_version"?\s*:\s*"?reconstruction_v2"?[,.]?\s*/gi, '')
    .replace(/\b(?:schema_version|reconstruction_v2)\b[,:;.]?\s*/gi, '')
    .replace(/^\s*recreate\s+(an?|the)\s+/i, (_match, article: string) => `Create ${article} `)
    .replace(/\brecreate\s+this\s+image\b/gi, 'create the described image')
    .replace(/\brecreate\s+the\s+source\b/gi, 'create the described target')
    .replace(/\brecreate\b/gi, 'create')
    .replace(/\breference image\b/gi, 'visual target')
    .replace(/\bsource image\b/gi, 'visual target')
    .replace(/\bsource screenshot\b/gi, 'target screenshot')
    .replace(/\bsource visual\b/gi, 'visual target')
    .replace(/\bthe source\b/gi, 'the target')
    .replace(/\bthis source\b/gi, 'this target')
    .replace(/\s+/g, ' ')
    .trim();
}
