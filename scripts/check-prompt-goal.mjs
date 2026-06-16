import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const reversePromptPath = join(root, 'src/shared/reversePrompt.ts');
const typesPath = join(root, 'src/shared/types.ts');
const panelPath = join(root, 'src/content/panel.tsx');

const reversePromptSource = readFileSync(reversePromptPath, 'utf8');
const typesSource = readFileSync(typesPath, 'utf8');
const panelSource = readFileSync(panelPath, 'utf8');

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

const realPersonFidelityClause =
  'preserve natural skin texture, visible skin tone and undertone, face shape, facial proportions, hair texture, body proportions, pose, and everyday camera authenticity while keeping the image clear';

const contractChecks = [
  ['task is reconstruction, not captioning', 'visual reconstruction prompt writer'],
  ['explicitly blocks captions', 'Do not write a caption'],
  ['observe before writing', 'First observe the image, then write'],
  ['rules are writing standards, not fixed content', 'These rules describe how to write clearly'],
  ['blocks fixed templates', 'not a fixed template'],
  ['blocks forced categories', 'Do not force categories'],
  ['requires shared fact set across prompt and JSON', 'Natural-language prompts and json_prompt must be built from the same observed facts'],
  ['requires JSON to keep prompt facts', 'it should also appear in the appropriate json_prompt field'],
  ['blocks reasoning in prompt fields', 'Prompt fields are generation instructions, not reasoning'],
  ['keeps uncertainty out of generation prompts', 'uncertainty wording in analysis/json fields'],
  ['requires deterministic visual instructions', 'write a deterministic visual instruction'],
  ['blocks slash alternatives in generation prompts', 'slash alternatives'],
  ['uses neutral deterministic nouns for uncertain materials', 'neutral noun'],
  ['uses visible evidence only', 'Use only visible evidence'],
  ['allows strong visual recognition', 'strong visual recognition'],
  ['allows recognizable people and characters', 'known public person, fictional/anime/game/comic/movie character'],
  ['allows source work and event recognition', 'source work, event, landmark'],
  ['uses uncertainty language outside generation prompts', 'If a detail is uncertain'],
  ['uncertain details keep useful evidence', 'cautious wording in analysis/json fields instead of deleting the clue'],
  ['keeps output JSON-only', 'Return valid JSON only'],
  ['preserves exact top-level shape', 'Keep exactly this top-level shape'],
  ['sets recreation prompt as primary generation prompt', 'recreation_prompt is the primary generation prompt'],
  ['requires generator-neutral prompts', 'Do not include generator-specific syntax'],
  ['requires image-specific negative prompts', 'negative_prompt is image-specific'],
  ['limits negative prompt stacking', 'normally 8-24 items'],
  ['requires real-person appearance fidelity', 'face shape, facial proportions, skin tone depth and undertone'],
  ['allows cautious ancestry presentation', 'Ethnic or ancestry presentation is not a verified identity'],
  ['does not invent private names', 'For unknown private people, do not invent names'],
  ['requires surface relationship evidence', 'Describe surface relationships as observed'],
  ['requires body/object pattern surface reading', 'whether edges or seams are visible'],
  ['blocks invented conventional surface categories', 'Do not collapse ambiguous markings into a conventional object'],
  ['requires missing boundary evidence', 'missing boundary evidence'],
  ['requires regional surface description', 'Do not merge mixed surface evidence into one material'],
  ['keeps bare skin and navel when visible', 'bare skin, navel, paint'],
  ['requires style index definition', 'style_index means visual stylization intensity'],
  ['requires optional camera cue discipline', 'Camera and film vocabulary is optional'],
  ['blocks false metadata', 'Do not claim factual metadata unless visible'],
  ['requires material and texture language', 'visible materials, and surface behavior'],
  ['requires approximate hex color palette', 'approximate HEX colors with color name and visual role'],
  ['blocks bare generic colors', 'Do not output bare generic color names'],
  ['preserves original text language and script', 'Preserve original language and script'],
  ['blocks translating visible text', 'do not translate, romanize, paraphrase, replace, invent, or reorder visible text'],
  ['requires typography hierarchy and layout', 'position, size hierarchy, alignment'],
  ['preserves screenshots as captured objects', 'preserve the image as that object/capture'],
  ['defaults thumbnail inputs to clean readable reconstruction', 'clean readable version unless low fidelity is clearly intentional style'],
  ['requires adaptive clarity guidance', 'Add adaptive clarity/fidelity guidance'],
  ['protects source imperfections and texture', 'mirror marks, bathroom glass spots'],
  ['protects intentional paint strokes', 'paint strokes'],
  ['allows longer complete recreation prompts', 'usually 120-320 English words'],
  ['prevents JSON compression loss', 'do not remove load-bearing facts just to make them short'],
  ['requires real-person drift blockers', 'changed face/body/skin tone'],
  ['requires exact subject/object count where clear', 'Count people and repeated objects when clear'],
  ['locks spatial relationships when important', 'left/right/front/back, foreground/midground/background'],
  ['prefers concrete relationships over generic quality words', 'Prefer concrete nouns, exact relationships'],
  ['requires semicolon-style structured JSON fields', 'compact semicolon-separated clauses']
];

const simulatedCases = [
  {
    id: 'orbital_anime_energy',
    recreation:
      `Tatsumaki / Tornado of Terror from One Punch Man, one petite green-haired esper woman hovering high above Earth in a vertical 2:3 composition, oblique aerial viewpoint with the curved planet and soft cloud layers tilted beneath her; arms crossed, head lowered, hair streaming upward, fitted black long-sleeve dress with high collar, thigh slit, trailing scarf-like fabric, black heels. Soft atmospheric anime-CG hybrid, style_index 78/100, painterly diffuse finish, translucent teal psychic energy wisps and thin vertical light trails converging below her feet, restrained contrast, matte black fabric with soft leather-like surface. ${cleanQualityClause}`,
    core:
      'Tatsumaki from One Punch Man, green-haired esper hovering above tilted Earth, arms crossed, matte black dress, translucent teal energy trails, soft anime-CG style.',
    negative:
      'generic anime woman, wrong character, extra people, ground-level view, centered poster pose, smiling at camera, short hair, glossy latex outfit, oily skin, giant hair mass, thick neon beam, harsh HDR contrast, hyperreal satellite-map Earth texture, warm red magic, no Earth below, no vertical energy trails, unintended distortion',
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
      'matte black fabric with soft leather-like surface',
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
      'harsh HDR contrast',
      'hyperreal satellite-map Earth texture',
      'warm red magic',
      'no Earth below',
      'no vertical energy trails',
      'unintended distortion'
    ]
  },
  {
    id: 'monochrome_studio_portrait',
    recreation:
      'Vertical monochrome editorial studio portrait in a 3:5 crop, one young adult man seated low in a black leather lounge chair, centered in the lower frame, short dark spiked hair, round glasses, serious direct gaze, dark knit cardigan over black clothes, one arm on the chair and one hand draped over a raised knee, chunky black boot pushed toward camera; twin bright studio lamps on tall stands at far left and right, gray cracked plaster wall, small handwritten text above him, polished gray floor. Realistic editorial studio style, style_index 35/100, 35mm-50mm low-angle lens feel, deep-to-medium focus, controlled contrast, quiet negative space, preserve intentional cracked plaster texture while blocking unintended collapse or oily artifacts.',
    core:
      'Monochrome studio portrait of one seated man in a black leather chair, low framing, twin studio lamps, gray wall, boot toward camera.',
    negative:
      'extra people, missing studio lights, recentered headshot, smiling fashion pose, colorful palette, clean luxury backdrop, poster hero lighting, wrong chair material, cropped-out boots, cluttered props, text changed or oversized, shallow glamour blur, greasy texture, oily surface, unintended distortion',
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
      'greasy texture',
      'oily surface',
      'unintended distortion'
    ]
  },
  {
    id: 'chinese_concert_poster',
    recreation:
      `Wide 16:9 Luo Tianyi Chinese concert poster, preserve original Chinese text and do not translate or romanize it; top-left white logo text "洛天依 LUOTIANYI", large glowing aqua Chinese title "迎春归乐" centered across the lower middle, smaller lines "洛天依全国巡回演唱会", "杭州站", "6月19日19:00", and "全面开售" stacked below with the same hierarchy and position. Pastel blue-green garden fantasy illustration, white-haired anime girl left of center holding a vine staff, flowers, butterflies, doves, floating wooden crates, dark teal gradient lower band. Watercolor anime key visual, style_index 82/100, delicate brush texture, soft translucent glow, preserve text layout and original script. ${cleanQualityClause}`,
    core:
      'Luo Tianyi Chinese concert poster, original Chinese title and date preserved, pastel fantasy garden, white-haired anime girl, centered glowing typography.',
    negative:
      'translated English title, romanized Chinese, invented event text, changed date, changed time, moved title, oversized typography, missing Luo Tianyi logo, random letters, unreadable large title, wrong text language, text covering face, clean blank poster, single centered girl only, hard commercial UI layout, wrong aspect ratio, unintended distortion',
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
      'clean redesigned website, different website, full-page mockup, missing prompt overlay, wrong overlay position, enlarged fake UI text, translated UI labels, invented teams, wrong score, missing Sofascore logo, missing left sidebar, missing formation board, recentered composition, sharp vector dashboard, marketing landing page, wrong crop, thumbnail blur, compression artifacts',
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
      'compression artifacts'
    ]
  },
  {
    id: 'korean_soccer_body_paint_surface',
    recreation:
      `Vertical stadium fan portrait of one young adult East Asian-presenting woman on a football pitch at night, platinum-silver wavy hair, soft oval face, natural glossy skin with visible sweat, direct calm gaze, holding a soccer ball under her left arm while her right hand lifts a strand of hair. Upper chest has a tight white shoulder-strap top surface with Korean flag graphics, red-blue taegeuk circle, black trigram marks, a black-and-white shield tiger crest, and a small red-blue-white bow. Waist, exposed abdomen, navel, hips, and upper thighs show seamless body-contour white painted skin-tight surface with rough red, blue, and black brush-painted strokes following the body curves; keep wet shine, no separate jersey hem, no waistband, no shorts seam, no fabric fold, no loose garment edge. Korean flags, packed stadium crowd, green turf, white field line, large floodlights, shallow background blur. Realistic smartphone event-photo reconstruction, style_index 28/100, bright stadium lighting, preserve paint strokes, body contours, ball paint, national-color palette, and clean clear subject without oily plastic skin or over-sharpened artifacts.`,
    core:
      'Korean stadium fan portrait, silver-haired woman holding a soccer ball, white strap top plus seamless Korean flag body-painted waist and hip surface, floodlit football pitch.',
    negative:
      'single one-piece swimsuit, full printed bodysuit, separate crop-top jersey, separate shorts, visible waistband, fabric hem, clean printed uniform, missing exposed abdomen, missing navel, missing brush paint, wrong national colors, missing soccer ball, changed skin tone, different facial structure, altered body proportions, beauty-polished substitute face, plastic skin, empty stadium, wrong crop',
    jsonDetails:
      'platinum-silver wavy hair; soft oval face; glossy natural skin with sweat; upper chest has tight white strap top surface with Korean taegeuk circle, black trigrams, tiger crest and bow; waist, exposed abdomen, navel, hips and upper thighs show seamless body-contour painted white skin-tight surface with rough red blue black brush-painted strokes; no clear jersey hem, no waistband, no shorts seam, no loose fabric edge; soccer ball under left arm with matching paint marks',
    requiredAnchors: [
      'Vertical stadium fan portrait',
      'one young adult East Asian-presenting woman',
      'platinum-silver wavy hair',
      'natural glossy skin with visible sweat',
      'holding a soccer ball under her left arm',
      'tight white shoulder-strap top surface',
      'black-and-white shield tiger crest',
      'small red-blue-white bow',
      'Waist, exposed abdomen, navel, hips, and upper thighs',
      'seamless body-contour white painted skin-tight surface',
      'Korean flag graphics',
      'rough red, blue, and black brush-painted strokes',
      'no separate jersey hem',
      'waistband',
      'shorts seam',
      'fabric fold',
      'loose garment edge',
      'Korean flags',
      'packed stadium crowd',
      'large floodlights',
      'style_index 28/100',
      'preserve paint strokes',
      'without oily plastic skin'
    ],
    requiredJsonAnchors: [
      'brush-painted strokes',
      'upper chest has tight white strap top surface',
      'exposed abdomen',
      'navel',
      'body-contour painted white skin-tight surface',
      'no clear jersey hem',
      'no waistband',
      'no shorts seam',
      'soccer ball'
    ],
    requiredNegativeAnchors: [
      'single one-piece swimsuit',
      'full printed bodysuit',
      'separate crop-top jersey',
      'separate shorts',
      'visible waistband',
      'fabric hem',
      'clean printed uniform',
      'missing exposed abdomen',
      'missing navel',
      'missing brush paint',
      'wrong national colors',
      'missing soccer ball',
      'changed skin tone',
      'different facial structure',
      'altered body proportions',
      'beauty-polished substitute face',
      'plastic skin',
      'empty stadium',
      'wrong crop'
    ],
    forbiddenRecreationAnchors: [
      'body-painted or',
      'fabric or',
      'because',
      'describe it by visible evidence',
      'appears to be',
      'possibly',
      'maybe',
      'therefore',
      'should preserve',
      'one-piece athletic swimsuit'
    ]
  },
  {
    id: 'bathroom_mirror_selfie_real_people',
    recreation:
      `Square casual bathroom mirror selfie of two adult women standing side by side in front of a sink, both with dark messy high buns, warm tan skin tones with natural texture and visible undertones, East Asian-presenting facial features, oval-to-heart face shapes, dark eyes, soft makeup, slim athletic body proportions. The left woman holds a smartphone at chest height, wearing a white knotted crop T-shirt over pale pink bikini bottoms with a navel piercing; the right woman brushes her teeth, wearing an oversized white T-shirt lifted at the waist and leopard bikini bottom. Cream tile bathroom, black door on the left, white shower curtain on the right, cluttered sink counter and mirror specks preserved. Smartphone mirror-selfie realism, style_index 12/100, warm indoor bathroom light. ${realPersonFidelityClause}.`,
    core:
      'Two adult women in a casual bathroom mirror selfie, warm tan skin, dark messy buns, white tops, bikini bottoms, phone and toothbrush, sink clutter.',
    negative:
      'changed skin tone, different facial structure, altered body proportions, beauty-polished substitute face, changed ethnic/ancestry presentation, commercial glamour retouching, plastic skin, over-smoothed skin, studio fashion shoot, luxury hotel bathroom, missing mirror specks, removed counter clutter, wrong clothing, changed poses, extra people, missing phone, missing toothbrush, recentered portrait',
    requiredAnchors: [
      'Square casual bathroom mirror selfie',
      'two adult women',
      'dark messy high buns',
      'warm tan skin tones',
      'natural texture',
      'visible undertones',
      'East Asian-presenting',
      'oval-to-heart face shapes',
      'soft makeup',
      'slim athletic body proportions',
      'white knotted crop T-shirt',
      'pale pink bikini bottoms',
      'navel piercing',
      'brushes her teeth',
      'oversized white T-shirt',
      'leopard bikini bottom',
      'cluttered sink counter and mirror specks preserved',
      'Smartphone mirror-selfie realism',
      'style_index 12/100',
      realPersonFidelityClause
    ],
    requiredNegativeAnchors: [
      'changed skin tone',
      'different facial structure',
      'altered body proportions',
      'beauty-polished substitute face',
      'changed ethnic/ancestry presentation',
      'commercial glamour retouching',
      'plastic skin',
      'over-smoothed skin',
      'studio fashion shoot',
      'luxury hotel bathroom',
      'missing mirror specks',
      'removed counter clutter',
      'wrong clothing',
      'changed poses',
      'missing phone',
      'missing toothbrush'
    ]
  },
  {
    id: 'casual_phone_photo_no_forced_cinema',
    recreation:
      `Horizontal casual smartphone photo of one adult person at a small kitchen table, relaxed posture, ordinary home clutter, warm overhead light, visible medium skin tone and natural skin texture, simple dark hair, casual T-shirt, half-eaten bowl and cup in the foreground, fridge magnets and cabinets in the background. Literal documentary phone snapshot, style_index 8/100, no luxury editorial polish, preserve the slightly uneven indoor exposure and everyday composition. ${realPersonFidelityClause}.`,
    core:
      'Casual smartphone kitchen snapshot of one adult person, natural skin texture, home clutter, warm overhead light, everyday composition.',
    negative:
      'changed skin tone, different facial structure, altered body proportions, beauty-polished substitute face, commercial glamour retouching, plastic skin, studio portrait lighting, fashion editorial pose, ALEXA-like color grade, cinema camera look, black mist diffusion, IMAX framing, luxury restaurant setting, removed home clutter, exaggerated bokeh, extra people',
    requiredAnchors: [
      'Horizontal casual smartphone photo',
      'one adult person',
      'ordinary home clutter',
      'warm overhead light',
      'visible medium skin tone',
      'natural skin texture',
      'Literal documentary phone snapshot',
      'style_index 8/100',
      'no luxury editorial polish',
      'everyday composition',
      realPersonFidelityClause
    ],
    requiredNegativeAnchors: [
      'changed skin tone',
      'different facial structure',
      'altered body proportions',
      'beauty-polished substitute face',
      'commercial glamour retouching',
      'studio portrait lighting',
      'fashion editorial pose',
      'ALEXA-like color grade',
      'cinema camera look',
      'black mist diffusion',
      'IMAX framing',
      'removed home clutter',
      'exaggerated bokeh'
    ],
    forbiddenRecreationAnchors: [
      'ALEXA-like',
      'cinema camera',
      'IMAX',
      'black mist diffusion',
      '85mm portrait compression'
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

assert(systemPrompt.length >= 5500, 'system prompt is unexpectedly short for the reconstruction contract.');
assert(systemPrompt.length <= 12500, 'system prompt is unexpectedly long; keep the runtime prompt compact enough for API use.');
assert(!panelSource.includes('analysis[tab].prompt}\\n\\n${analysis[tab].analysis'), 'language tab output must not concatenate prompt and analysis.');
assert(panelSource.includes('return analysis[tab].prompt;'), 'language tab output should display/copy only the prompt text.');

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
console.log(`- simulated human cases: ${simulatedCases.length}`);

function checkPromptSample(testCase) {
  const recreationWords = wordCount(testCase.recreation);
  const coreWords = wordCount(testCase.core);
  const negativeItems = testCase.negative.split(',').map((item) => item.trim()).filter(Boolean);

  assert(recreationWords >= 70 && recreationWords <= 380, `${testCase.id}: recreation_prompt should be complete without becoming rambling, got ${recreationWords}`);
  assert(coreWords >= 16 && coreWords <= 45, `${testCase.id}: prompt_core should stay compressed, got ${coreWords}`);
  assert(negativeItems.length >= 8 && negativeItems.length <= 24, `${testCase.id}: negative_prompt needs 8-24 image-specific drift blockers, got ${negativeItems.length}.`);
  assert(!hasGeneratorSyntax(testCase.recreation), `${testCase.id}: recreation_prompt contains generator-specific syntax.`);
  assert(!hasGeneratorSyntax(testCase.core), `${testCase.id}: prompt_core contains generator-specific syntax.`);
  assert(!hasPromptLabels(testCase.recreation), `${testCase.id}: recreation_prompt contains section labels.`);
  assert(!hasPromptLabels(testCase.core), `${testCase.id}: prompt_core contains section labels.`);
  assert(!hasPromptReasoning(testCase.recreation), `${testCase.id}: recreation_prompt contains reasoning or uncertainty wording.`);
  assert(!hasPromptReasoning(testCase.core), `${testCase.id}: prompt_core contains reasoning or uncertainty wording.`);

  for (const anchor of testCase.requiredAnchors) {
    assert(includesInsensitive(testCase.recreation, anchor), `${testCase.id}: recreation_prompt missing anchor "${anchor}"`);
  }
  for (const anchor of testCase.requiredJsonAnchors || []) {
    assert(testCase.jsonDetails, `${testCase.id}: requiredJsonAnchors were provided without jsonDetails.`);
    assert(includesInsensitive(testCase.jsonDetails || '', anchor), `${testCase.id}: json_prompt sample missing load-bearing anchor "${anchor}"`);
  }
  for (const anchor of testCase.requiredNegativeAnchors) {
    assert(includesInsensitive(testCase.negative, anchor), `${testCase.id}: negative_prompt missing blocker "${anchor}"`);
  }
  for (const anchor of testCase.forbiddenRecreationAnchors || []) {
    assert(!includesInsensitive(testCase.recreation, anchor), `${testCase.id}: recreation_prompt should not include "${anchor}"`);
  }
}

function hasGeneratorSyntax(text) {
  return /(?:^|\s)--(?:ar|s|raw|iw|no)\b|\bBREAK\b|<lora:|\[[^\]]+\]|\([^)]*\)|::\d/i.test(text);
}

function hasPromptLabels(text) {
  return /\b(?:Subject|Lighting|Composition|Style|Camera|Negative):/i.test(text);
}

function hasPromptReasoning(text) {
  return /\b(?:because|therefore|possibly|maybe|might|may|appears to be|should preserve|needs to keep)\b|可能|或者|因此|需保留|[\p{Script=Han}A-Za-z-]+\/[\p{Script=Han}A-Za-z-]+/iu.test(text);
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
