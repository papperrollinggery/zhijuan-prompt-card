import { strict as assert } from 'node:assert';
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import { getGeneratorPrompt, getHistoryPrompt, stringifyJsonPrompt, stringifyPromptAnalysis } from '../src/shared/historyDisplay';
import { addHistoryEntry, buildHistoryTitle, clearHistory, compactHistoryStorage, createRunningHistoryEntry, getHistory, getSettings, saveSettings, updateHistoryEntry } from '../src/shared/storage';

const settings = await getSettings();
assert.equal(settings.baseUrl, DEFAULT_SETTINGS.baseUrl);
assert.equal(settings.apiKey, DEFAULT_SETTINGS.apiKey);
assert.equal(settings.model, DEFAULT_SETTINGS.model);
assert.equal(settings.interfaceLanguage, DEFAULT_SETTINGS.interfaceLanguage);

const normalizedLegacySettings = await saveSettings({ interfaceLanguage: 'ja' as never });
assert.equal(normalizedLegacySettings.interfaceLanguage, 'en');
await saveSettings({ interfaceLanguage: DEFAULT_SETTINGS.interfaceLanguage });

const legacyAnalysis = {
  zh: { prompt: '新版中文短提示', analysis: '' },
  en: { prompt: 'new shorter English prompt', analysis: '' },
  zh_style_tags: [],
  en_style_tags: [],
  json_prompt: {
    schema_version: 'reconstruction_v2',
    summary: '',
    generation_prompt: 'new shorter English prompt',
    generation_negative_prompt: '',
    spatial_dynamics: '',
    subject: '',
    action_pose: '',
    details_appearance: '',
    environment_background: '',
    lighting_atmosphere: '',
    composition_framing: '',
    style_camera: '',
    colors: [],
    materials: [],
    aspect_ratio: '',
    quality_modifiers: [],
    fidelity_priorities: [],
    global_fingerprint: {
      style_index: 0,
      density: '',
      spatial_flow: '',
      optical_finish: [],
      render_finish: [],
      palette: []
    },
    observation_units: [],
    text_elements: [],
    reconstruction_priorities: [],
    likely_generation_intent: ''
  },
  prompt_core: '',
  negative_prompt: '',
  recreation_prompt: 'Legacy precise reconstruction prompt with more detail'
};
assert.equal(buildHistoryTitle(legacyAnalysis), 'Legacy precise reconstruction prompt with more detail');
assert.equal(getHistoryPrompt({
  id: 'legacy',
  createdAt: '2026-06-18T00:00:00.000Z',
  title: 'Legacy',
  favorite: false,
  status: 'success',
  analysis: legacyAnalysis
}), 'new shorter English prompt');

const trueLegacyAnalysis = {
  ...legacyAnalysis,
  json_prompt: {
    ...legacyAnalysis.json_prompt,
    generation_prompt: '   '
  }
};
assert.equal(getGeneratorPrompt(trueLegacyAnalysis), 'Legacy precise reconstruction prompt with more detail');

const currentAnalysis = {
  ...legacyAnalysis,
  zh: { prompt: '中文界面说明提示词', analysis: '' },
  en: { prompt: 'Primary English recreation prompt for generators', analysis: '' },
  recreation_prompt: undefined
};
assert.equal(getHistoryPrompt({
  id: 'current',
  createdAt: '2026-06-18T00:00:00.000Z',
  title: 'Current',
  favorite: false,
  status: 'success',
  analysis: currentAnalysis
}, 'zh'), 'new shorter English prompt');

const handoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2. Recreate a source image with layered blue haze and visible Chinese UI text. Please recreate blue poster with reference image energy.'
  }
};
const handoffPrompt = getGeneratorPrompt(handoffAnalysis);
assert.equal(handoffPrompt, 'Create a visual target with layered blue haze and visible Chinese UI text. Please create blue poster with visual target energy.');
assert(!handoffPrompt.includes('schema_version'));
assert(!handoffPrompt.includes('reconstruction_v2'));
assert(!/source image|reference image|recreate/i.test(handoffPrompt));

const standaloneRecreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for standalone recreate', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Accurately recreate the poster with layered haze, visible Chinese UI text, and no uploaded reference image.'
  }
};
assert.equal(
  getGeneratorPrompt(standaloneRecreateAnalysis),
  'Accurately create the poster with layered haze, visible Chinese UI text, and no uploaded visual target.'
);

const quotedVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2. Poster title reads "Recreate Yourself" and code label reads "schema_version: reconstruction_v2"; source image glow around the text.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextAnalysis),
  'Poster title reads "Recreate Yourself" and code label reads "schema_version: reconstruction_v2"; visual target glow around the text.'
);

const quotedSchemaValueWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted wrapper value', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: "reconstruction_v2". Create a clean poster with layered haze.'
  }
};
assert.equal(getGeneratorPrompt(quotedSchemaValueWrapperAnalysis), 'Create a clean poster with layered haze.');

const possessivePromptAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for possessives', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: "Artist's source image glow matches viewer's reference image note."
  }
};
assert.equal(getGeneratorPrompt(possessivePromptAnalysis), "Artist's visual target glow matches viewer's visual target note.");

const unquotedVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for unquoted visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself and code label reads schema_version: reconstruction_v2; source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(unquotedVisibleTextAnalysis),
  'Poster title reads Recreate Yourself and code label reads schema_version: reconstruction_v2; visual target glow behind the lettering.'
);

const visibleThenRecreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text run', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself; recreate the poster with source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleThenRecreateAnalysis),
  'Poster title reads Recreate Yourself; Create the poster with visual target glow behind the lettering.'
);

const schemaOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after schema-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2'
  }
};
assert.equal(getGeneratorPrompt(schemaOnlyHandoffAnalysis), 'Fallback English prompt after schema-only generator field');

const sortedJsonPrompt = {
  ...Object.fromEntries(Object.entries(currentAnalysis.json_prompt).sort(([left], [right]) => left.localeCompare(right))),
  global_fingerprint: Object.fromEntries(
    Object.entries(currentAnalysis.json_prompt.global_fingerprint).sort(([left], [right]) => left.localeCompare(right))
  )
} as typeof currentAnalysis.json_prompt;
const canonicalJsonPrompt = stringifyJsonPrompt(sortedJsonPrompt);
assert(canonicalJsonPrompt.indexOf('"schema_version"') < canonicalJsonPrompt.indexOf('"action_pose"'));
assert(canonicalJsonPrompt.indexOf('"style_index"') < canonicalJsonPrompt.indexOf('"palette"'));
const canonicalAnalysis = stringifyPromptAnalysis({ ...currentAnalysis, json_prompt: sortedJsonPrompt });
assert(canonicalAnalysis.indexOf('"json_prompt"') < canonicalAnalysis.indexOf('"prompt_core"'));
assert(canonicalAnalysis.indexOf('"schema_version"') < canonicalAnalysis.indexOf('"action_pose"'));

const legacyJsonOnlyAnalysis = {
  zh: { prompt: '旧中文提示', analysis: '' },
  en: { prompt: 'Old English prompt', analysis: '' },
  zh_style_tags: [],
  en_style_tags: [],
  json_prompt: {
    schema_version: 'reconstruction_v1',
    summary: 'legacy summary',
    subject: 'legacy subject'
  },
  prompt_core: '',
  negative_prompt: '',
  recreation_prompt: 'legacy high-fidelity handoff should be exported'
};
const legacyJsonText = stringifyPromptAnalysis(legacyJsonOnlyAnalysis as never);
const legacyJson = JSON.parse(legacyJsonText);
assert.equal(legacyJson.json_prompt.schema_version, 'reconstruction_v1');
assert.equal(legacyJson.json_prompt.summary, 'legacy summary');
assert.equal(legacyJson.json_prompt.global_fingerprint, undefined);
assert.equal(legacyJson.recreation_prompt, 'legacy high-fidelity handoff should be exported');
assert.equal(JSON.parse(canonicalAnalysis).recreation_prompt, undefined);

await clearHistory();
await addHistoryEntry(createRunningHistoryEntry({ title: 'Check image' }));
const history = await getHistory();
assert.equal(history.length, 1);
assert.equal(history[0].status, 'running');
const canceled = await updateHistoryEntry(history[0].id, { status: 'canceled', error: '已取消识别。' });
assert.equal(canceled?.status, 'canceled');

await clearHistory();
await addHistoryEntry(createRunningHistoryEntry({
  imageUrl: 'data:image/png;base64,full-image',
  thumbnailUrl: 'data:image/webp;base64,thumb',
  title: 'Thumbnail check'
}));
await compactHistoryStorage();
const compacted = await getHistory();
assert.equal(compacted[0].imageUrl, undefined);
assert.equal(compacted[0].thumbnailUrl, 'data:image/webp;base64,thumb');

await clearHistory();
await addHistoryEntry(createRunningHistoryEntry({
  thumbnailUrl: `data:image/webp;base64,${'a'.repeat(220_000)}`,
  title: 'Oversized thumbnail check'
}));
const oversized = await getHistory();
assert.equal(oversized[0].thumbnailUrl, undefined);

console.log('storage checks passed');
