import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const reversePromptPath = join(root, 'src/shared/reversePrompt.ts');
const typesPath = join(root, 'src/shared/types.ts');

const reversePromptSource = readFileSync(reversePromptPath, 'utf8');
const typesSource = readFileSync(typesPath, 'utf8');

const promptMatch = reversePromptSource.match(/export const REVERSE_PROMPT_SYSTEM = `([\s\S]*?)`;/);
if (!promptMatch) fail('REVERSE_PROMPT_SYSTEM template literal was not found.');

const systemPrompt = promptMatch[1];

const topLevelKeys = [
  '"zh"',
  '"en"',
  '"ja"',
  '"zh_style_tags"',
  '"en_style_tags"',
  '"ja_style_tags"',
  '"json_prompt"',
  '"recreation_prompt"',
  '"prompt_core"',
  '"negative_prompt"'
];

const jsonPromptKeys = [
  '"subject"',
  '"action_pose"',
  '"details_appearance"',
  '"environment_background"',
  '"lighting_atmosphere"',
  '"composition_framing"',
  '"style_camera"',
  '"colors"',
  '"materials"',
  '"aspect_ratio"',
  '"quality_modifiers"',
  '"likely_generation_intent"'
];

const cleanQualityClause =
  'clean and transparent image, complete and natural materials, smooth and uniform texture, clear main subject, distinct background layers, avoid excessive sharpening, color spots, unwanted noise, cracks, collapse, and distortion';

const contractChecks = [
  ['task is reconstruction, not captioning', 'visual reconstruction prompt writer'],
  ['explicitly blocks captions', 'Do not write a caption'],
  ['uses visible evidence only', 'Use only visible evidence'],
  ['does not flatten recognizable anchors', 'Do not flatten recognizable anchors'],
  ['allows recognizable people and characters', 'known person, fictional/anime/game/comic/movie character'],
  ['allows source work and story recognition', 'source work, story/franchise'],
  ['uses uncertainty language for plausible recognition', 'appears to be'],
  ['keeps output JSON-only', 'Return valid JSON only'],
  ['preserves exact top-level shape', 'Keep exactly this top-level shape'],
  ['sets recreation prompt as primary generation prompt', 'recreation_prompt is the primary generation prompt'],
  ['requires generator-neutral prompts', 'Do not include generator-specific syntax'],
  ['requires image-specific negative prompts', 'negative_prompt must be image-specific'],
  ['requires style index definition', 'style_index means visual stylization intensity'],
  ['requires professional camera cue discipline', 'Use professional visual language only when it helps reconstruction'],
  ['requires material and texture locks', 'Describe the most important surface behavior'],
  ['requires approximate hex color palette', 'approximate standard HEX colors plus color name and visual role'],
  ['blocks bare generic colors', 'do not output bare generic names'],
  ['preserves original text language and script', 'preserve the original language and script'],
  ['blocks translating visible text', 'Do not translate, romanize, paraphrase, replace, invent, or reorder visible text'],
  ['requires typography hierarchy and layout', 'state text position, scale, hierarchy, alignment, spacing'],
  ['preserves screenshots as screenshots', 'describe them as screenshots, not redesigned app concepts'],
  ['defaults thumbnail inputs to clean readable reconstruction', 'Reconstruct a clean readable version by default'],
  ['blocks preserving thumbnail blur', 'do not preserve thumbnail blur, compression artifacts, or accidental low-resolution input'],
  ['prevents clean website redesign drift', 'Do not replace the visible UI with a polished redesign or different website'],
  ['adds adaptive quality guidance', 'Add adaptive quality guidance'],
  ['requires clean source quality clause', 'For ordinary clean or smooth source images'],
  ['protects intentional source texture', 'do not add the clean/smooth quality clause that would erase that style'],
  ['requires ordered recreation prompt', 'Use this order for recreation_prompt'],
  ['requires quality blockers in negative prompt', 'excessive sharpening, color spots, unwanted noise, thumbnail blur, compression artifacts, accidental low resolution'],
  ['requires exact subject/object count where clear', 'Count people and repeated objects exactly'],
  ['locks spatial relationships when important', 'Lock left/right/front/back and foreground/midground/background'],
  ['requires distinctive composition details', 'If composition is distinctive'],
  ['requires optical motion detail', 'If motion or optical effects are visible'],
  ['prefers concrete geometry over generic quality words', 'Prefer concrete nouns, geometry, visible relationships, and material behavior'],
  ['requires semicolon-style structured JSON fields', 'short semicolon-separated clauses']
];

const reconstructionPriority = [
  'recognizable person, character, work, story, scene, location, or visual-culture anchor when supported',
  'visible text, original language/script, typography hierarchy, and UI/layout positions',
  'aspect ratio, crop, subject scale, and negative space',
  'subject count and relative positions',
  'camera geometry, lens feel, viewpoint, and perspective',
  'action, pose, gaze, motion blur, and focus plane',
  'foreground, midground, background anchors, props, and spatial depth',
  'lighting source, direction, contrast, color temperature, haze, and atmosphere',
  'material finish, texture, reflectivity, translucency, and surface behavior',
  'medium, style family, brushwork/render finish, post-processing, and style_index'
];

const simulatedCases = [
  {
    id: 'orbital_anime_energy',
    recreation:
      `Tatsumaki / Tornado of Terror from One Punch Man, one petite green-haired esper woman hovering high above Earth in a vertical 2:3 composition, oblique aerial viewpoint with the curved planet and soft cloud layers tilted beneath her; arms crossed, head lowered, hair streaming upward, fitted black long-sleeve dress with high collar, thigh slit, trailing scarf-like fabric, black heels. Soft atmospheric anime-CG hybrid, style_index 78/100, painterly diffuse finish, translucent teal psychic energy wisps and thin vertical light trails converging below her feet, restrained contrast, matte black fabric/soft leather surface. ${cleanQualityClause}`,
    core:
      'Tatsumaki from One Punch Man, green-haired esper hovering above tilted Earth, arms crossed, matte black dress, translucent teal energy trails, soft anime-CG style.',
    negative:
      'generic anime woman, wrong character, extra people, different subject count, ground-level view, centered poster pose, smiling face, looking at camera, short hair, glossy latex outfit, oily skin, giant hair mass, thick neon beam, harsh sun flare, hard HDR contrast, hyperreal satellite-map Earth texture, starfield background, warm red magic, wings, weapons, city background, indoor scene, flat horizon, no Earth below, no vertical energy trails, excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts',
    requiredAnchors: [
      'Tatsumaki',
      'One Punch Man',
      'vertical 2:3',
      'one petite green-haired esper woman',
      'high above Earth',
      'oblique aerial viewpoint',
      'arms crossed',
      'black long-sleeve dress',
      'Soft atmospheric anime-CG hybrid',
      'style_index 78/100',
      'painterly diffuse finish',
      'translucent teal psychic energy wisps',
      'matte black fabric/soft leather surface',
      'vertical light trails',
      'converging below her feet',
      cleanQualityClause
    ],
    requiredNegativeAnchors: [
      'generic anime woman',
      'wrong character',
      'extra people',
      'ground-level view',
      'centered poster pose',
      'glossy latex outfit',
      'oily skin',
      'giant hair mass',
      'thick neon beam',
      'harsh sun flare',
      'hard HDR contrast',
      'hyperreal satellite-map Earth texture',
      'warm red magic',
      'no Earth below',
      'no vertical energy trails',
      'excessive sharpening',
      'color spots',
      'noise',
      'cracks',
      'collapse',
      'distortion',
      'greasy texture',
      'oily surface',
      'grainy artifacts'
    ]
  },
  {
    id: 'monochrome_studio_portrait',
    recreation:
      'Vertical monochrome editorial studio portrait in a 3:5 crop, one young adult man seated low in a black leather lounge chair, centered in the lower frame, short dark spiked hair, round glasses, serious direct gaze, dark knit cardigan over black clothes, one arm on the chair and one hand draped over a raised knee, chunky black boot pushed toward camera; twin bright studio lamps on tall stands at far left and right, gray cracked plaster wall, small handwritten text above him, polished gray floor. Realistic editorial studio style, style_index 35/100, 35mm-50mm low-angle lens feel, deep-to-medium focus, controlled contrast, quiet negative space, preserve intentional cracked plaster texture while blocking unintended collapse or oily artifacts.',
    core:
      'Monochrome studio portrait of one seated man in a black leather chair, low framing, twin studio lamps, gray wall, boot toward camera.',
    negative:
      'extra people, missing studio lights, recentered headshot, smiling fashion pose, colorful palette, clean luxury backdrop, poster hero lighting, wrong chair material, cropped-out boots, cluttered props, text changed or oversized, shallow glamour blur, excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts',
    requiredAnchors: [
      'Vertical monochrome',
      '3:5 crop',
      'one young adult man',
      'seated low',
      'black leather lounge chair',
      'centered in the lower frame',
      'round glasses',
      'chunky black boot pushed toward camera',
      'twin bright studio lamps',
      'gray cracked plaster wall',
      'style_index 35/100',
      '35mm-50mm low-angle lens feel',
      'deep-to-medium focus',
      'preserve intentional cracked plaster texture'
    ],
    requiredNegativeAnchors: [
      'extra people',
      'missing studio lights',
      'recentered headshot',
      'colorful palette',
      'wrong chair material',
      'cropped-out boots',
      'excessive sharpening',
      'color spots',
      'noise',
      'cracks',
      'collapse',
      'distortion',
      'greasy texture',
      'oily surface',
      'grainy artifacts'
    ]
  },
  {
    id: 'chinese_concert_poster',
    recreation:
      `Wide 16:9 Luo Tianyi Chinese concert poster, preserve original Chinese text and do not translate or romanize it; top-left white logo text "洛天依 LUOTIANYI", large glowing aqua Chinese title "迎春归乐" centered across the lower middle, smaller lines "洛天依全国巡回演唱会", "杭州站", "6月19日19:00", and "全面开售" stacked below with the same hierarchy and position. Pastel blue-green garden fantasy illustration, white-haired anime girl left of center holding a vine staff, flowers, butterflies, doves, floating wooden crates, dark teal gradient lower band. Watercolor anime key visual, style_index 82/100, delicate brush texture, soft translucent glow, preserve text layout and original script. ${cleanQualityClause}`,
    core:
      'Luo Tianyi Chinese concert poster, original Chinese title and date preserved, pastel fantasy garden, white-haired anime girl, centered glowing typography.',
    negative:
      'translated English title, romanized Chinese, invented event text, changed date, changed time, moved title, oversized typography, missing Luo Tianyi logo, random letters, unreadable large title, wrong text language, text covering face, clean blank poster, single centered girl only, hard commercial UI layout, wrong aspect ratio, excessive sharpening, color spots, noise, artifact cracks, structural collapse, unintended distortion, greasy texture, oily surface, grainy artifacts',
    requiredAnchors: [
      'Wide 16:9',
      'Luo Tianyi',
      'preserve original Chinese text',
      'do not translate or romanize',
      '"洛天依 LUOTIANYI"',
      '"迎春归乐"',
      '"洛天依全国巡回演唱会"',
      '"杭州站"',
      '"6月19日19:00"',
      '"全面开售"',
      'large glowing aqua Chinese title',
      'centered across the lower middle',
      'style_index 82/100',
      'preserve text layout and original script',
      cleanQualityClause
    ],
    requiredNegativeAnchors: [
      'translated English title',
      'romanized Chinese',
      'invented event text',
      'changed date',
      'changed time',
      'moved title',
      'oversized typography',
      'missing Luo Tianyi logo',
      'wrong text language',
      'text covering face',
      'wrong aspect ratio',
      'excessive sharpening',
      'color spots',
      'noise',
      'artifact cracks',
      'structural collapse',
      'unintended distortion'
    ]
  },
  {
    id: 'sports_dashboard_screenshot_overlay',
    recreation:
      `Wide browser screenshot reconstruction of a dark Sofascore football match dashboard with a Zhijuan Prompt Card floating panel overlay on the right; preserve the screenshot crop, page layout, visible Chinese UI labels, right-side overlay z-order, and recreate a clean readable version rather than thumbnail blur or compression artifacts. Top dark navigation with Sofascore logo and sports icons, left sidebar of leagues, center Belgium versus Egypt 0-0 live scoreboard and formation board, right column ad and match events partly covered by the prompt panel. UI screenshot medium, style_index 12/100, dark teal-black interface, crisp readable controls, same relative UI geometry, not a polished redesign or different website. ${cleanQualityClause}`,
    core:
      'Clean readable Sofascore browser screenshot reconstruction with Zhijuan Prompt Card overlay, dark UI, Belgium versus Egypt scoreboard, preserve crop and UI layout.',
    negative:
      'clean redesigned website, different website, full-page mockup, missing prompt overlay, wrong overlay position, enlarged fake UI text, translated UI labels, invented teams, wrong score, missing Sofascore logo, missing left sidebar, missing formation board, recentered composition, sharp vector dashboard, marketing landing page, wrong crop, thumbnail blur, compression artifacts, accidental low resolution, excessive sharpening, color spots, noise, artifact cracks, structural collapse, unintended distortion, greasy texture, oily surface, grainy artifacts',
    requiredAnchors: [
      'Wide browser screenshot reconstruction',
      'dark Sofascore football match dashboard',
      'Zhijuan Prompt Card floating panel overlay on the right',
      'preserve the screenshot crop',
      'page layout',
      'visible Chinese UI labels',
      'right-side overlay z-order',
      'recreate a clean readable version',
      'rather than thumbnail blur or compression artifacts',
      'Belgium versus Egypt 0-0',
      'formation board',
      'style_index 12/100',
      'crisp readable controls',
      'same relative UI geometry',
      'not a polished redesign or different website',
      cleanQualityClause
    ],
    requiredNegativeAnchors: [
      'clean redesigned website',
      'different website',
      'full-page mockup',
      'missing prompt overlay',
      'wrong overlay position',
      'translated UI labels',
      'invented teams',
      'wrong score',
      'missing Sofascore logo',
      'missing left sidebar',
      'missing formation board',
      'sharp vector dashboard',
      'marketing landing page',
      'wrong crop',
      'thumbnail blur',
      'compression artifacts',
      'accidental low resolution',
      'excessive sharpening',
      'color spots',
      'noise',
      'artifact cracks',
      'structural collapse',
      'unintended distortion'
    ]
  }
];

const failures = [];

for (const key of topLevelKeys) {
  assert(systemPrompt.includes(key), `system prompt missing output key ${key}`);
  assert(typesSource.includes(stripQuotes(key)), `PromptAnalysis type missing key ${key}`);
}

for (const key of jsonPromptKeys) {
  assert(systemPrompt.includes(key), `system prompt missing json_prompt key ${key}`);
  assert(typesSource.includes(stripQuotes(key)), `PromptAnalysis.json_prompt type missing key ${key}`);
}

for (const [label, needle] of contractChecks) {
  assert(systemPrompt.includes(needle), `contract check failed: ${label}`);
}

for (const priority of reconstructionPriority) {
  assert(systemPrompt.includes(priority), `reconstruction priority missing: ${priority}`);
}

assert(systemPrompt.length >= 5500, 'system prompt is unexpectedly short for the reconstruction contract.');
assert(systemPrompt.length <= 12000, 'system prompt is unexpectedly long; keep the runtime prompt compact enough for API use.');

for (const testCase of simulatedCases) {
  checkPromptSample(testCase);
}

if (failures.length) {
  console.error('prompt goal check failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('prompt goal check passed');
console.log(`- contract rules: ${contractChecks.length}`);
console.log(`- reconstruction priorities: ${reconstructionPriority.length}`);
console.log(`- simulated human cases: ${simulatedCases.length}`);

function checkPromptSample(testCase) {
  const recreationWords = wordCount(testCase.recreation);
  const coreWords = wordCount(testCase.core);
  const negativeItems = testCase.negative.split(',').map((item) => item.trim()).filter(Boolean);

  assert(recreationWords >= 70 && recreationWords <= 190, `${testCase.id}: recreation_prompt should stay near 70-180 words plus adaptive quality guidance, got ${recreationWords}`);
  assert(coreWords >= 18 && coreWords <= 40, `${testCase.id}: prompt_core should stay compressed, got ${coreWords}`);
  assert(negativeItems.length >= 8, `${testCase.id}: negative_prompt needs image-specific drift blockers.`);
  assert(!hasGeneratorSyntax(testCase.recreation), `${testCase.id}: recreation_prompt contains generator-specific syntax.`);
  assert(!hasGeneratorSyntax(testCase.core), `${testCase.id}: prompt_core contains generator-specific syntax.`);
  assert(!hasPromptLabels(testCase.recreation), `${testCase.id}: recreation_prompt contains section labels.`);
  assert(!hasPromptLabels(testCase.core), `${testCase.id}: prompt_core contains section labels.`);

  for (const anchor of testCase.requiredAnchors) {
    assert(includesInsensitive(testCase.recreation, anchor), `${testCase.id}: recreation_prompt missing anchor "${anchor}"`);
  }
  for (const anchor of testCase.requiredNegativeAnchors) {
    assert(includesInsensitive(testCase.negative, anchor), `${testCase.id}: negative_prompt missing blocker "${anchor}"`);
  }
}

function hasGeneratorSyntax(text) {
  return /(?:^|\s)--(?:ar|s|raw|iw|no)\b|\bBREAK\b|<lora:|\[[^\]]+\]|\([^)]*\)|::\d/i.test(text);
}

function hasPromptLabels(text) {
  return /\b(?:Subject|Lighting|Composition|Style|Camera|Negative):/i.test(text);
}

function includesInsensitive(text, needle) {
  return text.toLowerCase().includes(needle.toLowerCase());
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripQuotes(value) {
  return value.replaceAll('"', '');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function fail(message) {
  console.error(`prompt goal check failed: ${message}`);
  process.exit(1);
}
