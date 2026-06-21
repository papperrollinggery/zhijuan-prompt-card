import { stringifyGeneratorJsonPrompt } from '../src/shared/historyDisplay';
import { parsePromptAnalysis } from '../src/shared/jsonRepair';

const baseAnalysis = {
  zh: { prompt: '中文提示词。', analysis: '中文分析。' },
  en: {
    prompt:
      'Detailed dark poster with visible Chinese title, lifted central subject, layered foreground and background depth, warm light, textured material surfaces, and source-defining layout relationships that must remain recognizable.',
    analysis: 'English analysis.'
  },
  zh_style_tags: ['中文', '海报', '层次', '材质'],
  en_style_tags: ['poster', 'layered', 'text lock', 'material'],
  prompt_core: 'Dark poster with Chinese title, lifted subject, depth, warm light.',
  negative_prompt: 'missing title, missing lifted subject, flat layout, wrong material',
  json_prompt: {
    schema_version: 'reconstruction_v2',
    summary: 'test reconstruction',
    generation_prompt:
      'Generic richly detailed image with many elements and a dramatic mood, balanced layout, polished colors, and attractive lighting for high quality generation.',
    generation_negative_prompt: 'generic bad anatomy, low quality, artifacts',
    spatial_dynamics: 'central subject rises upward with foreground and midground occlusion',
    subject: 'central subject',
    action_pose: 'rises upward',
    details_appearance: 'textured ceramic and glossy surface',
    environment_background: 'layered foreground and background',
    lighting_atmosphere: 'warm light with steam haze',
    composition_framing: 'vertical poster composition',
    style_camera: 'poster realism style_index 45 of 100',
    colors: ['#111111 black - background', '#f5d28a gold - text', '#d67332 amber - light'],
    materials: ['glossy ceramic', 'dark wood'],
    aspect_ratio: '9:16',
    quality_modifiers: ['source fidelity', 'text lock', 'material lock'],
    fidelity_priorities: ['visible Chinese title priority 96 of 100', 'lifted subject priority 94 of 100'],
    global_fingerprint: {
      style_index: 45,
      density: 'dense',
      spatial_flow: 'upward central motion',
      optical_finish: ['steam haze'],
      render_finish: ['commercial poster'],
      palette: ['#111111 black - background']
    },
    observation_units: [
      {
        id: 'text',
        kind: 'text_lock',
        priority: 96,
        prompt: 'Visible Chinese title stays in the upper-left hierarchy.',
        evidence: 'Chinese title is visible',
        location: 'upper left',
        must_preserve: ['Chinese title'],
        avoid_drift: ['translated title']
      },
      {
        id: 'surface',
        kind: 'material_surface',
        priority: 90,
        prompt: 'Glossy ceramic and dark wood texture remain source-defining.',
        evidence: 'visible material surfaces',
        location: 'foreground',
        must_preserve: ['glossy ceramic', 'dark wood texture'],
        avoid_drift: ['plastic material']
      }
    ],
    text_elements: [
      {
        content: '浓汤',
        language: 'Chinese',
        role: 'main title',
        location: 'upper left',
        typography: 'large brush calligraphy',
        legibility: 'clear',
        priority: 96
      }
    ],
    reconstruction_priorities: [
      {
        cue: 'Visible Chinese title and material surface outrank generic poster polish.',
        priority: 95,
        tradeoff: 'source evidence over generic polish',
        compile_to_en_prompt: true,
        risk_if_missing: 'the output becomes a generic poster'
      }
    ],
    likely_generation_intent: 'poster recreation'
  }
};

const parsed = parsePromptAnalysis(baseAnalysis);
const generationPrompt = parsed.json_prompt.generation_prompt;
const generationNegative = parsed.json_prompt.generation_negative_prompt;

assert(generationPrompt.split(/\s+/).length >= parsed.en.prompt.split(/\s+/).length, 'generation_prompt stayed weaker than en.prompt');
assert(generationPrompt.includes('portrait vertical source frame'), 'generation_prompt did not compile source-frame orientation evidence');
assert(generationPrompt.includes('observed aspect ratio 9:16'), 'generation_prompt did not compile source aspect ratio evidence');
assert(generationPrompt.includes('Visible Chinese title'), 'generation_prompt did not compile high-priority observation evidence');
assert(generationPrompt.includes('visible text 浓汤'), 'generation_prompt did not compile text_elements evidence');
assert(generationNegative.includes('missing Chinese text'), 'generation_negative_prompt missing Chinese text blocker');
assert(generationNegative.includes('wrong aspect ratio'), 'generation_negative_prompt missing aspect-ratio blocker');
assert(generationNegative.includes('wrong orientation'), 'generation_negative_prompt missing orientation blocker');
assert(generationNegative.includes('wrong material or surface finish'), 'generation_negative_prompt missing material blocker');
assert(generationNegative.includes('missing steam haze'), 'generation_negative_prompt missing steam-specific blocker');
assert(!generationNegative.includes('missing splash droplets'), 'steam-only evidence should not create splash blocker');

const wrongFrameAnalysis = JSON.parse(JSON.stringify(baseAnalysis));
wrongFrameAnalysis.zh.prompt = '横版 15:8 足球直播海报，红蓝对抗，底部大标题。';
wrongFrameAnalysis.en.prompt =
  'Create a horizontal sports livestream promo poster in an approximately 15:8 widescreen crop with a red-blue split and large Chinese headline.';
wrongFrameAnalysis.prompt_core = 'Horizontal 15:8 wide livestream cover with Chinese match text.';
wrongFrameAnalysis.en_style_tags = ['horizontal poster', 'sports graphic', 'widescreen crop'];
wrongFrameAnalysis.json_prompt.summary = 'horizontal 15:8 widescreen sports poster';
wrongFrameAnalysis.json_prompt.subject = 'horizontal 15:8 widescreen sports livestream poster';
wrongFrameAnalysis.json_prompt.action_pose = 'two players in a horizontal 15:8 poster frame';
wrongFrameAnalysis.json_prompt.details_appearance = 'wide sports poster texture with red-blue split';
wrongFrameAnalysis.json_prompt.environment_background = 'horizontal 15:8 widescreen grunge backdrop';
wrongFrameAnalysis.json_prompt.lighting_atmosphere = 'portrait-compatible dramatic light with 2:1 score text preserved';
wrongFrameAnalysis.json_prompt.aspect_ratio = '15:8';
wrongFrameAnalysis.json_prompt.composition_framing = 'horizontal 15:8 widescreen crop with a wide livestream poster layout';
wrongFrameAnalysis.json_prompt.style_camera = 'horizontal 15:8 widescreen sports poster camera';
wrongFrameAnalysis.json_prompt.quality_modifiers = ['horizontal poster fidelity', 'source text lock'];
wrongFrameAnalysis.json_prompt.global_fingerprint.spatial_flow = 'horizontal 15:8 widescreen poster flow';
wrongFrameAnalysis.json_prompt.global_fingerprint.optical_finish = ['horizontal poster grain'];
wrongFrameAnalysis.json_prompt.observation_units[0].prompt = 'Keep horizontal 15:8 widescreen poster text hierarchy.';
wrongFrameAnalysis.json_prompt.observation_units[0].location = 'horizontal 15:8 poster header';
wrongFrameAnalysis.json_prompt.observation_units[0].must_preserve = ['horizontal 15:8 poster crop'];
wrongFrameAnalysis.json_prompt.observation_units[0].avoid_drift = ['vertical poster', 'portrait crop', 'missing Chinese text'];
wrongFrameAnalysis.json_prompt.text_elements[0].location = 'horizontal 15:8 poster lower third';
wrongFrameAnalysis.json_prompt.text_elements[0].typography = 'widescreen poster title type';
wrongFrameAnalysis.json_prompt.reconstruction_priorities[0].cue = 'Horizontal 15:8 widescreen poster frame outranks other details.';
wrongFrameAnalysis.json_prompt.reconstruction_priorities[0].risk_if_missing = 'becomes a vertical poster';
wrongFrameAnalysis.json_prompt.generation_prompt =
  'Create a horizontal sports livestream promo poster in an approximately 15:8 widescreen crop, red-blue split, four-player collage, large Chinese headline.';
wrongFrameAnalysis.json_prompt.spatial_dynamics = 'horizontal 15:8 widescreen poster flow from left to right';
wrongFrameAnalysis.negative_prompt = 'vertical poster, portrait crop, missing Chinese text';
wrongFrameAnalysis.json_prompt.generation_negative_prompt = 'vertical poster, portrait crop, low quality artifacts';

const correctedFrameParsed = parsePromptAnalysis(wrongFrameAnalysis, {
  width: 390,
  height: 520,
  orientation: 'portrait',
  aspectRatio: '3:4'
});
const correctedGenerationPrompt = correctedFrameParsed.json_prompt.generation_prompt;
assert(
  correctedFrameParsed.json_prompt.aspect_ratio === '3:4',
  'source image aspect ratio evidence did not override model output'
);
assert(
  correctedFrameParsed.json_prompt.composition_framing.includes('portrait source frame'),
  'source image orientation evidence did not override composition_framing'
);
assert(
  correctedFrameParsed.json_prompt.composition_framing.includes('uploaded dimensions 390x520'),
  'source image dimensions were not preserved in composition_framing'
);
assert(!/15\s*:\s*8/i.test(correctedGenerationPrompt), 'generation_prompt still exposes the wrong model aspect ratio');
assert(
  !/\b(?:horizontal|landscape|widescreen)\b/i.test(correctedGenerationPrompt),
  'generation_prompt still exposes wrong horizontal orientation words'
);
assert(correctedGenerationPrompt.includes('3:4'), 'generation_prompt is missing corrected source aspect ratio');
assert(correctedGenerationPrompt.includes('portrait'), 'generation_prompt is missing corrected source orientation');
assert(!/15\s*:\s*8/i.test(correctedFrameParsed.en.prompt), 'English prompt still exposes the wrong model aspect ratio');
assert(!/\b(?:horizontal|landscape|widescreen)\b/i.test(correctedFrameParsed.en.prompt), 'English prompt still exposes wrong orientation');
assert(!/15\s*:\s*8/i.test(correctedFrameParsed.zh.prompt), 'Chinese prompt still exposes the wrong model aspect ratio');
assert(!/横版|横向|横屏|宽屏|宽幅|横构图/.test(correctedFrameParsed.zh.prompt), 'Chinese prompt still exposes wrong orientation');
assert(correctedFrameParsed.negative_prompt.includes('horizontal poster'), 'negative_prompt is missing corrected portrait drift blocker');
assert(correctedFrameParsed.negative_prompt.includes('wrong aspect ratio'), 'negative_prompt is missing corrected aspect blocker');
assert(!/vertical poster|portrait crop/i.test(correctedFrameParsed.negative_prompt), 'negative_prompt still blocks the real portrait source frame');
assert(
  !/vertical poster|portrait crop/i.test(correctedFrameParsed.json_prompt.generation_negative_prompt),
  'generation_negative_prompt still blocks the real portrait source frame'
);

const correctedGeneratorJson = JSON.parse(stringifyGeneratorJsonPrompt(correctedFrameParsed));
for (const field of [
  'prompt',
  'aspect_ratio',
  'prompt_core',
  'subject',
  'action_pose',
  'details_appearance',
  'environment_background',
  'lighting_atmosphere',
  'composition_framing',
  'style_camera',
  'quality_modifiers',
  'spatial_dynamics',
  'text_elements',
  'reconstruction_priorities',
  'style_tags'
]) {
  const serialized = JSON.stringify(correctedGeneratorJson[field]);
  assert(!/15\s*:\s*8/i.test(serialized), `generator JSON ${field} still exposes wrong aspect ratio`);
  assert(
    !/\b(?:horizontal|landscape|widescreen)\b/i.test(serialized),
    `generator JSON ${field} still exposes wrong orientation`
  );
}
assert(
  correctedGeneratorJson.negative_prompt.includes('horizontal poster'),
  'generator JSON negative_prompt is missing corrected portrait blocker'
);
assert(
  !/vertical poster|portrait crop/i.test(correctedGeneratorJson.negative_prompt),
  'generator JSON negative_prompt still blocks the real portrait source frame'
);

const looseModelJson = `
The requested object is:
\`\`\`json
{
  // Some model providers occasionally return JavaScript-like JSON.
  zh: { prompt: '中文提示词。', analysis: '中文分析。', },
  en: ${JSON.stringify(baseAnalysis.en, null, 2)},
  zh_style_tags: ${JSON.stringify(baseAnalysis.zh_style_tags)},
  en_style_tags: ${JSON.stringify(baseAnalysis.en_style_tags)},
  prompt_core: ${JSON.stringify(baseAnalysis.prompt_core)},
  negative_prompt: ${JSON.stringify(baseAnalysis.negative_prompt)},
  json_prompt: ${JSON.stringify(baseAnalysis.json_prompt, null, 2)},
}
\`\`\`
`;

const repairedParsed = parsePromptAnalysis(looseModelJson);
assert(repairedParsed.zh.prompt === baseAnalysis.zh.prompt, 'loose JSON repair did not preserve zh.prompt');
assert(repairedParsed.en.prompt === baseAnalysis.en.prompt, 'loose JSON repair did not preserve en.prompt');
assert(
  repairedParsed.json_prompt.generation_prompt.includes('Visible Chinese title'),
  'loose JSON repair did not preserve strengthened generation_prompt evidence'
);

console.log('json repair checks passed');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`json repair check failed: ${message}`);
    process.exit(1);
  }
}
