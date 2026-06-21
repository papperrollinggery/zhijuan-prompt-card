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
    analysis?.en?.prompt,
    analysis?.zh?.prompt
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

export function stringifyGeneratorJsonPrompt(analysis: PromptAnalysis | undefined): string {
  const jsonPrompt = toRecord(analysis?.json_prompt);
  const output: Record<string, unknown> = {};

  setFilledGeneratorJsonField(output, 'prompt', getGeneratorPrompt(analysis));
  setFilledGeneratorJsonField(output, 'negative_prompt', firstFilledText(jsonPrompt.generation_negative_prompt, analysis?.negative_prompt));
  setFilledGeneratorJsonField(output, 'aspect_ratio', jsonPrompt.aspect_ratio);
  setFilledGeneratorJsonField(output, 'prompt_core', analysis?.prompt_core);
  setFilledGeneratorJsonField(output, 'style_tags', analysis?.en_style_tags);
  setFilledGeneratorJsonField(output, 'subject', jsonPrompt.subject);
  setFilledGeneratorJsonField(output, 'action_pose', jsonPrompt.action_pose);
  setFilledGeneratorJsonField(output, 'details_appearance', jsonPrompt.details_appearance);
  setFilledGeneratorJsonField(output, 'environment_background', jsonPrompt.environment_background);
  setFilledGeneratorJsonField(output, 'lighting_atmosphere', jsonPrompt.lighting_atmosphere);
  setFilledGeneratorJsonField(output, 'composition_framing', jsonPrompt.composition_framing);
  setFilledGeneratorJsonField(output, 'style_camera', jsonPrompt.style_camera);
  setFilledGeneratorJsonField(output, 'colors', jsonPrompt.colors);
  setFilledGeneratorJsonField(output, 'materials', jsonPrompt.materials);
  setFilledGeneratorJsonField(output, 'quality_modifiers', jsonPrompt.quality_modifiers);
  setFilledGeneratorJsonField(output, 'spatial_dynamics', jsonPrompt.spatial_dynamics);
  setFilledGeneratorJsonField(output, 'text_elements', Array.isArray(jsonPrompt.text_elements) ? jsonPrompt.text_elements.map((item) => orderKnownKeysIfRecord(item, textElementKeyOrder)) : undefined);
  setFilledGeneratorJsonField(output, 'fidelity_priorities', jsonPrompt.fidelity_priorities);
  setFilledGeneratorJsonField(
    output,
    'reconstruction_priorities',
    Array.isArray(jsonPrompt.reconstruction_priorities)
      ? jsonPrompt.reconstruction_priorities.map((item) => orderKnownKeysIfRecord(item, reconstructionPriorityKeyOrder))
      : undefined
  );

  return JSON.stringify(output, null, 2);
}

export function stringifyPromptAnalysis(analysis: PromptAnalysis): string {
  const source = toRecord(analysis);
  const legacyRecreationPrompt = typeof source.recreation_prompt === 'string' ? source.recreation_prompt.trim() : '';
  const ordered: Record<string, unknown> = {};
  const knownKeys = ['zh', 'en', 'zh_style_tags', 'en_style_tags', 'json_prompt', 'prompt_core', 'negative_prompt'];
  for (const key of knownKeys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    ordered[key] = key === 'json_prompt' ? JSON.parse(stringifyJsonPrompt(source[key] as PromptAnalysis['json_prompt'])) : source[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (!knownKeys.includes(key) && key !== 'recreation_prompt') ordered[key] = value;
  }
  if (legacyRecreationPrompt) ordered.recreation_prompt = legacyRecreationPrompt;
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

function setFilledGeneratorJsonField(target: Record<string, unknown>, key: string, value: unknown): void {
  const normalized = normalizeGeneratorJsonValue(value);
  if (isFilledGeneratorJsonValue(normalized)) target[key] = normalized;
}

function firstFilledText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function normalizeGeneratorJsonValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return shouldPreserveGeneratorJsonText(key) ? trimmed : sanitizeGeneratorPromptText(trimmed);
  }
  if (Array.isArray(value)) return value.map((item) => normalizeGeneratorJsonValue(item, key)).filter(isFilledGeneratorJsonValue);
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .map(([itemKey, item]) => [itemKey, normalizeGeneratorJsonValue(item, itemKey)] as const)
      .filter(([, item]) => isFilledGeneratorJsonValue(item));
    return Object.fromEntries(entries);
  }
  return value;
}

function shouldPreserveGeneratorJsonText(key: string): boolean {
  return key === 'content';
}

function isFilledGeneratorJsonValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isFilledGeneratorJsonValue);
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (isRecord(value)) return Object.values(value).some(isFilledGeneratorJsonValue);
  return false;
}

function firstSanitizedPrompt(...prompts: Array<string | undefined>): string {
  for (const prompt of prompts) {
    const sanitized = sanitizeGeneratorPromptText(prompt || '');
    if (sanitized && !isGenericHandoffFiller(sanitized)) return sanitized;
  }
  return '';
}

function isGenericHandoffFiller(prompt: string): boolean {
  const normalized = prompt.trim().replace(/[.!;,:：]+$/, '').trim().toLowerCase();
  if (!normalized) return true;
  return /^(?:visual targets?|target screenshots?|target photos?|create|create the described (?:image|target))$/.test(normalized);
}

const handoffActionVerbSource = String.raw`(?:create|keep|preserve|retain|include|use|maintain|render|show|depict)`;
const uploadRequestTailSource = String.raw`(?:\s+(?:for|as|to)\s+(?:(?!\s+(?:and|then)\s+${handoffActionVerbSource}\b|\s+with\b)[^.;,\n])+)?`;
const referenceVisualNounSource = String.raw`(?:images?|screenshots?|visuals?|photos?)`;
const referenceInputObjectNounSource = String.raw`(?:${referenceVisualNounSource}|references?)`;
const referenceRoleSource = String.raw`(?:(?:an?|the)\s+)?references?`;
const bareReferenceObjectSource = String.raw`references?\b(?!\s+${referenceVisualNounSource})(?=\s*(?:[.;,\n]|$)|\s+(?:as|for|to|and|then)\b)`;
const uploadReferenceObjectSource = String.raw`(?:(?:source|reference)\s+${referenceVisualNounSource}|uploaded\s+(?:(?:source|reference)\s+)?${referenceInputObjectNounSource}|${referenceVisualNounSource}\s+as\s+${referenceRoleSource}|${bareReferenceObjectSource})`;
const uploadReferenceRequestSource = String.raw`(?:please\s+)?(?:upload|attach|provide)\s+(?:an?\s+|the\s+)?${uploadReferenceObjectSource}\b${uploadRequestTailSource}`;
const referenceContextNounSource = String.raw`(?:(?:this|that|these|those)\s+|(?:(?:an?\s+|the\s+)?uploaded\s+))(?:source\s+|reference\s+)?${referenceInputObjectNounSource}`;
const bareReferenceInputNounSource = String.raw`(?:an?\s+|the\s+)?${referenceVisualNounSource}\s+as\s+${referenceRoleSource}`;
const bareReferenceInputObjectSource = String.raw`(?:an?\s+|the\s+)?${bareReferenceObjectSource}`;
const referenceInputRequestSource = String.raw`(?:please\s+)?(?:use|using)\s+(?:${referenceContextNounSource}\b(?:\s+as\s+${referenceRoleSource})?|${bareReferenceInputNounSource}\b|${bareReferenceInputObjectSource}\b)${uploadRequestTailSource}`;
const inputRequestSource = String.raw`(?:${uploadReferenceRequestSource}|${referenceInputRequestSource})`;
const joinedInputRequestConnectorSource = String.raw`(?:\s+(?:and|then)\s+|,\s+)`;
const joinedUploadReferenceRequestPattern = new RegExp(String.raw`${joinedInputRequestConnectorSource}${uploadReferenceRequestSource}`, 'gi');
const joinedReferenceInputRequestPattern = new RegExp(String.raw`${joinedInputRequestConnectorSource}${referenceInputRequestSource}`, 'gi');
const inlineReferenceInputRequestPattern = new RegExp(String.raw`\s+${referenceInputRequestSource}`, 'gi');
const leadingUploadReferenceRequestPattern = new RegExp(String.raw`\b${uploadReferenceRequestSource}(?:,\s*)?`, 'gi');
const leadingReferenceInputRequestPattern = new RegExp(String.raw`\b${referenceInputRequestSource}(?:,\s*)?`, 'gi');
const detachedInputRequestBoundaryPattern = new RegExp(String.raw`^\s*(?:,\s*|\s+(?:and|then)\s+)${inputRequestSource}`, 'i');
const leadingHandoffConnectorPattern = new RegExp(String.raw`^(\s*)(?:then|and)\s+(?=${handoffActionVerbSource}\b)`, 'i');
const leadingHandoffActionPattern = new RegExp(String.raw`^(\s*)(${handoffActionVerbSource})\b`, 'i');
const leadingDanglingConnectorPattern = /^(\s*)(?:then|and)\s*(?=[.;,\n]|$)/i;
const leadingBoundaryHandoffConnectorPattern = new RegExp(String.raw`^(\s*)([.;])\s*(?:then|and)\s+(?=${handoffActionVerbSource}\b)`, 'i');
const leadingBoundaryHandoffActionPattern = new RegExp(String.raw`^(\s*)([.;])\s*(${handoffActionVerbSource})\b`, 'i');
const leadingBoundaryWithDetailPattern = /^(\s*)([.;])\s*with\b/i;
const leadingWithDetailPattern = /^(\s*)with\b/i;
const leadingDetachedDetailPattern = new RegExp(String.raw`^\s+(?=(?:with\b|(?:and|then)\s+${handoffActionVerbSource}\b|${handoffActionVerbSource}\b))`, 'i');
const leadingCreatePattern = /^(\s*)create\b/i;
const generatorNoFlagPattern = /\s*--no\b(?:[=\s]+(?:(?!--[a-z]+\b)[^.;\n])+)?/gi;
const generatorFlagValueSource = String.raw`[A-Za-z0-9_:/.-]+`;
const generatorValuedFlagSource = String.raw`(?:ar|s|stylize|iw|chaos|seed|v|niji|q|quality|style|cref|cw|sref|sw)`;
const generatorFlagPattern = new RegExp(
  String.raw`\s*--${generatorValuedFlagSource}\b(?:[=\s]+${generatorFlagValueSource})?|\s*--[a-z][a-z0-9-]*\b(?:=${generatorFlagValueSource})?`,
  'gi'
);
const generatorSyntaxBoundaryPattern = /\s*(?:--[a-z][a-z0-9-]*\b|<\s*lora:|\bBREAK\b)/i;
const loraTagPattern = /<\s*lora:[^>]+>/gi;
const breakTokenPattern = /\bBREAK\b/gi;
const weightedParenthesisPattern = /\(([^()\n]{1,120}?):\s*-?\d+(?:\.\d+)?\)/g;
const weightedBracketPattern = /\[([^[\]\n]{1,120}?):\s*-?\d+(?:\.\d+)?\]/g;
const colonWeightPattern = /\s*::\s*-?\d+(?:\.\d+)?/g;
const parentheticalPromptTokenPattern = /\(([^()\n]{1,120})\)/g;
const bracketPromptTokenPattern = /\[([^[\]\n]{1,120})\]/g;
const danglingConnectorBeforeBoundaryPattern = /\s+(?:and|then)\s*(?=[,.;\n])/gi;
const finalDanglingConnectorPattern = /\s+(?:and|then)\s*$/i;
const quotedVisibleWordsHandoffBoundaryPattern = new RegExp(
  String.raw`(\bthe\s+(?:words?|phrases?)\s+(?:"[^"\n]{1,160}"|'[^'\n]{1,160}'|“[^”\n]{1,160}”|‘[^’\n]{1,160}’)\s+(?:appears?|is\s+printed|are\s+printed|printed)\b(?:(?![.;\n]).){0,160}?)\s+(?:and|then)\s+(${handoffActionVerbSource})\b`,
  'gi'
);

function formatBoundaryAction(leading: string, boundary: string, verb: string): string {
  const normalizedVerb = boundary === '.' ? `${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}` : verb.toLowerCase();
  return `${leading}${boundary} ${normalizedVerb}`;
}

function normalizeQuotedVisibleWordsHandoffBoundaries(text: string): string {
  return text.replace(
    quotedVisibleWordsHandoffBoundaryPattern,
    (_match, prefix: string, verb: string) => `${prefix}. ${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function sanitizeGeneratorPromptText(prompt: string): string {
  const raw = prompt.trim();
  const trimmed = stripLeadingSchemaWrapper(extractStructuredGenerationPrompt(raw) ?? raw);
  const sanitized = sanitizeQuotedWrapperTermsOutsideVisibleText(
    transformUnquotedSegments(trimmed, sanitizeUnquotedGeneratorPromptText)
  );
  const normalizedBoundaries = normalizeQuotedVisibleWordsHandoffBoundaries(sanitized);
  return normalizeUnquotedWhitespace(normalizedBoundaries).replace(finalDanglingConnectorPattern, '').trim();
}

function extractStructuredGenerationPrompt(prompt: string): string | undefined {
  if (!prompt || !/\bgeneration_prompt\b/i.test(prompt) || !startsWithStructuredPromptContainer(prompt)) return undefined;

  const parsed = parsePromptContainer(prompt);
  const parsedPrompt = readStructuredGenerationPrompt(parsed);
  if (parsedPrompt) return parsedPrompt;

  const quotedMatch = prompt.match(/"?(?:json_prompt\.)?generation_prompt"?\s*[:：]\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/is);
  if (quotedMatch) {
    const rest = prompt.slice((quotedMatch.index ?? 0) + quotedMatch[0].length);
    if (startsWithStructuredVisibleContinuation(rest)) return undefined;
    return parseStructuredStringLiteral(quotedMatch[1]) ?? quotedMatch[1].slice(1, -1);
  }

  const bareMatch = prompt.match(/"?(?:json_prompt\.)?generation_prompt"?\s*[:：]\s*/i);
  if (!bareMatch) return undefined;
  const rest = prompt.slice((bareMatch.index ?? 0) + bareMatch[0].length);
  return trimBareStructuredGenerationPrompt(rest);
}

function trimBareStructuredGenerationPrompt(prompt: string): string | undefined {
  const trimmed = prompt.trim();
  if (!trimmed) return undefined;
  const fieldBoundary = trimmed.match(
    /(?:^|[,\n])\s*"?(?:schema_version|summary|subject|action_pose|details_appearance|environment_background|lighting_atmosphere|composition_framing|style_camera|aspect_ratio|likely_generation_intent|colors|materials|quality_modifiers|fidelity_priorities|global_fingerprint|observation_units|text_elements|reconstruction_priorities|spatial_dynamics|generation_negative_prompt|negative_prompt)"?\s*[:：]/i
  );
  const end = fieldBoundary?.index && fieldBoundary.index > 0 ? fieldBoundary.index : trimmed.length;
  const value = trimmed.slice(0, end).replace(/\s*[,}]\s*$/, '').trim();
  return value || undefined;
}

function startsWithStructuredPromptContainer(prompt: string): boolean {
  return /^\s*\{/.test(prompt)
    || /^\s*"?schema_version"?\s*[:：]/i.test(prompt)
    || /^\s*"?(?:json_prompt\.)?generation_prompt"?\s*[:：]/i.test(prompt);
}

function parsePromptContainer(prompt: string): unknown {
  const candidates = [prompt];
  if (!/^\s*\{/.test(prompt)) candidates.push(`{${prompt.replace(/,\s*$/, '')}}`);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Fall back to targeted extraction for JSON-ish fragments from model output.
    }
  }
  return undefined;
}

function readStructuredGenerationPrompt(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.generation_prompt === 'string' && value.generation_prompt.trim()) return value.generation_prompt;
  const jsonPrompt = value.json_prompt;
  if (isRecord(jsonPrompt) && typeof jsonPrompt.generation_prompt === 'string' && jsonPrompt.generation_prompt.trim()) {
    return jsonPrompt.generation_prompt;
  }
  return undefined;
}

function parseStructuredStringLiteral(value: string): string | undefined {
  if (!value.startsWith('"')) return value.slice(1, -1);
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function stripLeadingSchemaWrapper(prompt: string): string {
  let next = prompt;
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = stripLeadingGeneratorLabelWrapper(
      stripLeadingStructuralPromptLabelWrapper(
        stripLeadingUnquotedSchemaWrapper(stripLeadingQuotedSchemaWrapper(stripLeadingBracedSchemaWrapper(next)))
      )
    ).trimStart();
  }
  return next;
}

function stripLeadingGeneratorLabelWrapper(prompt: string): string {
  const match = prompt.match(/^\s*(?:image\s*2|image2)(\s+prompt)?\s*[:：.\-]\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (!rest) return '';
  if (match[1]) return rest;
  return startsWithVisibleImageLabelContinuation(rest) ? prompt : rest;
}

function stripLeadingBracedSchemaWrapper(prompt: string): string {
  const match = prompt.match(/^\s*\{\s*"schema_version"\s*:\s*"reconstruction_v2"\s*\}\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (!rest) return '';
  const separator = rest.match(/^[,.;]\s*/);
  if (separator) {
    const afterSeparator = rest.slice(separator[0].length);
    return startsWithVisibleSchemaContinuation(afterSeparator) ? prompt : afterSeparator;
  }
  return startsWithVisibleSchemaContinuation(rest) ? prompt : rest;
}

function stripLeadingQuotedSchemaWrapper(prompt: string): string {
  const match = prompt.match(/^\s*"schema_version"\s*:\s*"reconstruction_v2"\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (!rest) return '';
  const separator = rest.match(/^[,.;]\s*/);
  if (separator) {
    const afterSeparator = rest.slice(separator[0].length);
    return startsWithVisibleSchemaContinuation(afterSeparator) ? prompt : afterSeparator;
  }
  return startsWithVisibleSchemaContinuation(rest) ? prompt : rest;
}

function stripLeadingUnquotedSchemaWrapper(prompt: string): string {
  const match = prompt.match(/^\s*schema_version\s*:\s*(?:"reconstruction_v2"|reconstruction_v2)\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (!rest) return '';
  const separator = rest.match(/^[,.;]\s*/);
  if (separator) {
    const afterSeparator = rest.slice(separator[0].length);
    return startsWithVisibleSchemaContinuation(afterSeparator) ? prompt : afterSeparator;
  }
  return startsWithVisibleSchemaContinuation(rest) ? prompt : rest;
}

function stripLeadingStructuralPromptLabelWrapper(prompt: string): string {
  const match = prompt.match(/^\s*"?(?:json_prompt\.)?generation_prompt"?\s*[:：]\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (startsWithStructuredVisibleContinuation(rest)) return prompt;
  const quoted = rest.match(/^\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/s);
  if (!quoted) return rest;
  if (startsWithStructuredVisibleContinuation(rest.slice(quoted[0].length))) return prompt;
  const parsed = parseStructuredStringLiteral(quoted[1]);
  return parsed ? `${parsed}${rest.slice(quoted[0].length)}` : rest;
}

const visibleSchemaContinuationSource = String.raw`(?:(?:appears|is|sits|shows|remains)\b(?=[^.;\n]{0,120}\b(?:visible|legible|code\s+labels?|ui\s+labels?|text|lettering)\b)|(?:visible|legible)\s+as\b(?=[^.;\n]{0,120}\b(?:code\s+labels?|ui\s+labels?|labels?|text|lettering)\b))`;
const visibleSchemaContinuationPattern = new RegExp(String.raw`^(?:${visibleSchemaContinuationSource})`, 'i');

function startsWithVisibleSchemaContinuation(text: string): boolean {
  return visibleSchemaContinuationPattern.test(text);
}

function startsWithStructuredVisibleContinuation(text: string): boolean {
  return startsWithVisibleSchemaContinuation(text.replace(/^\s*}?\s*[,.;]?\s*/, ''));
}

function startsWithVisibleImageLabelContinuation(text: string): boolean {
  return startsWithVisibleSchemaContinuation(text)
    || /^[^.;\n]{0,120}\b(?:appears?|is|sits|shows|remains|displays)\b(?=[^.;\n]{0,120}\b(?:visible|legible|labels?|text|lettering)\b)/i.test(text);
}

function sanitizeUnquotedGeneratorPromptText(prompt: string): string {
  return transformVisibleTextRuns(prompt, (segment) => {
    let removedUploadRequest = false;
    const hasDetachedInputRequestBoundary = detachedInputRequestBoundaryPattern.test(segment);
    const markUploadRequestRemoved = (match: string) => {
      const retainedDetail = getRetainedReferenceRequestDetail(match);
      if (retainedDetail) return retainedDetail;
      removedUploadRequest = true;
      return '';
    };
    let next = segment
      .replace(joinedUploadReferenceRequestPattern, markUploadRequestRemoved)
      .replace(joinedReferenceInputRequestPattern, markUploadRequestRemoved)
      .replace(inlineReferenceInputRequestPattern, markUploadRequestRemoved)
      .replace(leadingUploadReferenceRequestPattern, markUploadRequestRemoved)
      .replace(leadingReferenceInputRequestPattern, markUploadRequestRemoved)
      .replace(loraTagPattern, '')
      .replace(generatorNoFlagPattern, '')
      .replace(generatorFlagPattern, '')
      .replace(breakTokenPattern, '')
      .replace(weightedParenthesisPattern, '$1')
      .replace(weightedBracketPattern, '$1')
      .replace(colonWeightPattern, '')
      .replace(parentheticalPromptTokenPattern, '$1')
      .replace(bracketPromptTokenPattern, '$1')
      .replace(danglingConnectorBeforeBoundaryPattern, '')
      .replace(/\b(?:schema_version|reconstruction_v2)\b[,:;.]?\s*/gi, '')
      .replace(/^(\s*)recreate\s+(an?|the)\s+/i, (_match, leading: string, article: string) => `${leading}Create ${article} `)
      .replace(/\brecreate\s+this\s+image\b/gi, 'create the described image')
      .replace(/\brecreate\s+the\s+source\b/gi, 'create the described target')
      .replace(/\bplease\s+recreate\s+/gi, 'Please create ')
      .replace(/\brecreate\b/gi, 'create');
    if (removedUploadRequest && hasDetachedInputRequestBoundary) {
      next = next.replace(leadingDetachedDetailPattern, '. ');
    }
    if (removedUploadRequest) {
      next = next.replace(/,\s+(?=with\b)/gi, ' ');
    }
    next = next
      .replace(leadingBoundaryWithDetailPattern, (_match, leading: string, boundary: string) => `${leading}${boundary} ${boundary === '.' ? 'Include' : 'include'}`)
      .replace(leadingBoundaryHandoffConnectorPattern, (_match, leading: string, boundary: string) => `${leading}${boundary} `)
      .replace(leadingBoundaryHandoffActionPattern, (_match, leading: string, boundary: string, verb: string) => formatBoundaryAction(leading, boundary, verb));
    if (removedUploadRequest) {
      next = next
        .replace(leadingDanglingConnectorPattern, '$1')
        .replace(leadingHandoffConnectorPattern, '$1')
        .replace(leadingHandoffActionPattern, (_match, leading: string, verb: string) => `${leading}${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}`)
        .replace(leadingWithDetailPattern, (_match, leading: string) => `${leading}Include`);
    }
    return next
      .replace(leadingCreatePattern, (_match, leading: string) => `${leading}Create`)
      .replace(/\breference images\b/gi, 'visual targets')
      .replace(/\breference screenshots\b/gi, 'target screenshots')
      .replace(/\breference visuals\b/gi, 'visual targets')
      .replace(/\breference photos\b/gi, 'target photos')
      .replace(/\breference upload requests?\b/gi, 'upload request')
      .replace(/\breference uploads?\b/gi, 'uploads')
      .replace(/\breference image\b/gi, 'visual target')
      .replace(/\breference screenshot\b/gi, 'target screenshot')
      .replace(/\breference visual\b/gi, 'visual target')
      .replace(/\breference photo\b/gi, 'target photo')
      .replace(/\bsource images\b/gi, 'visual targets')
      .replace(/\bsource screenshots\b/gi, 'target screenshots')
      .replace(/\bsource visuals\b/gi, 'visual targets')
      .replace(/\bsource photos\b/gi, 'target photos')
      .replace(/\bsource upload requests?\b/gi, 'upload request')
      .replace(/\bsource uploads?\b/gi, 'uploads')
      .replace(/\bsource image\b/gi, 'visual target')
      .replace(/\bsource screenshot\b/gi, 'target screenshot')
      .replace(/\bsource visual\b/gi, 'visual target')
      .replace(/\bsource photo\b/gi, 'target photo')
      .replace(/\b(?:visual targets?|target screenshots?|target visuals?|target photos?)\s+upload requests?\b/gi, 'external input dependency')
      .replace(/\bupload requests?\b/gi, 'external input dependency')
      .replace(/\bno request for (?:an?\s+)?external input dependency\b/gi, 'self-contained generation instructions')
      .replace(/\bwithout (?:an?\s+)?external input dependency\b/gi, 'self-contained generation instructions')
      .replace(/\ba external input dependency\b/gi, 'an external input dependency');
  });
}

function normalizeUnquotedWhitespace(text: string): string {
  return transformUnquotedSegments(text, (segment) => segment.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1'));
}

function sanitizeQuotedWrapperTermsOutsideVisibleText(text: string): string {
  let output = '';
  let index = 0;
  while (index < text.length) {
    const closer = quoteCloserAt(text, index);
    if (!closer) {
      output += text[index];
      index += 1;
      continue;
    }

    const endQuoteIndex = findClosingQuoteIndex(text, closer, index + 1);
    if (endQuoteIndex === -1) {
      output += text.slice(index);
      break;
    }

    const quoted = text.slice(index + 1, endQuoteIndex);
    const sanitized = isIndexInVisibleTextRun(text, index) || isQuotedVisibleLabelContext(text, index)
      ? quoted
      : sanitizeQuotedWrapperTerms(quoted);
    output += `${text[index]}${sanitized}${text[endQuoteIndex]}`;
    index = endQuoteIndex + 1;
  }
  return output;
}

function sanitizeQuotedWrapperTerms(segment: string): string {
  return sanitizeUnquotedGeneratorPromptText(stripLeadingSchemaWrapper(segment.trim()))
    .replace(/\breference image\b/gi, 'visual target')
    .replace(/\breference screenshot\b/gi, 'target screenshot')
    .replace(/\breference visual\b/gi, 'visual target')
    .replace(/\breference photo\b/gi, 'target photo')
    .replace(/\bsource image\b/gi, 'visual target')
    .replace(/\bsource screenshot\b/gi, 'target screenshot')
    .replace(/\bsource visual\b/gi, 'visual target')
    .replace(/\bsource photo\b/gi, 'target photo');
}

function isQuotedVisibleLabelContext(text: string, quoteIndex: number): boolean {
  const prefix = text.slice(Math.max(0, quoteIndex - 120), quoteIndex);
  const boundary = Math.max(prefix.lastIndexOf('.'), prefix.lastIndexOf(';'), prefix.lastIndexOf('\n'));
  const context = prefix.slice(boundary + 1);
  return /\b(?:exact|visible|legible)\s+(?:text|labels?|words?|phrases?|title|caption|heading|headline|logo|watermark|button|sign|shirt)\s*$/i.test(context);
}

function getRetainedReferenceRequestDetail(match: string): string {
  const detailMatch = match.match(/\b(?:for|as|to)\s+([^.;,\n]+)/i);
  if (!detailMatch) return '';
  const detail = detailMatch[1].trim();
  if (!detail || isGenericReferenceRequestDetail(detail)) return '';
  const leadingConnector = match.match(/^\s*(?:and|then)\s+/i)?.[0] ?? match.match(/^,\s*/)?.[0] ?? '';
  const verb = leadingConnector ? 'use' : 'Use';
  return `${leadingConnector}${verb} ${detail}`;
}

function isGenericReferenceRequestDetail(detail: string): boolean {
  return /^(?:(?:an?|the)\s+)?(?:references?|guidance|guide|context|input|comparison|source|target)\b/i.test(detail);
}

const visibleTextSubjectSource = String.raw`(?:visible|legible)\s+(?:text|labels?)|(?:ui|code)\s+label\s+text|(?:ui|code)\s+labels?|(?:shirt|screen|poster|button|label|sign|logo|watermark|caption|heading|headline)\s+text|title|labels?|caption|logo|watermark|sign|shirt|heading|headline|button`;
const visibleTextMarkerSource = String.raw`(?:(?:${visibleTextSubjectSource})\s+(?:reads|says|displays|shows)|(?:${visibleTextSubjectSource})\s*:|(?:sign|shirt|screen|poster|button)\s+with\s+text)\s+`;
const bareVisibleTextMarkerSource = String.raw`(?:^|[.;\n]\s*)text\s+(?:reads|says|displays|shows)\s+`;
const quotedVisibleWordsMarkerSource = String.raw`the\s+(?:words?|phrases?)\s+(?=(?:"[^"\n]{1,160}"|'[^'\n]{1,160}'|“[^”\n]{1,160}”|‘[^’\n]{1,160}’)\s+(?:appears?|is\s+printed|are\s+printed|printed)\b)`;
const visibleSchemaMarkerSource = String.raw`schema_version\s*:\s*reconstruction_v2\s*[,.;]?\s+(?=${visibleSchemaContinuationSource})`;
const visibleQuotedSchemaMarkerSource = String.raw`\{?\s*"schema_version"\s*:\s*"reconstruction_v2"\s*\}?\s*[,.;]?\s+(?=${visibleSchemaContinuationSource})`;
const visibleTextMarkerPattern = new RegExp(String.raw`(?:${bareVisibleTextMarkerSource}|\b(?:${visibleTextMarkerSource}|${quotedVisibleWordsMarkerSource}|${visibleSchemaMarkerSource})|${visibleQuotedSchemaMarkerSource})`, 'gi');
const wrapperContinuationTailSource = String.raw`(?=\s+(?:glow|lighting|light|lights|backlight|shadow|shadows|haze|texture|textures|detail|details|style|palette|colors?|composition|framing|crop|pose|background|foreground|subject|scene|around|behind|matching|match|inspired|guidance|context|reference|look|vibe|mood)\b)`;
const wrapperContinuationEndSource = String.raw`(?:\s+(?:as|for))?${wrapperContinuationTailSource}`;
const wrapperActionContinuationEndSource = String.raw`(?:${wrapperContinuationEndSource}|(?=\s*[.;,\n]|$))`;
const wrapperNounSource = String.raw`(?:images?|screenshots?|visuals?|photos?)`;
const wrapperActionContinuationSource = String.raw`(?:use|using|match|matching)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperActionContinuationEndSource}`;
const wrapperContinuationPattern = new RegExp(String.raw`^(?:\s+(?:(?:with|using|from|based\s+on)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})|\s+recreate\b)`, 'i');
const commaWrapperContinuationPattern = new RegExp(String.raw`^(?:\s+(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|\s+(?:(?:with|using|from|based\s+on)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})|\s+recreate\b)`, 'i');
const andWrapperContinuationPattern = new RegExp(String.raw`^\s+and\s+(?:(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})`, 'i');
const inputRequestContinuationPattern = new RegExp(String.raw`^\s+${inputRequestSource}`, 'i');
const connectorInputRequestContinuationPattern = new RegExp(String.raw`^\s+(?:and|then)\s+${inputRequestSource}`, 'i');

function transformVisibleTextRuns(text: string, transform: (segment: string) => string): string {
  let output = '';
  let index = 0;
  let match: RegExpExecArray | null;
  visibleTextMarkerPattern.lastIndex = 0;
  while ((match = visibleTextMarkerPattern.exec(text))) {
    const markerStart = match.index;
    if (markerStart < index) continue;
    output += transform(text.slice(index, markerStart));
    const runEnd = findVisibleTextRunEnd(text, visibleTextMarkerPattern.lastIndex);
    output += text.slice(markerStart, runEnd);
    index = runEnd;
    visibleTextMarkerPattern.lastIndex = runEnd;
  }
  output += transform(text.slice(index));
  return output;
}

function findVisibleTextRunEnd(text: string, start: number): number {
  for (let i = start; i < text.length; i += 1) {
    const closer = quoteCloserAt(text, i);
    if (closer) {
      const endQuoteIndex = findClosingQuoteIndex(text, closer, i + 1);
      if (endQuoteIndex !== -1) {
        i = endQuoteIndex;
        continue;
      }
    }
    if (/[.;\n]/.test(text[i])) return i + 1;
    if (startsWithGeneratorSyntaxBoundary(text, i)) return i;
    if (text[i] === ',' && startsWithInputRequestContinuation(text, i + 1)) return i;
    if (text[i] === ',' && startsWithCommaWrapperContinuation(text, i + 1)) return i + 1;
    if (startsWithConnectorInputRequestContinuation(text, i)) return i;
    if (startsWithAndWrapperContinuation(text, i)) return i;
    if (startsWithWrapperContinuation(text, i) && !isAfterComma(text, i)) return i;
  }
  return text.length;
}

function startsWithGeneratorSyntaxBoundary(text: string, start: number): boolean {
  return generatorSyntaxBoundaryPattern.test(text.slice(start));
}

function startsWithWrapperContinuation(text: string, start: number): boolean {
  return wrapperContinuationPattern.test(text.slice(start));
}

function startsWithCommaWrapperContinuation(text: string, start: number): boolean {
  return commaWrapperContinuationPattern.test(text.slice(start));
}

function startsWithAndWrapperContinuation(text: string, start: number): boolean {
  return andWrapperContinuationPattern.test(text.slice(start));
}

function startsWithInputRequestContinuation(text: string, start: number): boolean {
  return inputRequestContinuationPattern.test(text.slice(start));
}

function startsWithConnectorInputRequestContinuation(text: string, start: number): boolean {
  return connectorInputRequestContinuationPattern.test(text.slice(start));
}

function isAfterComma(text: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!/\s/.test(text[i])) return text[i] === ',';
  }
  return false;
}

function isIndexInVisibleTextRun(text: string, index: number): boolean {
  let match: RegExpExecArray | null;
  visibleTextMarkerPattern.lastIndex = 0;
  while ((match = visibleTextMarkerPattern.exec(text))) {
    const start = match.index;
    const end = findVisibleTextRunEnd(text, visibleTextMarkerPattern.lastIndex);
    if (index >= start && index < end) return true;
    visibleTextMarkerPattern.lastIndex = end;
  }
  return false;
}

function transformUnquotedSegments(text: string, transform: (segment: string) => string): string {
  let output = '';
  let index = 0;
  while (index < text.length) {
    const closer = quoteCloserAt(text, index);
    if (!closer) {
      const nextQuoteIndex = findNextQuoteIndex(text, index + 1);
      const end = nextQuoteIndex === -1 ? text.length : nextQuoteIndex;
      output += transform(text.slice(index, end));
      index = end;
      continue;
    }

    const endQuoteIndex = findClosingQuoteIndex(text, closer, index + 1);
    if (endQuoteIndex === -1) {
      output += transform(text.slice(index));
      break;
    }

    output += text.slice(index, endQuoteIndex + 1);
    index = endQuoteIndex + 1;
  }
  return output;
}

function quoteCloserAt(text: string, index: number): string | undefined {
  const opener = text[index];
  if (opener === "'" && isWordCharacter(text[index - 1])) return undefined;
  return quoteCloser(opener);
}

function quoteCloser(opener: string): string | undefined {
  const pairs: Record<string, string> = {
    '"': '"',
    "'": "'",
    '`': '`',
    '“': '”',
    '‘': '’',
    '「': '」',
    '『': '』',
    '《': '》'
  };
  return pairs[opener];
}

function findNextQuoteIndex(text: string, start: number): number {
  for (let i = start; i < text.length; i += 1) {
    if (quoteCloserAt(text, i)) return i;
  }
  return -1;
}

function findClosingQuoteIndex(text: string, closer: string, start: number): number {
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === closer && text[i - 1] !== '\\') return i;
  }
  return -1;
}

function isWordCharacter(value: string | undefined): boolean {
  return Boolean(value && /[A-Za-z0-9]/.test(value));
}
