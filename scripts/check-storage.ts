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

const leadingQuotedSchemaWrapperAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt for quoted schema wrapper', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: '"schema_version": "reconstruction_v2". Create a clean poster with source image glow.'
  }
};
assert.equal(getGeneratorPrompt(leadingQuotedSchemaWrapperAnalysis), 'Create a clean poster with visual target glow.');

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

const leadingProvideSourceVisualsAndCreateAnalysis = {
  ...currentAnalysis,
  en: { prompt: 'Fallback English prompt after leading provide source visuals and create request', analysis: '' },
  json_prompt: {
    ...currentAnalysis.json_prompt,
    generation_prompt: 'Provide the source visuals to guide composition and create a clean poster.'
  }
};
assert.equal(getGeneratorPrompt(leadingProvideSourceVisualsAndCreateAnalysis), 'Create a clean poster.');

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
