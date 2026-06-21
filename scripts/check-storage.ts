import { strict as assert } from 'node:assert';
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import { getGeneratorPrompt, getHistoryPrompt, stringifyGeneratorJsonPrompt, stringifyJsonPrompt, stringifyPromptAnalysis } from '../src/shared/historyDisplay';
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

const partialLegacyAnalysis = {
  recreation_prompt: 'Legacy prompt from partial history'
};
assert.equal(getGeneratorPrompt(partialLegacyAnalysis as never), 'Legacy prompt from partial history');

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
    generation_prompt: 'schema_version: reconstruction_v2. Recreate a source image with layered blue haze and visible Chinese UI text. Please recreate blue poster with reference image energy.',
    generation_negative_prompt: 'reference image upload request, source image dependency',
    subject: 'source image poster with reference image texture',
    fidelity_priorities: ['priority 95 of 100 - source image grain'],
    reconstruction_priorities: [
      {
        cue: 'source image geometry',
        priority: 90,
        tradeoff: 'reference image layout over polish',
        compile_to_en_prompt: true,
        risk_if_missing: 'reference upload request'
      }
    ]
  }
};
const handoffPrompt = getGeneratorPrompt(handoffAnalysis);
assert.equal(handoffPrompt, 'Create a visual target with layered blue haze and visible Chinese UI text. Please create blue poster with visual target energy.');
assert(!handoffPrompt.includes('schema_version'));
assert(!handoffPrompt.includes('reconstruction_v2'));
assert(!/source image|reference image|recreate/i.test(handoffPrompt));

const handoffJsonPromptText = stringifyGeneratorJsonPrompt(handoffAnalysis);
const handoffJsonPrompt = JSON.parse(handoffJsonPromptText);
assert.equal(Object.keys(handoffJsonPrompt)[0], 'prompt');
assert.equal(handoffJsonPrompt.prompt, handoffPrompt);
assert.equal(handoffJsonPrompt.negative_prompt, 'external input dependency, visual target dependency');
assert.equal(handoffJsonPrompt.subject, 'visual target poster with visual target texture');
assert(!handoffJsonPromptText.includes('"schema_version"'));
assert(!handoffJsonPromptText.includes('reconstruction_v2'));
assert(!/source image|reference image|reference upload/i.test(handoffJsonPromptText));
assert.equal(handoffJsonPrompt.fidelity_priorities[0], 'priority 95 of 100 - visual target grain');
assert.equal(handoffJsonPrompt.reconstruction_priorities[0].cue, 'visual target geometry');
assert.equal(handoffJsonPrompt.reconstruction_priorities[0].tradeoff, 'visual target layout over polish');
assert.equal(handoffJsonPrompt.reconstruction_priorities[0].risk_if_missing, 'external input dependency');

const visibleTextGeneratorJsonAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster.',
    text_elements: [
      {
        content: 'schema_version: reconstruction_v2',
        language: 'code',
        role: 'visible label',
        location: 'top edge of the source image',
        typography: 'small monospace text',
        legibility: 'clear',
        priority: 95
      }
    ]
  }
};
const visibleTextGeneratorJsonPrompt = JSON.parse(stringifyGeneratorJsonPrompt(visibleTextGeneratorJsonAnalysis));
assert.equal(visibleTextGeneratorJsonPrompt.text_elements[0].content, 'schema_version: reconstruction_v2');
assert.equal(visibleTextGeneratorJsonPrompt.text_elements[0].location, 'top edge of the visual target');

const noReferenceUploadRequestAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for no-reference-upload wording', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster with no request for a reference image upload request.'
  }
};
assert.equal(getGeneratorPrompt(noReferenceUploadRequestAnalysis), 'Create a clean poster with self-contained generation instructions.');
const noReferenceUploadJsonPrompt = JSON.parse(stringifyGeneratorJsonPrompt(noReferenceUploadRequestAnalysis));
assert.equal(noReferenceUploadJsonPrompt.prompt, 'Create a clean poster with self-contained generation instructions.');
assert(!/reference image|upload request|a external/i.test(JSON.stringify(noReferenceUploadJsonPrompt)));

const structuralGenerationPromptLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after structural generation label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'json_prompt.generation_prompt: Create a clean poster with source image glow.'
  }
};
assert.equal(getGeneratorPrompt(structuralGenerationPromptLabelAnalysis), 'Create a clean poster with visual target glow.');

const bareStructuralGenerationPromptLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after bare generation label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'generation_prompt: Create a clean poster with reference image glow.'
  }
};
assert.equal(getGeneratorPrompt(bareStructuralGenerationPromptLabelAnalysis), 'Create a clean poster with visual target glow.');

const commaBareStructuralGenerationPromptLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after comma bare generation label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'generation_prompt: Create a clean poster, with blue haze and diagonal light, bold Chinese title.'
  }
};
assert.equal(
  getGeneratorPrompt(commaBareStructuralGenerationPromptLabelAnalysis),
  'Create a clean poster, with blue haze and diagonal light, bold Chinese title.'
);

const fieldDelimitedBareStructuralGenerationPromptLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after field-delimited bare generation label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'generation_prompt: Create a clean poster, with blue haze and diagonal light, generation_negative_prompt: watermark'
  }
};
assert.equal(
  getGeneratorPrompt(fieldDelimitedBareStructuralGenerationPromptLabelAnalysis),
  'Create a clean poster, with blue haze and diagonal light'
);

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

const punctuatedQuotedVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for punctuated quoted visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads "source image. reference image"; use source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(punctuatedQuotedVisibleTextAnalysis),
  'Poster title reads "source image. reference image"; use visual target glow.'
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

const semicolonSchemaWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after semicolon schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2; Create a clean poster with source image glow.'
  }
};
assert.equal(getGeneratorPrompt(semicolonSchemaWrapperAnalysis), 'Create a clean poster with visual target glow.');

const leadingQuotedSchemaVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for leading quoted schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version": "reconstruction_v2" appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingQuotedSchemaVisibleTextAnalysis),
  '"schema_version": "reconstruction_v2" appears as a visible code label at the top; visual target glow behind it.'
);

const leadingQuotedSchemaSemicolonVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for semicolon quoted schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version": "reconstruction_v2"; appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingQuotedSchemaSemicolonVisibleTextAnalysis),
  '"schema_version": "reconstruction_v2"; appears as a visible code label at the top; visual target glow behind it.'
);

const leadingUnquotedSchemaSemicolonVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for semicolon unquoted schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2; appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingUnquotedSchemaSemicolonVisibleTextAnalysis),
  'schema_version: reconstruction_v2; appears as a visible code label at the top; visual target glow behind it.'
);

const leadingUnquotedSchemaVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for leading unquoted schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2 appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingUnquotedSchemaVisibleTextAnalysis),
  'schema_version: reconstruction_v2 appears as a visible code label at the top; visual target glow behind it.'
);

const leadingUnquotedSchemaVisibleAsTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible-as unquoted schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2, visible as a code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingUnquotedSchemaVisibleAsTextAnalysis),
  'schema_version: reconstruction_v2, visible as a code label at the top; visual target glow behind it.'
);

const leadingQuotedSchemaWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version": "reconstruction_v2". Create a clean poster with source image glow.'
  }
};
assert.equal(getGeneratorPrompt(leadingQuotedSchemaWrapperAnalysis), 'Create a clean poster with visual target glow.');

const quotedJsonFieldFragmentAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted JSON field fragment', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version": "reconstruction_v2",\n"generation_prompt": "Create a clean poster with source image glow."'
  }
};
assert.equal(getGeneratorPrompt(quotedJsonFieldFragmentAnalysis), 'Create a clean poster with visual target glow.');
const quotedJsonFieldGeneratorJsonPrompt = JSON.parse(stringifyGeneratorJsonPrompt(quotedJsonFieldFragmentAnalysis));
assert.equal(Object.keys(quotedJsonFieldGeneratorJsonPrompt)[0], 'prompt');
assert.equal(quotedJsonFieldGeneratorJsonPrompt.prompt, 'Create a clean poster with visual target glow.');
assert(!JSON.stringify(quotedJsonFieldGeneratorJsonPrompt).includes('schema_version'));
assert(!JSON.stringify(quotedJsonFieldGeneratorJsonPrompt).includes('reconstruction_v2'));

const quotedGenerationPromptFieldAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted generation prompt field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"generation_prompt": "Create a clean poster with reference image glow."'
  }
};
assert.equal(getGeneratorPrompt(quotedGenerationPromptFieldAnalysis), 'Create a clean poster with visual target glow.');

const quotedGenerationPromptVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible generation prompt field text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"generation_prompt": "SALE" appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedGenerationPromptVisibleTextAnalysis),
  '"generation_prompt": "SALE" appears as a visible code label at the top; visual target glow behind it.'
);

const bracedGenerationPromptVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for braced visible generation prompt field text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"generation_prompt":"SALE"} appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(bracedGenerationPromptVisibleTextAnalysis),
  '{"generation_prompt":"SALE"} appears as a visible code label at the top; visual target glow behind it.'
);

const fullJsonObjectInGenerationPromptAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for JSON object in generation field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version":"reconstruction_v2","generation_prompt":"Create a clean poster with source image glow."}'
  }
};
assert.equal(getGeneratorPrompt(fullJsonObjectInGenerationPromptAnalysis), 'Create a clean poster with visual target glow.');

const nestedJsonPromptObjectInGenerationPromptAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for nested JSON object in generation field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"json_prompt":{"schema_version":"reconstruction_v2","generation_prompt":"Create a clean poster with reference image glow."}}'
  }
};
assert.equal(getGeneratorPrompt(nestedJsonPromptObjectInGenerationPromptAnalysis), 'Create a clean poster with visual target glow.');

const leadingBracedSchemaVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for braced visible schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"} appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingBracedSchemaVisibleTextAnalysis),
  '{"schema_version": "reconstruction_v2"} appears as a visible code label at the top; visual target glow behind it.'
);

const leadingBracedSchemaCommaVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for comma braced visible schema text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"}, appears as a visible code label at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingBracedSchemaCommaVisibleTextAnalysis),
  '{"schema_version": "reconstruction_v2"}, appears as a visible code label at the top; visual target glow behind it.'
);

const leadingBracedSchemaWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for braced schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"}. Create a clean poster with layered haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingBracedSchemaWrapperAnalysis), 'Create a clean poster with layered haze.');

const leadingBracedSchemaCommandWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for braced schema command wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"} Create a clean poster with layered haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingBracedSchemaCommandWrapperAnalysis), 'Create a clean poster with layered haze.');

const leadingBracedSchemaPoliteWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for polite braced schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"} Please create a clean poster with layered haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingBracedSchemaPoliteWrapperAnalysis), 'Please create a clean poster with layered haze.');

const leadingBracedSchemaNounWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for noun braced schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"} A cinematic portrait with layered haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingBracedSchemaNounWrapperAnalysis), 'A cinematic portrait with layered haze.');

const leadingImage2WrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for Image2 wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Image 2 prompt: Create a clean poster with source image glow.'
  }
};
assert.equal(getGeneratorPrompt(leadingImage2WrapperAnalysis), 'Create a clean poster with visual target glow.');

const leadingImage2VisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible Image 2 label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Image 2: appears as visible text at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingImage2VisibleTextAnalysis),
  'Image 2: appears as visible text at the top; visual target glow behind it.'
);

const leadingImage2VisibleLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible Image 2 label with words', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Image 2: sunset appears as visible text at the top; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingImage2VisibleLabelAnalysis),
  'Image 2: sunset appears as visible text at the top; visual target glow behind it.'
);

const leadingBracedSchemaCommaNormalVisibleAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for comma braced visible prompt', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '{"schema_version": "reconstruction_v2"}, visible Chinese UI text appears on the screen with source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(leadingBracedSchemaCommaNormalVisibleAnalysis),
  'visible Chinese UI text appears on the screen with visual target glow.'
);

const quotedWhitespaceVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted whitespace text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads "A  B" and code label reads "line\n  two"; source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedWhitespaceVisibleTextAnalysis),
  'Poster title reads "A  B" and code label reads "line\n  two"; visual target glow behind the lettering.'
);

const possessivePromptAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for possessives', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: "Artist's source image glow matches viewer's reference image note."
  }
};
assert.equal(getGeneratorPrompt(possessivePromptAnalysis), "Artist's visual target glow matches viewer's visual target note.");

const realSourceNounAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for real source noun', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The source of the backlight is behind the subject; use source image glow around the silhouette.'
  }
};
assert.equal(
  getGeneratorPrompt(realSourceNounAnalysis),
  'The source of the backlight is behind the subject; use visual target glow around the silhouette.'
);

const referenceScreenshotWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for reference screenshot wrappers', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use reference screenshot lighting and match the reference visual palette; source screenshot glow remains.'
  }
};
assert.equal(
  getGeneratorPrompt(referenceScreenshotWrapperAnalysis),
  'Use target screenshot lighting and match the visual target palette; target screenshot glow remains.'
);

const referencePhotoWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for reference photo wrappers', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use the reference photo lighting and match the source photo crop.'
  }
};
assert.equal(
  getGeneratorPrompt(referencePhotoWrapperAnalysis),
  'Use the target photo lighting and match the target photo crop.'
);

const uploadReferenceImageAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after upload reference request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster and upload the reference image.'
  }
};
assert.equal(getGeneratorPrompt(uploadReferenceImageAnalysis), 'Create a clean poster.');

const uploadReferenceImagesPurposeAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after upload reference images purpose request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster and upload the reference images for guidance.'
  }
};
assert.equal(getGeneratorPrompt(uploadReferenceImagesPurposeAnalysis), 'Create a clean poster.');

const attachSourcePhotosCommaAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after attach source photos comma request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, please attach source photos.'
  }
};
assert.equal(getGeneratorPrompt(attachSourcePhotosCommaAnalysis), 'Create a clean poster.');

const leadingUploadReferenceCommaAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload comma request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image, create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceCommaAnalysis), 'Create a clean poster.');

const leadingUploadReferenceKeepDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload keep detail request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image for guidance and keep the blue haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceKeepDetailAnalysis), 'Keep the blue haze.');

const leadingUploadReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload with detail request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image for guidance with blue haze and diagonal light.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceWithDetailAnalysis), 'Include blue haze and diagonal light.');

const leadingUploadReferenceCommaWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload comma with detail request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image for guidance, with blue haze and diagonal light.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceCommaWithDetailAnalysis), 'Include blue haze and diagonal light.');

const leadingUploadReferenceToWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload to with detail request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image to guide composition with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceToWithDetailAnalysis), 'Include blue haze.');

const leadingAttachUploadedImageReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading attach uploaded image reference with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Attach the uploaded image as reference with rim light.'
  }
};
assert.equal(getGeneratorPrompt(leadingAttachUploadedImageReferenceWithDetailAnalysis), 'Include rim light.');

const leadingProvideUploadedImageReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading provide uploaded image reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Provide the uploaded image as a reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingProvideUploadedImageReferenceThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadBareImageReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload bare image reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the image as reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadBareImageReferenceThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadPluralImagesReferencesThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload plural images references then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload images as references and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadPluralImagesReferencesThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadPluralScreenshotsReferencesWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload plural screenshots references with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Please upload screenshots as references for guidance with diagonal light.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadPluralScreenshotsReferencesWithDetailAnalysis), 'Include diagonal light.');

const leadingAttachUploadedReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading attach uploaded reference with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Attach the uploaded reference with rim light.'
  }
};
assert.equal(getGeneratorPrompt(leadingAttachUploadedReferenceWithDetailAnalysis), 'Include rim light.');

const leadingProvideUploadedReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading provide uploaded reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Provide the uploaded reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingProvideUploadedReferenceThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadBareReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload bare reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadBareReferenceThenCreateAnalysis), 'Create a clean poster.');

const leadingAttachBareReferencesWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading attach bare references with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Attach references for guidance with rim light.'
  }
};
assert.equal(getGeneratorPrompt(leadingAttachBareReferencesWithDetailAnalysis), 'Include rim light.');

const leadingProvideBareReferencesThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading provide bare references then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Provide the references and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingProvideBareReferencesThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload then create request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image then create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceThenCreateAnalysis), 'Create a clean poster.');

const leadingUploadReferenceAndCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading upload and create request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingUploadReferenceAndCreateAnalysis), 'Create a clean poster.');

const provideSourceVisualsPurposeAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after provide source visuals purpose request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster and provide the source visuals to guide composition.'
  }
};
assert.equal(getGeneratorPrompt(provideSourceVisualsPurposeAnalysis), 'Create a clean poster.');

const uploadReferenceKeepDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after upload reference with keep detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, upload the reference image for guidance and keep the blue haze.'
  }
};
assert.equal(getGeneratorPrompt(uploadReferenceKeepDetailAnalysis), 'Create a clean poster and keep the blue haze.');

const uploadReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after upload reference with visual detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster and upload the reference image to guide composition with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(uploadReferenceWithDetailAnalysis), 'Create a clean poster with blue haze.');

const attachUploadedImageReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after attach uploaded image reference with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, attach the uploaded image as reference with rim light.'
  }
};
assert.equal(getGeneratorPrompt(attachUploadedImageReferenceWithDetailAnalysis), 'Create a clean poster with rim light.');

const commaUploadReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after comma upload reference with visual detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, upload the reference image for guidance, with blue haze and diagonal light.'
  }
};
assert.equal(getGeneratorPrompt(commaUploadReferenceWithDetailAnalysis), 'Create a clean poster with blue haze and diagonal light.');

const leadingProvideSourceVisualsAndCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading provide source visuals and create request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Provide the source visuals to guide composition and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingProvideSourceVisualsAndCreateAnalysis), 'Create a clean poster.');

const useThisImageReferenceOnlyAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after this-image reference wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use this image as a reference.'
  }
};
assert.equal(getGeneratorPrompt(useThisImageReferenceOnlyAnalysis), 'Fallback English prompt after this-image reference wrapper');

const useThisImageReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after this-image reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use this image as a reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(useThisImageReferenceThenCreateAnalysis), 'Create a clean poster.');

const useBareImageReferenceOnlyAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after bare image reference wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use image as reference.'
  }
};
assert.equal(getGeneratorPrompt(useBareImageReferenceOnlyAnalysis), 'Fallback English prompt after bare image reference wrapper');

const useBareImageReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after bare image reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use the image as reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(useBareImageReferenceThenCreateAnalysis), 'Create a clean poster.');

const inlineUseBareImageReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after inline bare image reference with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, use the image as reference with rim light.'
  }
};
assert.equal(getGeneratorPrompt(inlineUseBareImageReferenceWithDetailAnalysis), 'Create a clean poster with rim light.');

const useBareReferenceThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after bare reference then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use the reference and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(useBareReferenceThenCreateAnalysis), 'Create a clean poster.');

const useBareReferencesWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after bare references with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use references for guidance with rim light.'
  }
};
assert.equal(getGeneratorPrompt(useBareReferencesWithDetailAnalysis), 'Include rim light.');

const usingTheseImagesReferencesThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after these images references then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Using these images as references then create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(usingTheseImagesReferencesThenCreateAnalysis), 'Create a clean poster.');

const uploadedReferenceInlineAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after uploaded reference inline wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster using the uploaded reference.'
  }
};
assert.equal(getGeneratorPrompt(uploadedReferenceInlineAnalysis), 'Create a clean poster.');

const uploadedImageReferenceWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after uploaded image reference with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, use the uploaded image as reference with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(uploadedImageReferenceWithDetailAnalysis), 'Create a clean poster with blue haze.');

const providePluralPhotosReferencesWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after plural photos references with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, provide photos as references with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(providePluralPhotosReferencesWithDetailAnalysis), 'Create a clean poster with blue haze.');

const uploadBareReferencesWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after inline upload bare references with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Create a clean poster, upload the references for guidance with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(uploadBareReferencesWithDetailAnalysis), 'Create a clean poster with blue haze.');

const pluralReferenceImagesAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after plural reference images', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use the reference images as lighting guidance with source photos nearby.'
  }
};
assert.equal(
  getGeneratorPrompt(pluralReferenceImagesAnalysis),
  'Use the visual targets as lighting guidance with target photos nearby.'
);

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

const visibleTextThenNormalWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text marker', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself and source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextThenNormalWrapperAnalysis),
  'Poster title reads Recreate Yourself and visual target glow behind the lettering.'
);

const visibleTextThenUseReferenceWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after and-use reference wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE and use the reference image as guidance.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextThenUseReferenceWrapperAnalysis),
  'Poster title reads SALE and use the visual target as guidance.'
);

const visibleTextThenUseReferenceAtSentenceEndAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after and-use reference at sentence end', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE and use the reference image.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextThenUseReferenceAtSentenceEndAnalysis),
  'Poster title reads SALE and use the visual target.'
);

const visibleTextCommaUploadBoundaryAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text comma upload boundary', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE, upload the reference image for guidance.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextCommaUploadBoundaryAnalysis),
  'Poster title reads SALE.'
);

const visibleTextAndProvideBoundaryAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text and provide boundary', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE and provide the source visuals to guide composition.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextAndProvideBoundaryAnalysis),
  'Poster title reads SALE.'
);

const quotedVisibleTextCommaUploadBoundaryAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted visible text comma upload boundary', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image", upload the reference image for guidance.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextCommaUploadBoundaryAnalysis),
  'Text reads "source image".'
);

const quotedVisibleTextCommaUploadWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted visible text comma upload with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image", upload the reference image for guidance with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextCommaUploadWithDetailAnalysis),
  'Text reads "source image". Include rim light.'
);

const visibleTextCommaUploadWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text comma upload with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE, upload the reference image for guidance with blue haze.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextCommaUploadWithDetailAnalysis),
  'Poster title reads SALE. Include blue haze.'
);

const quotedVisibleTextAndProvideThenPreserveAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted visible text provide then preserve', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image" and provide the source visuals to guide composition then preserve blue haze.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextAndProvideThenPreserveAnalysis),
  'Text reads "source image". Preserve blue haze.'
);

const quotedVisibleTextThenUseImageAndKeepAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted visible text then use image and keep', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image" then use this image as a reference and keep rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextThenUseImageAndKeepAnalysis),
  'Text reads "source image". Keep rim light.'
);

const visibleTextThenUseImageThenPreserveAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text then use image then preserve', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE then use this image as a reference then preserve blue haze.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextThenUseImageThenPreserveAnalysis),
  'Poster title reads SALE. Preserve blue haze.'
);

const quotedVisibleTextUseThisImageWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after quoted visible text this-image reference detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image", use this image as a reference with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(quotedVisibleTextUseThisImageWithDetailAnalysis),
  'Text reads "source image". Include rim light.'
);

const commaVisibleTextThenNormalWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after comma visible text marker', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself, source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(commaVisibleTextThenNormalWrapperAnalysis),
  'Poster title reads Recreate Yourself, visual target glow behind the lettering.'
);

const commaInsideVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for comma inside visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SOURCE IMAGE, REFERENCE IMAGE; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(commaInsideVisibleTextAnalysis),
  'Poster title reads SOURCE IMAGE, REFERENCE IMAGE; use visual target glow behind the lettering.'
);

const lowerCommaInsideVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for lowercase comma visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads source image, reference image; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(lowerCommaInsideVisibleTextAnalysis),
  'Poster title reads source image, reference image; use visual target glow behind the lettering.'
);

const andInsideVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for and inside visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SOURCE and REFERENCE IMAGE; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(andInsideVisibleTextAnalysis),
  'Poster title reads SOURCE and REFERENCE IMAGE; use visual target glow behind the lettering.'
);

const sourceImageLabVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for source image lab visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SOURCE IMAGE LAB; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(sourceImageLabVisibleTextAnalysis),
  'Poster title reads SOURCE IMAGE LAB; use visual target glow behind the lettering.'
);

const commaSourceImageLabVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for comma source image lab visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SOURCE IMAGE, REFERENCE IMAGE LAB; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(commaSourceImageLabVisibleTextAnalysis),
  'Poster title reads SOURCE IMAGE, REFERENCE IMAGE LAB; use visual target glow behind the lettering.'
);

const colonVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for colon visible source text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Visible text: "source image" and label: "reference image"; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(colonVisibleTextAnalysis),
  'Visible text: "source image" and label: "reference image"; use visual target glow behind the lettering.'
);

const pluralColonVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for plural colon visible labels', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Visible labels: "source image" and "reference image"; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(pluralColonVisibleTextAnalysis),
  'Visible labels: "source image" and "reference image"; use visual target glow behind the lettering.'
);

const bareTextReadsVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for bare text reads visible words', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextAnalysis),
  'Text reads "source image"; use visual target glow behind the lettering.'
);

const bareTextReadsVisibleTextThenUploadWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then upload with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; upload the reference image for guidance with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenUploadWithDetailAnalysis),
  'Text reads "source image"; include rim light.'
);

const bareTextReadsVisibleTextThenDirectWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then direct with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenDirectWithDetailAnalysis),
  'Text reads "source image"; include rim light.'
);

const bareTextReadsVisibleTextThenUploadAndKeepDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then upload and keep detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; upload the reference image for guidance and keep rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenUploadAndKeepDetailAnalysis),
  'Text reads "source image"; keep rim light.'
);

const bareTextReadsVisibleTextThenUploadThenCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then upload then create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; upload the reference image then create a clean poster.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenUploadThenCreateAnalysis),
  'Text reads "source image"; create a clean poster.'
);

const bareTextReadsVisibleTextThenUploadAndCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then upload and create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image"; upload the reference image and create a clean poster.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenUploadAndCreateAnalysis),
  'Text reads "source image"; create a clean poster.'
);

const bareTextReadsVisibleTextThenSentenceUploadWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text sentence then upload with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image". Upload the reference image for guidance with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenSentenceUploadWithDetailAnalysis),
  'Text reads "source image". Include rim light.'
);

const bareTextReadsVisibleTextThenSentenceDirectWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text sentence then direct with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text reads "source image". with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextReadsVisibleTextThenSentenceDirectWithDetailAnalysis),
  'Text reads "source image". Include rim light.'
);

const bareTextSaysVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for bare text says visible words', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text says "reference image"; source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextSaysVisibleTextAnalysis),
  'Text says "reference image"; visual target glow behind the lettering.'
);

const bareTextSaysVisibleTextThenProvideThenPreserveAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for visible text then provide and preserve', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Text says "reference image". Provide the source visuals to guide composition then preserve blue haze.'
  }
};
assert.equal(
  getGeneratorPrompt(bareTextSaysVisibleTextThenProvideThenPreserveAnalysis),
  'Text says "reference image". Preserve blue haze.'
);

const buttonTextVisibleTextThenUploadWithDetailAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for button text then upload with detail', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Button text reads "source image"; upload the reference image for guidance with rim light.'
  }
};
assert.equal(
  getGeneratorPrompt(buttonTextVisibleTextThenUploadWithDetailAnalysis),
  'Button text reads "source image"; include rim light.'
);

const instructionTextSaysWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for non-visible instruction text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The instruction text says use source image lighting.'
  }
};
assert.equal(
  getGeneratorPrompt(instructionTextSaysWrapperAnalysis),
  'The instruction text says use visual target lighting.'
);

const displaysShowsVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for displays/shows visible labels', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Logo displays "source image" and UI label shows "reference image"; use source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(displaysShowsVisibleTextAnalysis),
  'Logo displays "source image" and UI label shows "reference image"; use visual target glow behind the lettering.'
);

const wordsAppearVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for words appear visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The words "source image" appear on the poster; use source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(wordsAppearVisibleTextAnalysis),
  'The words "source image" appear on the poster; use visual target glow.'
);

const phrasePrintedVisibleTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for phrase printed visible text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The phrase "reference image" is printed on the shirt; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(phrasePrintedVisibleTextAnalysis),
  'The phrase "reference image" is printed on the shirt; visual target glow behind it.'
);

const wordsAppearVisibleTextThenUploadAndCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for words appear visible text then upload and create', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The words "source image" appear on the poster, upload images as references and create a clean poster.'
  }
};
assert.equal(
  getGeneratorPrompt(wordsAppearVisibleTextThenUploadAndCreateAnalysis),
  'The words "source image" appear on the poster. Create a clean poster.'
);

const phrasePrintedVisibleTextThenUseAndPreserveAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for phrase printed visible text then use and preserve', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'The phrase "reference image" is printed on the shirt, use the image as reference then preserve blue haze.'
  }
};
assert.equal(
  getGeneratorPrompt(phrasePrintedVisibleTextThenUseAndPreserveAnalysis),
  'The phrase "reference image" is printed on the shirt. Preserve blue haze.'
);

const wordsQuotedWrapperInstructionAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted words wrapper instruction', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Words "source image" should be avoided as wrapper wording.'
  }
};
assert.equal(
  getGeneratorPrompt(wordsQuotedWrapperInstructionAnalysis),
  'Words "visual target" should be avoided as wrapper wording.'
);

const phrasesQuotedWrapperInstructionAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted phrases wrapper instruction', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Phrases "reference image" are forbidden in wrapper wording.'
  }
};
assert.equal(
  getGeneratorPrompt(phrasesQuotedWrapperInstructionAnalysis),
  'Phrases "visual target" are forbidden in wrapper wording.'
);

const generatorFlagSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after generator flag syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '--ar 16:9 clean poster'
  }
};
assert.equal(getGeneratorPrompt(generatorFlagSyntaxAnalysis), 'clean poster');

const decimalGeneratorFlagSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after decimal generator flag syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'clean poster --v 6.1 with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(decimalGeneratorFlagSyntaxAnalysis), 'clean poster with blue haze.');

const equalsDecimalGeneratorFlagSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after equals decimal generator flag syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'clean poster --v=6.1 with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(equalsDecimalGeneratorFlagSyntaxAnalysis), 'clean poster with blue haze.');

const arbitraryGeneratorFlagSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after arbitrary generator flag syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Clean poster --cref abc123 --cw 80 --weird with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(arbitraryGeneratorFlagSyntaxAnalysis), 'Clean poster with blue haze.');

const generatorNoFlagListAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after generator no-list syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'clean poster --no text, watermark'
  }
};
assert.equal(getGeneratorPrompt(generatorNoFlagListAnalysis), 'clean poster');

const inlineGeneratorFlagSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after inline generator flag syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Clean poster --ar 16:9 with blue haze.'
  }
};
assert.equal(getGeneratorPrompt(inlineGeneratorFlagSyntaxAnalysis), 'Clean poster with blue haze.');

const breakTokenSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after break syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'BREAK clean poster'
  }
};
assert.equal(getGeneratorPrompt(breakTokenSyntaxAnalysis), 'clean poster');

const loraBracketSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after LoRA and bracket syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use [blue haze] and <lora:test:1>.'
  }
};
assert.equal(getGeneratorPrompt(loraBracketSyntaxAnalysis), 'Use blue haze.');

const weightedPromptSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after weighted prompt syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '(blue haze:1.2) clean poster with [soft rim light:0.8].'
  }
};
assert.equal(getGeneratorPrompt(weightedPromptSyntaxAnalysis), 'blue haze clean poster with soft rim light.');

const colonWeightSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after colon weight syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'blue haze ::2 clean poster'
  }
};
assert.equal(getGeneratorPrompt(colonWeightSyntaxAnalysis), 'blue haze clean poster');

const inlineColonWeightSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after inline colon weight syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'clean poster ::2 with blue haze'
  }
};
assert.equal(getGeneratorPrompt(inlineColonWeightSyntaxAnalysis), 'clean poster with blue haze');

const parentheticalPromptSyntaxAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after parenthetical prompt syntax', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '(blue haze) clean poster'
  }
};
assert.equal(getGeneratorPrompt(parentheticalPromptSyntaxAnalysis), 'blue haze clean poster');

const referenceSheetPromptAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after reference-sheet wording', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use reference sheet layout with front and side views.'
  }
};
assert.equal(getGeneratorPrompt(referenceSheetPromptAnalysis), 'Use reference sheet layout with front and side views.');

const referenceWrapperVisualCueAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after reference wrapper with visual cue', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use this reference image for pose and lighting; keep blue haze.'
  }
};
assert.equal(getGeneratorPrompt(referenceWrapperVisualCueAnalysis), 'Use pose and lighting; keep blue haze.');

const visibleTextThenGeneratorFlagAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text followed by generator flag', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads SALE --ar 16:9; source image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextThenGeneratorFlagAnalysis),
  'Poster title reads SALE; visual target glow behind the lettering.'
);

const visibleTextWithReferenceWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text with wrapper term', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself with reference image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextWithReferenceWrapperAnalysis),
  'Poster title reads Recreate Yourself with visual target glow behind the lettering.'
);

const visibleTextWithCapitalReferenceWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after visible text with capital wrapper term', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself with Reference Image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(visibleTextWithCapitalReferenceWrapperAnalysis),
  'Poster title reads Recreate Yourself with visual target glow behind the lettering.'
);

const commaVisibleTextThenCapitalWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after comma visible text with capital wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Poster title reads Recreate Yourself, Source Image glow behind the lettering.'
  }
};
assert.equal(
  getGeneratorPrompt(commaVisibleTextThenCapitalWrapperAnalysis),
  'Poster title reads Recreate Yourself, visual target glow behind the lettering.'
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

const quotedWrapperTermAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted wrapper terms', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Use "reference image" lighting and \'source image\' glow, while label reads "source image".'
  }
};
assert.equal(
  getGeneratorPrompt(quotedWrapperTermAnalysis),
  'Use "visual target" lighting and \'visual target\' glow, while label reads "source image".'
);

const exactQuotedVisibleLabelAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for exact quoted visible label', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Include exact label "source image" at top with reference image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(exactQuotedVisibleLabelAnalysis),
  'Include exact label "source image" at top with visual target glow.'
);

const quotedWholePromptWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quote-wrapped prompt wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"Recreate this image with source image glow."'
  }
};
assert.equal(getGeneratorPrompt(quotedWholePromptWrapperAnalysis), '"Create the described image with visual target glow."');

const quotedWholePromptSchemaWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quote-wrapped schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version: reconstruction_v2. Create a clean poster with source image glow."'
  }
};
assert.equal(getGeneratorPrompt(quotedWholePromptSchemaWrapperAnalysis), '"Create a clean poster with visual target glow."');

const signQuotedVisibleSourceTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for sign source text', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'A storefront sign says "source image" and shirt text says "reference image"; use source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(signQuotedVisibleSourceTextAnalysis),
  'A storefront sign says "source image" and shirt text says "reference image"; use visual target glow.'
);

const shirtSignAliasVisibleSourceTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for shirt sign aliases', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'A shirt says "reference image" and a sign with text "source image"; use source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(shirtSignAliasVisibleSourceTextAnalysis),
  'A shirt says "reference image" and a sign with text "source image"; use visual target glow.'
);

const buttonTextVisibleSourceTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for button text visible source words', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'A toolbar button text reads "source image"; use source image glow.'
  }
};
assert.equal(
  getGeneratorPrompt(buttonTextVisibleSourceTextAnalysis),
  'A toolbar button text reads "source image"; use visual target glow.'
);

const uiLabelTextVisibleReferenceTextAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for UI label text visible reference words', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'UI label text says "reference image"; source image glow behind it.'
  }
};
assert.equal(
  getGeneratorPrompt(uiLabelTextVisibleReferenceTextAnalysis),
  'UI label text says "reference image"; visual target glow behind it.'
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

const semicolonSchemaOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after semicolon schema-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'schema_version: reconstruction_v2;'
  }
};
assert.equal(getGeneratorPrompt(semicolonSchemaOnlyHandoffAnalysis), 'Fallback English prompt after semicolon schema-only generator field');

const sourceImageOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'source image'
  }
};
assert.equal(getGeneratorPrompt(sourceImageOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const referenceImageOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'reference image'
  }
};
assert.equal(getGeneratorPrompt(referenceImageOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const recreateOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'recreate this image'
  }
};
assert.equal(getGeneratorPrompt(recreateOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const recreateOnlySemicolonHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'recreate this image;'
  }
};
assert.equal(getGeneratorPrompt(recreateOnlySemicolonHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const bareRecreateOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'recreate'
  }
};
assert.equal(getGeneratorPrompt(bareRecreateOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const uploadOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Upload the reference image for guidance.'
  }
};
assert.equal(getGeneratorPrompt(uploadOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const sourceImageSemicolonOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'source image;'
  }
};
assert.equal(getGeneratorPrompt(sourceImageSemicolonOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const sourceImageCommaOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'source image,'
  }
};
assert.equal(getGeneratorPrompt(sourceImageCommaOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

const referenceImageColonOnlyHandoffAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after wrapper-only generator field', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'reference image:'
  }
};
assert.equal(getGeneratorPrompt(referenceImageColonOnlyHandoffAnalysis), 'Fallback English prompt after wrapper-only generator field');

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
