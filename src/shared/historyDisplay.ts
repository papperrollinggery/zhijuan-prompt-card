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

function firstSanitizedPrompt(...prompts: Array<string | undefined>): string {
  for (const prompt of prompts) {
    const sanitized = sanitizeGeneratorPromptText(prompt || '');
    if (sanitized && !isGenericHandoffFiller(sanitized)) return sanitized;
  }
  return '';
}

function isGenericHandoffFiller(prompt: string): boolean {
  const normalized = prompt.trim().replace(/[.!;]+$/, '').toLowerCase();
  if (!normalized) return true;
  return /^(?:visual targets?|target screenshots?|target photos?|create|create the described (?:image|target))$/.test(normalized);
}

const handoffActionVerbSource = String.raw`(?:create|keep|preserve|retain|include|use|maintain|render|show|depict)`;
const uploadRequestTailSource = String.raw`(?:\s+(?:for|as|to)\s+(?:(?!\s+(?:and|then)\s+${handoffActionVerbSource}\b|\s+with\b)[^.;,\n])+)?`;
const uploadReferenceRequestSource = String.raw`(?:please\s+)?(?:upload|attach|provide)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+(?:images?|screenshots?|visuals?|photos?)\b${uploadRequestTailSource}`;
const joinedUploadReferenceRequestPattern = new RegExp(String.raw`(?:\s+and\s+|,\s+)${uploadReferenceRequestSource}`, 'gi');
const leadingUploadReferenceRequestPattern = new RegExp(String.raw`\b${uploadReferenceRequestSource}(?:,\s*)?`, 'gi');
const leadingHandoffConnectorPattern = new RegExp(String.raw`^(\s*)(?:then|and)\s+(?=${handoffActionVerbSource}\b)`, 'i');
const leadingHandoffActionPattern = new RegExp(String.raw`^(\s*)(${handoffActionVerbSource})\b`, 'i');
const leadingBoundaryHandoffConnectorPattern = new RegExp(String.raw`^(\s*)([.;])\s*(?:then|and)\s+(?=${handoffActionVerbSource}\b)`, 'i');
const leadingBoundaryHandoffActionPattern = new RegExp(String.raw`^(\s*)([.;])\s*(${handoffActionVerbSource})\b`, 'i');
const leadingBoundaryWithDetailPattern = /^(\s*)([.;])\s*with\b/i;
const leadingWithDetailPattern = /^(\s*)with\b/i;
const leadingCreatePattern = /^(\s*)create\b/i;

function formatBoundaryAction(leading: string, boundary: string, verb: string): string {
  const normalizedVerb = boundary === '.' ? `${verb.charAt(0).toUpperCase()}${verb.slice(1).toLowerCase()}` : verb.toLowerCase();
  return `${leading}${boundary} ${normalizedVerb}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function sanitizeGeneratorPromptText(prompt: string): string {
  const trimmed = stripLeadingSchemaWrapper(prompt.trim());
  const sanitized = sanitizeQuotedWrapperTermsOutsideVisibleText(
    transformUnquotedSegments(trimmed, sanitizeUnquotedGeneratorPromptText)
  );
  return normalizeUnquotedWhitespace(sanitized).trim();
}

function stripLeadingSchemaWrapper(prompt: string): string {
  let next = prompt;
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = stripLeadingGeneratorLabelWrapper(
      stripLeadingUnquotedSchemaWrapper(stripLeadingQuotedSchemaWrapper(stripLeadingBracedSchemaWrapper(next)))
    ).trimStart();
  }
  return next;
}

function stripLeadingGeneratorLabelWrapper(prompt: string): string {
  const match = prompt.match(/^\s*(?:image\s*2|image2)(?:\s+prompt)?\s*[:：.\-]\s*/i);
  if (!match) return prompt;
  const rest = prompt.slice(match[0].length);
  if (!rest) return '';
  return startsWithVisibleSchemaContinuation(rest) ? prompt : rest;
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

function startsWithVisibleSchemaContinuation(text: string): boolean {
  return /^(?:appears|is|sits|shows|remains)\b(?=[^.;\n]{0,120}\b(?:visible|legible|code\s+label|ui\s+label|text|lettering)\b)/i.test(text);
}

function sanitizeUnquotedGeneratorPromptText(prompt: string): string {
  return transformVisibleTextRuns(prompt, (segment) => {
    let removedUploadRequest = false;
    const markUploadRequestRemoved = () => {
      removedUploadRequest = true;
      return '';
    };
    let next = segment
      .replace(joinedUploadReferenceRequestPattern, markUploadRequestRemoved)
      .replace(leadingUploadReferenceRequestPattern, markUploadRequestRemoved)
      .replace(/\b(?:schema_version|reconstruction_v2)\b[,:;.]?\s*/gi, '')
      .replace(/^(\s*)recreate\s+(an?|the)\s+/i, (_match, leading: string, article: string) => `${leading}Create ${article} `)
      .replace(/\brecreate\s+this\s+image\b/gi, 'create the described image')
      .replace(/\brecreate\s+the\s+source\b/gi, 'create the described target')
      .replace(/\bplease\s+recreate\s+/gi, 'Please create ')
      .replace(/\brecreate\b/gi, 'create');
    if (removedUploadRequest) {
      next = next.replace(/,\s+(?=with\b)/gi, ' ');
    }
    next = next
      .replace(leadingBoundaryWithDetailPattern, (_match, leading: string, boundary: string) => `${leading}${boundary} ${boundary === '.' ? 'Include' : 'include'}`)
      .replace(leadingBoundaryHandoffConnectorPattern, (_match, leading: string, boundary: string) => `${leading}${boundary} `)
      .replace(leadingBoundaryHandoffActionPattern, (_match, leading: string, boundary: string, verb: string) => formatBoundaryAction(leading, boundary, verb));
    if (removedUploadRequest) {
      next = next
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
      .replace(/\breference image\b/gi, 'visual target')
      .replace(/\breference screenshot\b/gi, 'target screenshot')
      .replace(/\breference visual\b/gi, 'visual target')
      .replace(/\breference photo\b/gi, 'target photo')
      .replace(/\bsource images\b/gi, 'visual targets')
      .replace(/\bsource screenshots\b/gi, 'target screenshots')
      .replace(/\bsource visuals\b/gi, 'visual targets')
      .replace(/\bsource photos\b/gi, 'target photos')
      .replace(/\bsource image\b/gi, 'visual target')
      .replace(/\bsource screenshot\b/gi, 'target screenshot')
      .replace(/\bsource visual\b/gi, 'visual target')
      .replace(/\bsource photo\b/gi, 'target photo');
  });
}

function normalizeUnquotedWhitespace(text: string): string {
  return transformUnquotedSegments(text, (segment) => segment.replace(/\s+/g, ' '));
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
    const sanitized = isIndexInVisibleTextRun(text, index)
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

const visibleTextSubjectSource = String.raw`(?:visible|legible)\s+(?:text|labels?)|(?:ui|code)\s+label\s+text|(?:ui|code)\s+labels?|(?:shirt|screen|poster|button|label|sign|logo|watermark|caption|heading|headline)\s+text|title|labels?|caption|logo|watermark|sign|shirt|heading|headline|button`;
const visibleTextMarkerSource = String.raw`(?:(?:${visibleTextSubjectSource})\s+(?:reads|says|displays|shows)|(?:${visibleTextSubjectSource})\s*:|(?:sign|shirt|screen|poster|button)\s+with\s+text)\s+`;
const bareVisibleTextMarkerSource = String.raw`(?:^|[.;\n]\s*)text\s+(?:reads|says|displays|shows)\s+`;
const visibleSchemaMarkerSource = String.raw`schema_version\s*:\s*reconstruction_v2\s*[,.;]?\s+(?=(?:appears|is|sits|shows|remains)\b(?=[^.;\n]{0,120}\b(?:visible|legible|code\s+labels?|ui\s+labels?|text|lettering)\b))`;
const visibleQuotedSchemaMarkerSource = String.raw`\{?\s*"schema_version"\s*:\s*"reconstruction_v2"\s*\}?\s*[,.;]?\s+(?=(?:appears|is|sits|shows|remains)\b(?=[^.;\n]{0,120}\b(?:visible|legible|code\s+labels?|ui\s+labels?|text|lettering)\b))`;
const visibleTextMarkerPattern = new RegExp(String.raw`(?:${bareVisibleTextMarkerSource}|\b(?:${visibleTextMarkerSource}|${visibleSchemaMarkerSource})|${visibleQuotedSchemaMarkerSource})`, 'gi');
const wrapperContinuationTailSource = String.raw`(?=\s+(?:glow|lighting|light|lights|backlight|shadow|shadows|haze|texture|textures|detail|details|style|palette|colors?|composition|framing|crop|pose|background|foreground|subject|scene|around|behind|matching|match|inspired|guidance|context|reference|look|vibe|mood)\b)`;
const wrapperContinuationEndSource = String.raw`(?:\s+(?:as|for))?${wrapperContinuationTailSource}`;
const wrapperActionContinuationEndSource = String.raw`(?:${wrapperContinuationEndSource}|(?=\s*[.;,\n]|$))`;
const wrapperNounSource = String.raw`(?:images?|screenshots?|visuals?|photos?)`;
const wrapperActionContinuationSource = String.raw`(?:use|using|match|matching)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperActionContinuationEndSource}`;
const wrapperContinuationPattern = new RegExp(String.raw`^(?:\s+(?:(?:with|using|from|based\s+on)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})|\s+recreate\b)`, 'i');
const commaWrapperContinuationPattern = new RegExp(String.raw`^(?:\s+(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|\s+(?:(?:with|using|from|based\s+on)\s+(?:an?\s+|the\s+)?(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})|\s+recreate\b)`, 'i');
const andWrapperContinuationPattern = new RegExp(String.raw`^\s+and\s+(?:(?:source|reference)\s+${wrapperNounSource}\b${wrapperContinuationEndSource}|${wrapperActionContinuationSource})`, 'i');

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
    if (text[i] === ',' && startsWithCommaWrapperContinuation(text, i + 1)) return i + 1;
    if (startsWithAndWrapperContinuation(text, i)) return i;
    if (startsWithWrapperContinuation(text, i) && !isAfterComma(text, i)) return i;
  }
  return text.length;
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
