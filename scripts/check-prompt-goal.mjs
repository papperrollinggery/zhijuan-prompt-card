import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const reversePromptPath = join(root, 'src/shared/reversePrompt.ts');
const typesPath = join(root, 'src/shared/types.ts');
const panelPath = join(root, 'src/content/panel.tsx');
const popupHistoryPath = join(root, 'src/popup/HistoryView.tsx');
const historyDisplayPath = join(root, 'src/shared/historyDisplay.ts');
const jsonRepairPath = join(root, 'src/shared/jsonRepair.ts');
const imageDataPath = join(root, 'src/shared/imageData.ts');
const packageJsonPath = join(root, 'package.json');
const jsonRepairTestPath = join(root, 'scripts/check-json-repair.ts');
const manualRealTestPath = join(root, 'scripts/manual-real-extension-test.mjs');
const realStructureAuditPath = join(root, 'scripts/real-image-structural-audit.ts');
const realJsonAuditPath = join(root, 'scripts/real-image-json-readiness-audit.ts');
const installedAcceptancePath = join(root, 'docs/installed-extension-acceptance.md');

const reversePromptSource = readFileSync(reversePromptPath, 'utf8');
const typesSource = readFileSync(typesPath, 'utf8');
const panelSource = readFileSync(panelPath, 'utf8');
const popupHistorySource = readFileSync(popupHistoryPath, 'utf8');
const historyDisplaySource = readFileSync(historyDisplayPath, 'utf8');
const jsonRepairSource = readFileSync(jsonRepairPath, 'utf8');
const imageDataSource = readFileSync(imageDataPath, 'utf8');
const packageJsonSource = readFileSync(packageJsonPath, 'utf8');
const jsonRepairTestSource = readFileSync(jsonRepairTestPath, 'utf8');
const manualRealTestSource = readFileSync(manualRealTestPath, 'utf8');
const realStructureAuditSource = readFileSync(realStructureAuditPath, 'utf8');
const realJsonAuditSource = readFileSync(realJsonAuditPath, 'utf8');
const installedAcceptanceSource = readFileSync(installedAcceptancePath, 'utf8');

const promptMatch = reversePromptSource.match(/export const REVERSE_PROMPT_SYSTEM = `([\s\S]*?)`;/);
if (!promptMatch) fail('REVERSE_PROMPT_SYSTEM template literal was not found.');

const systemPrompt = promptMatch[1];
const failures = [];

const topLevelKeys = [
  '"zh"',
  '"en"',
  '"zh_style_tags"',
  '"en_style_tags"',
  '"json_prompt"',
  '"prompt_core"',
  '"negative_prompt"'
];

const jsonPromptKeys = [
  '"schema_version"',
  '"summary"',
  '"generation_prompt"',
  '"generation_negative_prompt"',
  '"spatial_dynamics"',
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
  '"fidelity_priorities"',
  '"global_fingerprint"',
  '"observation_units"',
  '"text_elements"',
  '"reconstruction_priorities"',
  '"likely_generation_intent"'
];

const contractChecks = [
  ['source fidelity is first-class', 'Source fidelity first'],
  ['aesthetic fingerprint is first-class', 'Aesthetic fingerprint'],
  ['observed facts are still required', 'Observed facts'],
  ['output discipline is retained', 'Output discipline'],
  ['quality is conditional', 'Quality only when source supports it'],
  ['visual fingerprint vocabulary covers soft focus', 'soft focus'],
  ['visual fingerprint vocabulary covers foreground blur', 'foreground blur'],
  ['visual fingerprint vocabulary covers volumetric light', 'volumetric or Tyndall light'],
  ['visual fingerprint vocabulary covers compression texture', 'compression texture'],
  ['recognizable anchors retained', 'known public person, fictional/anime/game/comic/movie character'],
  ['private identity is not invented', 'For unknown private people, do not invent names'],
  ['real-person appearance fidelity retained', 'skin tone depth and undertone'],
  ['ancestry presentation is cautious but allowed', 'Ethnic or ancestry presentation is not verified identity'],
  ['visible text original language retained', 'Preserve original language and script'],
  ['text translation blocked', 'do not translate, romanize, paraphrase, replace, invent, or reorder text'],
  ['ambiguous text is not over-confirmed', 'ambiguous glyphs are partial unless every character is unambiguous'],
  ['JSON exact text quotes require clear text elements', 'generation_prompt may quote exact text only from clear text_elements'],
  ['screenshot and UI fidelity retained', 'preserve the image as that object or capture'],
  ['surface relationship fidelity retained', 'For surface relationships, describe what is visible'],
  ['ambiguous surfaces use one target', 'Use one clear generation target, not alternatives'],
  ['style_index retained', 'style_index means visual stylization intensity'],
  ['camera language remains cue-only', 'visual reconstruction cues, not factual metadata'],
  ['HEX color palette retained', 'approximate HEX colors with color name and visual role'],
  ['JSON must not drop key facts', 'keep load-bearing facts'],
  ['JSON generation field is copy-ready', 'generation_prompt may be copied directly into generators'],
  ['JSON generation prompt is continuous', 'generation_prompt must be a continuous generation-ready paragraph'],
  ['JSON generation prompt is strongest input', 'strongest high-fidelity generation input'],
  ['JSON generation prompt compiles evidence', 'compiling all source-defining observation_units, text_elements, reconstruction_priorities, global_fingerprint, and spatial_dynamics'],
  ['JSON generation prompt is not weaker than English', 'must not be weaker than en.prompt'],
  ['JSON negative prompt mirrors top-level negative', 'generation_negative_prompt must mirror negative_prompt'],
  ['JSON negative prompt compiles high-priority drift blockers', 'include high-priority avoid_drift, risk_if_missing, missing text, motion, material, boundary blockers'],
  ['JSON dynamic relationships are not array-only', 'Do not leave motion, floating/suspended objects, contact/support, z-depth, text placement, material/surface behavior, optical finish, or occlusion only in arrays'],
  ['fidelity priorities are plain-language controls', 'fidelity_priorities are plain-language reconstruction priorities'],
  ['fidelity priorities use 0-100 wording', 'priority N of 100'],
  ['high-priority fidelity must reach English prompt', 'Every high-priority fidelity item must be compiled into en.prompt'],
  ['dynamic reconstruction schema retained', 'reconstruction_v2'],
  ['global fingerprint is first-class', 'global_fingerprint'],
  ['dynamic observation units are required', 'Choose observation_units dynamically'],
  ['observation units avoid image-type templates', 'Do not force image-type templates'],
  ['source-defining skeleton enters English prompt', 'source-defining reconstruction skeleton'],
  ['layout skeleton appears before local detail', 'Compile this skeleton into the first third of en.prompt'],
  ['boundary clarity is source-dependent', 'Preserve boundary clarity as observed'],
  ['local detail cannot crowd out structure', 'Local objects must not crowd out the source-defining structure'],
  ['detail budget controls dense prompts', 'Use detail_budget observation units'],
  ['priority values are plain JSON ranking', 'priority is a plain JSON ranking from 0 to 100'],
  ['high-priority observations compile to English prompt', 'Every observation or reconstruction priority at 85 or higher must appear in en.prompt'],
  ['reconstruction tradeoffs are explicit', 'Use reconstruction_priorities to express visual tradeoffs'],
  ['visible text elements are structured', 'Use text_elements for visible text'],
  ['generator handoff avoids reference-image wrapper requests', 'Do not use source image, reference image, or recreate this image as wrapper wording'],
  ['exact visible source/reference words are allowed', 'If those words are exact legible visible text, quote-preserve them'],
  ['English prompt can scale to reconstruction need', 'no fixed word cap'],
  ['dense sources can expand as needed', 'should expand as needed'],
  ['dense sources must not be over-compressed', 'Do not squeeze load-bearing structure into a generic archetype'],
  ['negative prompt is image-specific', 'negative_prompt is image-specific'],
  ['nonlinear geometry drift is blocked in negative prompt', 'block straightened bands, rectangular panels, uniform grids, equalized zones, and lost boundary lines'],
  ['source blur is not blocked globally', 'Do not put blur, grain, haze, bloom, low resolution'],
  ['soft-source blockers target polish drift', 'over-sharpened face, glossy AI skin, hyper-detailed eyes'],
  ['cleanliness guidance is conditional', 'For genuinely clean/smooth/high-clarity sources'],
  ['generator syntax blocked', 'Do not include generator-specific syntax'],
  ['JSON generation prompt generator syntax blocked', 'json_prompt.generation_prompt, json_prompt.generation_negative_prompt']
];

const forbiddenSystemPatterns = [
  ['global always include quality language', /\balways include\b/i],
  ['default ultra clear language', /\bultra clear\b/i],
  ['default highly detailed language', /\bhighly detailed\b/i],
  ['default sharp face language', /\bsharp face\b/i],
  ['default smooth skin language', /\bsmooth skin\b/i],
  ['default clean studio language', /\bclean studio\b(?! lighting)/i],
  ['forced all images to be crisp', /\bmust be crisp\b/i],
  ['forced all images to be sharp', /\bmust be sharp\b/i],
  ['forced all images to be clean', /\bmust be clean\b/i]
];

const simulatedCases = [
  {
    id: 'purple_soft_focus_anime',
    recreation:
      'Soft-focus vertical anime portrait with low contrast and hazy violet light, one pale young woman with long deep-purple hair turning over her shoulder, partially obscured eyes under loose bangs, distant unfocused gaze, muted lips, translucent pale fabric over the shoulder, drifting petal shapes in the blurred foreground. The crop is narrow and intimate, face placed high center-left, hair and foreground petals creating a veil over the image. Preserve the dreamlike film blur, violet bloom, dappled light on the cheek and shoulder, shallow depth of field, dim lavender shadows, and compressed small-reference softness rather than upgrading into a crisp glossy illustration. style_index 74 out of 100, atmospheric anime painterly realism with soft edges and low-detail shadow gradients.',
    core:
      'Soft-focus violet anime portrait, purple-haired woman turning over shoulder, partially obscured eyes, hazy bloom, petal foreground blur, low-contrast painterly realism.',
    negative:
      'sharp glossy anime face, hyper-detailed eyes, commercial beauty retouching, clean studio lighting, high-contrast HDR, plastic skin, over-sharpened hair strands, saturated neon purple, centered poster face, wide landscape crop, missing foreground blur, missing hazy violet light',
    requiredAnchors: [
      'Soft-focus',
      'low contrast',
      'hazy violet light',
      'partially obscured eyes',
      'blurred foreground',
      'dreamlike film blur',
      'violet bloom',
      'dappled light',
      'shallow depth of field',
      'compressed small-reference softness',
      'rather than upgrading into a crisp glossy illustration'
    ],
    forbiddenAnchors: [
      'ultra clear',
      'sharp face',
      'smooth skin',
      'clean subject',
      'highly detailed'
    ],
    requiredNegativeAnchors: [
      'sharp glossy anime face',
      'hyper-detailed eyes',
      'commercial beauty retouching',
      'clean studio lighting',
      'over-sharpened hair strands',
      'missing foreground blur',
      'missing hazy violet light'
    ]
  },
  {
    id: 'soft_focus_nightlife_conflict',
    recreation:
      'Soft-focus nightlife fashion photo with diffusion-filter softness, low micro-contrast, warm bloom, halation around glass highlights, faint film grain, and phone-photo compression feel leading the look before any crisp fashion detail. Two adult East Asian-presenting women in pastel embroidered hanfu-inspired sheer gowns stand close together in a dim luxury bar interior, one in pale pink facing the camera with lowered eyes, the other in pale blue leaning to kiss her cheek, long black hair with floral hair ornaments and delicate dangling accessories. Keep the full-body vertical crop, mirrored glass cabinet at the left, large disco ball in the upper right, dark reflective ceiling, glossy black floor reflections, champagne glass tower at the right, softly readable luxury branding near the cabinet, and nightclub stair lights in the background. Prioritize the hazy lens diffusion, softened facial micro-detail, muted skin texture, light bleed, and compressed low-light atmosphere over crisp catalog clarity while keeping the clothing silhouettes, pose relationship, logo placement, glass reflections, and scene layout recognizable rather than redesigned into a sharp commercial studio fashion campaign.',
    core:
      'Soft-focus nightlife photo of two hanfu-inspired women in a dim luxury bar, diffusion bloom, halation, disco ball, glass reflections, phone-photo compression.',
    negative:
      'tack-sharp studio fashion photo, hard-edged product catalog lighting, hyper-detailed face, glossy AI skin, over-sharpened eyes, razor-sharp glass reflections, crisp luxury campaign, clean studio relighting, high-contrast HDR, plastic skin texture, missing warm bloom, missing halation, missing phone-photo compression feel, deep focus everywhere, redesigned bar interior',
    fidelityPriorities: [
      'soft focus priority 94 of 100 - lead reconstruction with softened edges and facial micro-detail',
      'lens diffusion priority 91 of 100 - preserve hazy glow before crisp glass detail',
      'bloom and halation priority 88 of 100 - keep warm light bleed around reflective highlights',
      'phone-photo compression priority 80 of 100 - retain low-light consumer-photo texture',
      'fine-detail sharpness priority 30 of 100 - keep clothing and logo recognizable but secondary'
    ],
    requiredEarlyAnchors: [
      'Soft-focus nightlife',
      'diffusion-filter softness',
      'low micro-contrast',
      'warm bloom',
      'halation',
      'phone-photo compression feel'
    ],
    requiredAnchors: [
      'two adult East Asian-presenting women',
      'pastel embroidered hanfu-inspired sheer gowns',
      'dim luxury bar interior',
      'pale pink',
      'pale blue',
      'floral hair ornaments',
      'full-body vertical crop',
      'mirrored glass cabinet',
      'large disco ball',
      'champagne glass tower',
      'softly readable luxury branding',
      'Prioritize the hazy lens diffusion',
      'softened facial micro-detail',
      'compressed low-light atmosphere',
      'rather than redesigned into a sharp commercial studio fashion campaign'
    ],
    forbiddenAnchors: [
      'ultra clear',
      'sharp face',
      'smooth skin',
      'highly detailed eyes',
      'crisp product photography'
    ],
    requiredNegativeAnchors: [
      'tack-sharp studio fashion photo',
      'hard-edged product catalog lighting',
      'hyper-detailed face',
      'glossy AI skin',
      'over-sharpened eyes',
      'razor-sharp glass reflections',
      'crisp luxury campaign',
      'clean studio relighting',
      'missing warm bloom',
      'missing halation',
      'missing phone-photo compression feel'
    ],
    forbiddenNegativeAnchors: [
      'no bloom',
      'remove bloom',
      'without bloom',
      'no halation',
      'remove halation',
      'no compression',
      'remove grain'
    ],
    requiredFidelityAnchors: [
      'soft focus priority 94 of 100',
      'lens diffusion priority 91 of 100',
      'bloom and halation priority 88 of 100',
      'phone-photo compression priority 80 of 100',
      'fine-detail sharpness priority 30 of 100'
    ]
  },
  {
    id: 'yellow_knit_low_angle_phone',
    recreation:
      'Low-angle vertical phone photo from below the waist looking up at one adult woman indoors, warm window overexposure at the top-left, yellow open crochet knit sweater lifted by both hands, white ribbed drawstring pants at the bottom edge, bare abdomen and navel dominating the center, loose brown hair falling over the face, relaxed natural expression. Preserve the everyday phone snapshot feel, slightly awkward close perspective, blown window highlight, warm backlight, crochet light pattern projected across the abdomen, natural imperfect skin texture, shallow indoor depth, and soft lens exposure rather than turning it into a studio glamour portrait. style_index 18 out of 100, literal casual realism with golden fabric texture and sunlit perforated shadows.',
    core:
      'Low-angle phone photo of woman lifting yellow crochet sweater, bare abdomen with crochet light pattern, window overexposure, warm casual indoor realism.',
    negative:
      'studio glamour portrait, fashion campaign lighting, glossy AI skin, commercial retouching, flattened camera angle, perfect symmetrical pose, removed window overexposure, missing crochet light pattern, airbrushed abdomen, luxury bedroom set, cinematic model shoot, over-sharpened skin texture',
    requiredAnchors: [
      'Low-angle vertical phone photo',
      'window overexposure',
      'yellow open crochet knit sweater',
      'bare abdomen and navel',
      'everyday phone snapshot feel',
      'slightly awkward close perspective',
      'crochet light pattern',
      'natural imperfect skin texture',
      'rather than turning it into a studio glamour portrait'
    ],
    forbiddenAnchors: [
      'ALEXA',
      'cinema camera',
      '85mm portrait',
      'smooth skin',
      'highly detailed'
    ],
    requiredNegativeAnchors: [
      'studio glamour portrait',
      'fashion campaign lighting',
      'glossy AI skin',
      'commercial retouching',
      'removed window overexposure',
      'missing crochet light pattern',
      'airbrushed abdomen'
    ]
  },
  {
    id: 'scorpion_dark_soft_focus_duo',
    recreation:
      'Compressed narrow vertical dark fantasy portrait of two adult women in black and metallic scorpion-themed costumes, low-angle close foreground figure with glossy black armor, gold snake-like headpiece, jewelry, soft-focus highlights, pale reflective skin, parted lips, and heavy dark eye makeup; second woman stands blurred behind her in purple-black armor with a raised segmented scorpion tail silhouette. Preserve the small low-light source image feel, dark haze, smoky purple background, shallow focus separation, reflective costume speculars, compressed portrait crop, slightly soft facial detail, and moody nightclub fantasy texture rather than a clean ultra-detailed fantasy poster. style_index 62 out of 100, cosplay editorial meets dark fantasy with diffusion and low-key lighting.',
    core:
      'Compressed dark fantasy portrait of two scorpion-costumed women, low-angle foreground figure, smoky purple haze, reflective black armor, soft-focus low-light texture.',
    negative:
      'ultra-clean fantasy poster, sharp commercial render, bright studio beauty lighting, glossy AI skin, hyper-detailed face, missing dark haze, missing second woman, missing scorpion tail, flat black background, wide crop, clean costume catalog photo, over-sharpened jewelry',
    requiredAnchors: [
      'Compressed narrow vertical',
      'two adult women',
      'low-angle close foreground figure',
      'soft-focus highlights',
      'second woman stands blurred behind',
      'dark haze',
      'smoky purple background',
      'shallow focus separation',
      'reflective costume speculars',
      'compressed portrait crop',
      'rather than a clean ultra-detailed fantasy poster'
    ],
    forbiddenAnchors: [
      'clean and transparent',
      'clear main subject',
      'ultra clear',
      'sharp face',
      'smooth uniform texture'
    ],
    requiredNegativeAnchors: [
      'ultra-clean fantasy poster',
      'sharp commercial render',
      'bright studio beauty lighting',
      'glossy AI skin',
      'hyper-detailed face',
      'missing dark haze',
      'missing scorpion tail'
    ]
  },
  {
    id: 'red_hair_pen_foreground_blur',
    recreation:
      'Narrow vertical smoky back-alley portrait of one adult woman with red hair tied in a messy low bun, black glossy leather jacket, beige ribbed crop top, dark pants, standing in a cramped industrial corridor with lockers, boxes, mist, a bright pink-white backlight, and a visible STAFF ONLY sign on the right. Her arm reaches toward the lens holding a white pen marked vibeshot.club, with the hand and pen large in the foreground and noticeably out of focus while her face remains softly focused behind it. Preserve the foreground hand blur, shallow depth of field, smoky alley atmosphere, watermark and text placement, small compressed portrait feel, leather highlights, and backlit haze rather than a clean cosplay studio portrait. style_index 38 out of 100, gritty staged photo realism with diffusion.',
    core:
      'Smoky back-alley portrait of red-haired woman reaching a vibeshot.club pen toward camera, foreground hand blur, shallow depth, leather jacket, STAFF ONLY sign.',
    negative:
      'clean cosplay studio portrait, sharp foreground hand, missing pen text, changed watermark placement, removed STAFF ONLY sign, bright clean hallway, glossy AI skin, commercial retouching, perfect beauty headshot, missing smoky back alley, deep focus everywhere, wide crop, over-sharpened face',
    requiredAnchors: [
      'foreground',
      'out of focus',
      'smoky back-alley portrait',
      'shallow depth of field',
      'watermark and text placement',
      'vibeshot.club',
      'STAFF ONLY sign',
      'backlit haze',
      'rather than a clean cosplay studio portrait'
    ],
    forbiddenAnchors: [
      'crisp readable controls',
      'clean studio',
      'sharp foreground hand',
      'smooth skin',
      'highly detailed face'
    ],
    requiredNegativeAnchors: [
      'clean cosplay studio portrait',
      'sharp foreground hand',
      'missing pen text',
      'changed watermark placement',
      'removed STAFF ONLY sign',
      'missing smoky back alley',
      'deep focus everywhere'
    ]
  },
  {
    id: 'tatsumaki_recognition_regression',
    recreation:
      'Tatsumaki, Tornado of Terror from One Punch Man, one petite green-haired esper woman hovering high above Earth in a vertical 2:3 composition, oblique aerial viewpoint with the curved planet and cloud layers tilted beneath her, arms crossed, head lowered, hair streaming upward, fitted black long-sleeve dress with high collar and thigh slit, trailing scarf-like fabric, black heels. Preserve the source anime-CG painterly softness, translucent teal psychic wisps, thin vertical energy trails converging below her feet, atmospheric scale, restrained contrast, and matte black fabric surface, not a generic green-haired anime woman or glossy superhero poster. style_index 78 out of 100.',
    core:
      'Tatsumaki from One Punch Man hovering above tilted Earth, crossed arms, black dress, teal psychic energy, soft atmospheric anime-CG style.',
    negative:
      'generic anime woman, wrong character, extra people, ground-level view, centered poster pose, glossy latex outfit, oily skin, giant hair mass, thick neon beam, no Earth below, no vertical energy trails, harsh HDR contrast',
    requiredAnchors: [
      'Tatsumaki',
      'One Punch Man',
      'one petite green-haired esper woman',
      'high above Earth',
      'vertical 2:3',
      'oblique aerial viewpoint',
      'arms crossed',
      'black long-sleeve dress',
      'anime-CG painterly softness',
      'translucent teal psychic wisps'
    ],
    requiredNegativeAnchors: [
      'generic anime woman',
      'wrong character',
      'ground-level view',
      'glossy latex outfit',
      'no Earth below'
    ]
  },
  {
    id: 'luotianyi_poster_regression',
    recreation:
      'Wide 16:9 Luo Tianyi Chinese concert poster, preserve the original Chinese text and layout, top-left logo text 洛天依 LUOTIANYI, large glowing aqua Chinese title 迎春归乐 centered across the lower middle, smaller Chinese lines 洛天依全国巡回演唱会, 杭州站, 6月19日19:00, 全面开售 stacked below with the same hierarchy. Pastel blue-green garden fantasy illustration with white-haired anime girl left of center, vine staff, flowers, butterflies, doves, floating wooden crates, and dark teal lower gradient band. Preserve watercolor anime brush texture, soft translucent glow, typography scale, date position, and original script, not an English remake or rearranged fantasy banner. style_index 82 out of 100.',
    core:
      'Luo Tianyi Chinese concert poster, original Chinese title and date preserved, pastel fantasy garden, white-haired anime girl, centered glowing typography.',
    negative:
      'translated English title, romanized Chinese, invented event text, changed date, changed time, moved title, oversized typography, missing Luo Tianyi logo, wrong text language, text covering face, wrong aspect ratio',
    requiredAnchors: [
      'Wide 16:9',
      'Luo Tianyi',
      'original Chinese text',
      '洛天依 LUOTIANYI',
      '迎春归乐',
      '洛天依全国巡回演唱会',
      '杭州站',
      '6月19日19:00',
      '全面开售',
      'original script'
    ],
    requiredNegativeAnchors: [
      'translated English title',
      'romanized Chinese',
      'invented event text',
      'changed date',
      'moved title',
      'wrong text language'
    ]
  },
  {
    id: 'sofascore_ui_regression',
    recreation:
      'Wide browser screenshot reconstruction of a dark Sofascore football match dashboard with a Zhijuan Prompt Card floating panel overlay on the right, preserving screenshot crop, page layout, visible Chinese UI labels, right-side overlay z-order, top navigation, Sofascore logo, left league sidebar, Belgium versus Egypt 0-0 live scoreboard, formation board, right column ad, and match events partly covered by the prompt panel. Degraded UI thumbnail source reconstructed as a clean readable screenshot while keeping the same relative geometry, not a redesigned website or marketing mockup. style_index 12 out of 100, dark teal-black interface capture.',
    core:
      'Readable Sofascore browser screenshot with Zhijuan Prompt Card overlay, dark UI, Belgium versus Egypt scoreboard, preserved crop and layout.',
    negative:
      'redesigned website, different website, full-page mockup, missing prompt overlay, wrong overlay position, translated UI labels, invented teams, wrong score, missing Sofascore logo, missing left sidebar, missing formation board, marketing landing page',
    requiredAnchors: [
      'browser screenshot',
      'Sofascore',
      'Zhijuan Prompt Card floating panel overlay',
      'visible Chinese UI labels',
      'right-side overlay z-order',
      'Belgium versus Egypt 0-0',
      'degraded UI thumbnail',
      'clean readable screenshot',
      'same relative geometry',
      'not a redesigned website'
    ],
    requiredNegativeAnchors: [
      'redesigned website',
      'different website',
      'missing prompt overlay',
      'wrong overlay position',
      'translated UI labels',
      'wrong score'
    ]
  },
  {
    id: 'high_density_panoramic_skeleton_regression',
    recreation:
      'Ultra-wide 16:9 dense panoramic civilization mural with a curved continuous Earth cross-section as the source-defining reconstruction skeleton, a clear luminous guide line following the planet horizon, organic blended terrain zones, and a left-to-right reading flow from cosmic origin through life, civilization, industry, information age, and future exploration. Keep the non-rectangular zone boundaries crisp where the horizon arc and golden timeline line separate layers, while allowing painterly atmospheric blending inside the land, ocean, city, and space regions. Local objects such as planets, dinosaurs, ships, trains, aircraft, computers, rockets, satellites, animals, and Chinese timeline labels fill the scene as secondary details without flattening the image into straight stacked bands. Prioritize the curved global geometry, boundary clarity, adjacent region relationships, density changes, and continuous mural flow over enumerating every small object.',
    core:
      'Ultra-wide dense civilization mural with curved Earth cross-section, clear luminous horizon guide line, organic non-rectangular zones, Chinese labels, and continuous left-to-right flow.',
    negative:
      'flat straight horizontal bands, uniform rectangular grid, poster redesign with equal panels, blurred horizon boundary, missing golden guide line, merged terrain zones, over-regularized timeline chart, local objects crowding out global structure, translated Chinese labels, invented English labels, missing curved Earth cross-section, hard textbook table layout',
    minWords: 95,
    requiredEarlyAnchors: [
      'Ultra-wide 16:9',
      'curved continuous Earth cross-section',
      'source-defining reconstruction skeleton',
      'clear luminous guide line'
    ],
    requiredAnchors: [
      'organic blended terrain zones',
      'left-to-right reading flow',
      'non-rectangular zone boundaries',
      'crisp',
      'painterly atmospheric blending inside',
      'Chinese timeline labels',
      'secondary details',
      'without flattening the image into straight stacked bands',
      'curved global geometry',
      'boundary clarity',
      'adjacent region relationships',
      'density changes'
    ],
    requiredNegativeAnchors: [
      'flat straight horizontal bands',
      'uniform rectangular grid',
      'poster redesign with equal panels',
      'blurred horizon boundary',
      'missing golden guide line',
      'merged terrain zones',
      'over-regularized timeline chart',
      'local objects crowding out global structure',
      'translated Chinese labels',
      'hard textbook table layout'
    ],
    forbiddenAnchors: [
      'maybe',
      'possibly',
      'A or B',
      'should preserve'
    ]
  },
  {
    id: 'simple_centered_object_no_overconstraint',
    recreation:
      'Square clean product-style image of one glossy red ceramic cup centered on a matte off-white surface, simple front view, soft shadow directly beneath the cup, large quiet negative space, smooth curved handle on the right, subtle specular highlight on the glaze, neutral studio-like light, style_index 24 out of 100.',
    core:
      'Centered glossy red ceramic cup on off-white surface, square crop, soft shadow, quiet negative space.',
    negative:
      'extra cups, complex background, heavy labels, dense layout, multi-region collage, timeline chart, dramatic camera tilt, cluttered props, translated text, grid panels',
    minWords: 35,
    maxWords: 70,
    requiredAnchors: [
      'one glossy red ceramic cup',
      'centered',
      'matte off-white surface',
      'soft shadow',
      'negative space',
      'smooth curved handle',
      'style_index 24 out of 100'
    ],
    forbiddenAnchors: [
      'multi-region',
      'z-order',
      'text_lock',
      'dense layout',
      'reconstruction skeleton',
      'boundary relationship',
      'detail_budget',
      'source-defining structure'
    ],
    requiredNegativeAnchors: [
      'extra cups',
      'complex background',
      'dense layout',
      'multi-region collage',
      'timeline chart',
      'grid panels'
    ]
  },
  {
    id: 'mirror_selfie_real_person_regression',
    recreation:
      'Square casual bathroom mirror selfie of two adult women standing side by side in front of a sink, both with dark messy high buns, warm tan skin tones with natural texture and visible undertones, East Asian-presenting facial features, oval-to-heart face shapes, dark eyes, soft everyday makeup, slim athletic body proportions. The left woman holds a phone at chest height in a white knotted crop T-shirt and pale pink bikini bottoms with a navel piercing; the right woman brushes her teeth in an oversized white T-shirt lifted at the waist and leopard bikini bottom. Preserve cream tile bathroom, black door, white shower curtain, cluttered counter, mirror specks, direct mirror-camera perspective, and casual phone-photo realism, not a studio fashion shoot.',
    core:
      'Two adult women in casual bathroom mirror selfie, warm tan skin, dark messy buns, white tops, bikini bottoms, phone, toothbrush, sink clutter.',
    negative:
      'changed skin tone, different facial structure, altered body proportions, beauty-polished substitute face, changed ethnic presentation, commercial glamour retouching, plastic skin, studio fashion shoot, luxury hotel bathroom, missing mirror specks, removed counter clutter, wrong clothing, missing phone, missing toothbrush',
    requiredAnchors: [
      'Square casual bathroom mirror selfie',
      'two adult women',
      'warm tan skin tones',
      'natural texture',
      'visible undertones',
      'East Asian-presenting',
      'oval-to-heart face shapes',
      'cluttered counter',
      'mirror specks',
      'casual phone-photo realism',
      'not a studio fashion shoot'
    ],
    requiredNegativeAnchors: [
      'changed skin tone',
      'different facial structure',
      'altered body proportions',
      'beauty-polished substitute face',
      'commercial glamour retouching',
      'missing mirror specks',
      'removed counter clutter'
    ]
  },
  {
    id: 'korean_soccer_surface_regression',
    recreation:
      'Vertical night football-stadium portrait of one young adult East Asian-presenting woman with platinum-silver wavy hair, soft oval face, natural glossy skin with visible sweat, calm direct gaze, holding a soccer ball under her left arm while her right hand lifts hair. Upper chest shows a tight white shoulder-strap top surface with Korean flag graphics, red-blue taegeuk circle, black trigram marks, black-and-white shield tiger crest, and small red-blue-white bow. Waist, exposed abdomen, navel, hips, and upper thighs show a seamless body-contour white paint-like skin-tight surface with rough red, blue, and black brush-painted strokes following body curves, with no visible separate shorts seam and no loose garment edge. Preserve stadium crowd, Korean flags, green turf, floodlights, wet shine, and national-color ball graphics.',
    core:
      'Korean stadium fan portrait, silver-haired woman holding soccer ball, white strap top and body-contour Korean flag brush-painted surface, floodlit pitch.',
    negative:
      'single printed swimsuit, generic jersey and shorts, visible waistband, fabric hem, clean printed uniform, missing exposed abdomen, missing navel, missing brush paint, wrong national colors, missing soccer ball, changed skin tone, different facial structure, altered body proportions, plastic skin, empty stadium',
    requiredAnchors: [
      'East Asian-presenting',
      'platinum-silver wavy hair',
      'visible sweat',
      'soccer ball',
      'Korean flag graphics',
      'red-blue taegeuk circle',
      'black trigram marks',
      'shield tiger crest',
      'exposed abdomen',
      'navel',
      'rough red, blue, and black brush-painted strokes',
      'no visible separate shorts seam',
      'loose garment edge',
      'stadium crowd',
      'Korean flags'
    ],
    requiredNegativeAnchors: [
      'single printed swimsuit',
      'generic jersey and shorts',
      'visible waistband',
      'fabric hem',
      'missing exposed abdomen',
      'missing navel',
      'missing brush paint',
      'wrong national colors'
    ],
    forbiddenAnchors: [
      'possibly',
      'maybe',
      'A or B',
      'painted or skin-tight',
      'therefore',
      'should preserve'
    ]
  }
];

const simulatedJsonGeneratorCases = [
  {
    id: 'ramen_floating_poster_json_generation_prompt',
    generationPrompt:
      'Vertical 9:16 premium Chinese ramen advertising poster with a dark black-brown low-key background, warm golden upper-right hard light, strong chiaroscuro, shallow depth of field, steam haze, dark bokeh, and suspended amber broth splashes. Center a black rough ceramic ramen bowl on a dark wooden table, filled with thick beige-brown tonkotsu broth, red chili oil dots, scallion bits, bamboo shoots, and glossy surface reflections. A tall bundle of pale yellow thin ramen noodles rises vertically from the bowl in tangled strands, gripped at the top by dark brown chopsticks entering diagonally from the right. Keep green scallion rings, white sesame seeds, floating oil droplets, amber broth drops, and steam wisps suspended around the noodle column in layered depth. Place two glossy charred chashu slices floating on the left, a half soft-boiled egg floating on the right with bright orange glossy yolk, a crinkled shiny black nori sheet in the upper right, and dark wood ear mushrooms near the right bowl rim. Preserve large cream Chinese calligraphy on the left reading “浓汤叉烧拉面”, red seal “醇厚鲜香”, small serif “TONKOTSU RAMEN”, vertical copy “汤底醇厚 · 面条劲道 · 叉烧入味”, four bottom circular icon groups with exact Chinese copy, and the lower-right gold stamp “鲜香” with red seal “匠心”. Preserve the poster composite layout, clear text hierarchy, black-gold-warm-brown palette, food gloss, steam glow, rough reflective ceramic bowl, dark wood grain, and suspended ingredient motion.',
    generationNegativePrompt:
      'plain ramen bowl closeup, no lifted noodles, static toppings, missing suspended droplets, missing floating oil, missing steam haze, missing chopsticks, missing Chinese calligraphy, translated or unreadable Chinese text, missing bottom icon strip, missing lower-right stamp, white porcelain bowl, bright clean studio lighting, flat catalog food photo, extra people, redesigned menu layout',
    spatialDynamics:
      'Central noodle column rises vertically from the broth; right-side chopsticks grip the noodle top; chashu floats left, egg floats right, nori occupies upper right, mushrooms stay near the right rim; droplets, scallion rings, sesame, and steam are suspended in foreground, midground, and background depth layers; text remains locked left, bottom, and lower right.',
    requiredPromptAnchors: [
      'Vertical 9:16',
      'premium Chinese ramen advertising poster',
      'suspended amber broth splashes',
      'noodles rises vertically',
      'chopsticks entering diagonally from the right',
      'floating oil droplets',
      'suspended around the noodle column',
      'chashu slices floating on the left',
      'egg floating on the right',
      'large cream Chinese calligraphy',
      'four bottom circular icon groups',
      'suspended ingredient motion'
    ],
    requiredNegativeAnchors: [
      'plain ramen bowl closeup',
      'no lifted noodles',
      'static toppings',
      'missing suspended droplets',
      'missing floating oil',
      'missing steam haze',
      'missing Chinese calligraphy',
      'missing bottom icon strip',
      'redesigned menu layout'
    ],
    requiredSpatialAnchors: [
      'noodle column rises vertically',
      'right-side chopsticks',
      'chashu floats left',
      'egg floats right',
      'droplets',
      'suspended',
      'depth layers',
      'text remains locked'
    ]
  }
];

for (const key of topLevelKeys) {
  assert(systemPrompt.includes(key), `system prompt missing output key ${key}`);
  assert(typesSource.includes(stripQuotes(key)), `PromptAnalysis type missing key ${key}`);
}

for (const key of jsonPromptKeys) {
  assert(systemPrompt.includes(key), `system prompt missing json_prompt key ${key}`);
  assert(typesSource.includes(stripQuotes(key)), `PromptAnalysis.json_prompt type missing key ${key}`);
}
assert(jsonRepairSource.includes("'fidelity_priorities'"), 'parsePromptAnalysis should normalize json_prompt.fidelity_priorities.');
assert(jsonRepairSource.includes('generationPromptFallback'), 'parsePromptAnalysis should fill json_prompt.generation_prompt from en.prompt when missing.');
assert(jsonRepairSource.includes('strengthenGenerationPrompt'), 'parsePromptAnalysis should strengthen json_prompt.generation_prompt instead of accepting weak JSON output.');
assert(jsonRepairSource.includes('collectGenerationLocks'), 'parsePromptAnalysis should compile high-priority JSON evidence into json_prompt.generation_prompt.');
assert(jsonRepairSource.includes('generation_negative_prompt'), 'parsePromptAnalysis should normalize json_prompt.generation_negative_prompt.');
assert(jsonRepairSource.includes('strengthenGenerationNegativePrompt'), 'parsePromptAnalysis should strengthen json_prompt.generation_negative_prompt.');
assert(jsonRepairSource.includes('collectGenerationNegativeLocks'), 'parsePromptAnalysis should compile high-priority JSON evidence into json_prompt.generation_negative_prompt.');
assert(jsonRepairSource.includes('appendCueDriftBlockers'), 'parsePromptAnalysis should infer generic missing-text, motion, depth, and relationship blockers.');
assert(jsonRepairSource.includes('wrong material or surface finish'), 'parsePromptAnalysis should infer material drift blockers for JSON negative prompts.');
assert(jsonRepairSource.includes('straightened boundaries'), 'parsePromptAnalysis should infer boundary drift blockers for JSON negative prompts.');
assert(jsonRepairSource.includes('buildSpatialDynamicsFallback'), 'parsePromptAnalysis should build json_prompt.spatial_dynamics fallback from visible relationship fields.');
assert(jsonRepairSource.includes('normalizeObservationUnits'), 'parsePromptAnalysis should normalize json_prompt.observation_units.');
assert(jsonRepairSource.includes('normalizeReconstructionPriorities'), 'parsePromptAnalysis should normalize json_prompt.reconstruction_priorities.');
assert(jsonRepairSource.includes('repairJsonText'), 'parsePromptAnalysis should conservatively repair model JSON before failing.');
assert(jsonRepairSource.includes('quoteUnquotedObjectKeys'), 'parsePromptAnalysis should repair unquoted JSON object keys.');
assert(jsonRepairSource.includes('stripTrailingCommas'), 'parsePromptAnalysis should repair trailing JSON commas.');
assert(jsonRepairSource.includes('normalizeSingleQuotedStrings'), 'parsePromptAnalysis should repair single-quoted JSON keys and values.');
assert(panelSource.includes("'generation_prompt'"), 'panel completeness should require json_prompt.generation_prompt.');
assert(panelSource.includes("'generation_negative_prompt'"), 'panel completeness should require json_prompt.generation_negative_prompt.');
assert(panelSource.includes("'spatial_dynamics'"), 'panel completeness should require json_prompt.spatial_dynamics.');

for (const [label, needle] of contractChecks) {
  assert(systemPrompt.includes(needle), `contract check failed: ${label}`);
}

for (const [label, pattern] of forbiddenSystemPatterns) {
  assert(!pattern.test(systemPrompt), `forbidden system direction found: ${label}`);
}

assert(!systemPrompt.includes('"ja"'), 'system prompt should not request hidden Japanese output.');
assert(!systemPrompt.includes('"ja_style_tags"'), 'system prompt should not request hidden Japanese style tags.');
assert(!systemPrompt.includes('"recreation_prompt"'), 'system prompt should not request a duplicate recreation_prompt field.');
assert(systemPrompt.length >= 5200, 'system prompt is unexpectedly short for the fusion reconstruction contract.');
assert(systemPrompt.length <= 15500, 'system prompt is too long; keep the runtime prompt compact enough for API use.');
assert(!panelSource.includes('analysis[tab].prompt}\\n\\n${analysis[tab].analysis'), 'language tab output must not concatenate prompt and analysis.');
assert(panelSource.includes("if (tab === 'en') return getGeneratorPrompt(analysis);"), 'English tab should display/copy the generator-safe prompt text.');
assert(panelSource.includes("if (tab === 'json') return stringifyGeneratorJsonPrompt(analysis);"), 'JSON tab should display/copy generator-facing JSON prompt, not internal structured JSON.');
assert(panelSource.includes('props.onOpenGenerator(siteId, generatorPrompt)'), 'generator handoff must use the generator-safe prompt.');
assert(popupHistorySource.includes('stringifyGeneratorJsonPrompt(entry.analysis)'), 'popup history JSON copy should use generator-facing JSON prompt.');
assert(historyDisplaySource.includes("setFilledGeneratorJsonField(output, 'prompt', getGeneratorPrompt(analysis));"), 'generator JSON prompt should put the generator-safe prompt first.');
assert(historyDisplaySource.includes('analysis?.json_prompt?.generation_prompt'), 'generator prompt helper should use json_prompt.generation_prompt.');
assert(
  historyDisplaySource.indexOf('analysis?.json_prompt?.generation_prompt') < historyDisplaySource.indexOf('legacyAnalysis?.recreation_prompt'),
  'generator prompt helper should prefer json_prompt.generation_prompt before legacy recreation_prompt.'
);
assert(historyDisplaySource.includes('source image'), 'generator prompt helper should strip source-image phrasing before handoff.');
assert(historyDisplaySource.includes('reconstruction_v2'), 'generator prompt helper should strip schema tokens before handoff.');
assert(!panelSource.includes('recreation_prompt'), 'panel should not depend on a duplicate recreation_prompt output field.');
assert(panelSource.includes('isFilledJsonValue'), 'panel completeness should handle nested json_prompt v2 fields.');
assert(imageDataSource.includes('ANALYSIS_MAX_IMAGE_SIDE = 3072'), 'analysis image max side should preserve more detail than the old 2200px cap.');
assert(imageDataSource.includes('if (!unsupportedMime && scale === 1)'), 'supported in-cap images should not be re-encoded before analysis.');
assert(imageDataSource.includes('chooseAnalysisOutputMime'), 'resized analysis images should preserve useful JPEG/WebP output where possible.');
assert(packageJsonSource.includes('"test:real-extension": "node scripts/manual-real-extension-test.mjs"'), 'package.json should expose the real-extension test command.');
assert(packageJsonSource.includes('"check:json-repair": "tsx scripts/check-json-repair.ts"'), 'package.json should expose the JSON repair regression check.');
assert(packageJsonSource.includes('"test:real-json": "tsx scripts/real-image-json-readiness-audit.ts"'), 'package.json should expose the real JSON readiness audit command.');
assert(packageJsonSource.includes('"test:real-structure": "tsx scripts/real-image-structural-audit.ts"'), 'package.json should expose the real structural audit command.');
assert(jsonRepairTestSource.includes('steam-only evidence should not create splash blocker'), 'JSON repair test should guard steam-only overconstraint.');
assert(jsonRepairTestSource.includes('generation_prompt did not compile high-priority observation evidence'), 'JSON repair test should guard weak generation_prompt repair.');
assert(jsonRepairTestSource.includes('wrong material or surface finish'), 'JSON repair test should guard material blocker compilation.');
assert(jsonRepairTestSource.includes('loose JSON repair did not preserve zh.prompt'), 'JSON repair test should guard JavaScript-like model JSON repair.');
assert(manualRealTestSource.includes('publicSettings'), 'real-extension test should avoid printing raw settings.');
assert(manualRealTestSource.includes('redactSecrets'), 'real-extension test should redact storage evidence on failure.');
assert(manualRealTestSource.includes("'[redacted]'"), 'real-extension test should redact API keys in evidence.');
assert(manualRealTestSource.includes('page_image_pick_real_model_success'), 'real-extension test should cover page image selection.');
assert(manualRealTestSource.includes('local_file_upload_real_model_success'), 'real-extension test should cover local file upload.');
assert(manualRealTestSource.includes('json_prompt.generation_prompt too weak'), 'real-extension test should require json_prompt.generation_prompt.');
assert(manualRealTestSource.includes('json_prompt.generation_prompt weaker than en.prompt'), 'real-extension test should require json_prompt.generation_prompt to be no weaker than en.prompt.');
assert(manualRealTestSource.includes('json_prompt.generation_negative_prompt too weak'), 'real-extension test should require json_prompt.generation_negative_prompt.');
assert(manualRealTestSource.includes('json_prompt.spatial_dynamics too weak'), 'real-extension test should require json_prompt.spatial_dynamics.');
assert(realStructureAuditSource.includes('blocksStraightBoundaryDrift'), 'real structural audit should check straight-boundary drift blockers.');
assert(realStructureAuditSource.includes('mentionsNonlinearGeometry'), 'real structural audit should check nonlinear source geometry.');
assert(realStructureAuditSource.includes('ZHIJUAN_STRUCTURAL_AUDIT_FILE'), 'real structural audit should support offline re-parse of prior real model audits.');
assert(realJsonAuditSource.includes('generation_prompt'), 'real JSON readiness audit should check json_prompt.generation_prompt.');
assert(realJsonAuditSource.includes('generationPromptWeakerThanEnglish'), 'real JSON readiness audit should fail when json_prompt.generation_prompt is weaker than en.prompt.');
assert(realJsonAuditSource.includes('spatial_dynamics'), 'real JSON readiness audit should check json_prompt.spatial_dynamics.');
assert(realJsonAuditSource.includes('ZHIJUAN_JSON_REQUIRED_PROMPT'), 'real JSON readiness audit should support prompt anchor checks.');
assert(realJsonAuditSource.includes('ZHIJUAN_JSON_FORBIDDEN_PROMPT'), 'real JSON readiness audit should support forbidden prompt anchor checks.');
assert(realJsonAuditSource.includes('forbiddenPromptAnchorsAbsent'), 'real JSON readiness audit should fail on wrong precise prompt anchors.');
assert(realJsonAuditSource.includes('parsePromptAnalysis(analysis)'), 'real JSON readiness audit should re-parse existing audit files through current repair logic.');
assert(installedAcceptanceSource.includes('chrome://extensions'), 'installed extension acceptance doc should tell the user where to refresh the extension.');
assert(installedAcceptanceSource.includes('starts with a top-level `prompt` field'), 'installed extension acceptance doc should verify generator-facing JSON prompt output.');
assert(installedAcceptanceSource.includes('no Japanese output block'), 'installed extension acceptance doc should keep the no-hidden-Japanese gate.');
assert(installedAcceptanceSource.includes('no duplicate `recreation_prompt` output'), 'installed extension acceptance doc should keep the duplicate prompt gate.');

for (const testCase of simulatedCases) {
  checkPromptSample(testCase);
}

for (const testCase of simulatedJsonGeneratorCases) {
  checkJsonGeneratorSample(testCase);
}

if (failures.length) {
  console.error('prompt goal check failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('prompt goal check passed');
console.log(`- contract rules: ${contractChecks.length}`);
console.log(`- simulated fidelity cases: ${simulatedCases.length}`);
console.log(`- simulated JSON generator-readiness cases: ${simulatedJsonGeneratorCases.length}`);

function checkJsonGeneratorSample(testCase) {
  const promptWords = wordCount(testCase.generationPrompt);
  const negativeItems = testCase.generationNegativePrompt.split(',').map((item) => item.trim()).filter(Boolean);
  const spatialWords = wordCount(testCase.spatialDynamics);

  assert(promptWords >= 95, `${testCase.id}: json_prompt.generation_prompt should be complete, got ${promptWords}`);
  assert(negativeItems.length >= 8 && negativeItems.length <= 24, `${testCase.id}: json_prompt.generation_negative_prompt needs image-specific blockers, got ${negativeItems.length}.`);
  assert(spatialWords >= 28, `${testCase.id}: json_prompt.spatial_dynamics should carry motion and z-depth relationships, got ${spatialWords}`);
  assert(!hasGeneratorSyntax(testCase.generationPrompt), `${testCase.id}: json_prompt.generation_prompt contains generator-specific syntax.`);
  assert(!hasGeneratorSyntax(testCase.generationNegativePrompt), `${testCase.id}: json_prompt.generation_negative_prompt contains generator-specific syntax.`);
  assert(!hasPromptLabels(testCase.generationPrompt), `${testCase.id}: json_prompt.generation_prompt contains section labels.`);
  assert(!hasPromptReasoning(testCase.generationPrompt), `${testCase.id}: json_prompt.generation_prompt contains reasoning or uncertainty wording.`);

  for (const anchor of testCase.requiredPromptAnchors || []) {
    assert(includesInsensitive(testCase.generationPrompt, anchor), `${testCase.id}: json_prompt.generation_prompt missing anchor "${anchor}"`);
  }
  for (const anchor of testCase.requiredNegativeAnchors || []) {
    assert(includesInsensitive(testCase.generationNegativePrompt, anchor), `${testCase.id}: json_prompt.generation_negative_prompt missing blocker "${anchor}"`);
  }
  for (const anchor of testCase.requiredSpatialAnchors || []) {
    assert(includesInsensitive(testCase.spatialDynamics, anchor), `${testCase.id}: json_prompt.spatial_dynamics missing relationship "${anchor}"`);
  }
}

function checkPromptSample(testCase) {
  const recreationWords = wordCount(testCase.recreation);
  const coreWords = wordCount(testCase.core);
  const negativeItems = testCase.negative.split(',').map((item) => item.trim()).filter(Boolean);
  const minWords = testCase.minWords ?? 70;
  const maxWords = testCase.maxWords ?? Number.POSITIVE_INFINITY;

  assert(recreationWords >= minWords, `${testCase.id}: en.prompt should be complete, got ${recreationWords}`);
  assert(recreationWords <= maxWords, `${testCase.id}: en.prompt should not be over-expanded, got ${recreationWords}`);
  assert(coreWords >= 12 && coreWords <= 45, `${testCase.id}: prompt_core should stay compressed, got ${coreWords}`);
  assert(negativeItems.length >= 6 && negativeItems.length <= 24, `${testCase.id}: negative_prompt needs image-specific drift blockers, got ${negativeItems.length}.`);
  assert(!hasGeneratorSyntax(testCase.recreation), `${testCase.id}: en.prompt contains generator-specific syntax.`);
  assert(!hasGeneratorSyntax(testCase.core), `${testCase.id}: prompt_core contains generator-specific syntax.`);
  assert(!hasPromptLabels(testCase.recreation), `${testCase.id}: en.prompt contains section labels.`);
  assert(!hasPromptLabels(testCase.core), `${testCase.id}: prompt_core contains section labels.`);
  assert(!hasPromptReasoning(testCase.recreation), `${testCase.id}: en.prompt contains reasoning or uncertainty wording.`);
  assert(!hasPromptReasoning(testCase.core), `${testCase.id}: prompt_core contains reasoning or uncertainty wording.`);

  for (const anchor of testCase.requiredAnchors || []) {
    assert(includesInsensitive(testCase.recreation, anchor), `${testCase.id}: en.prompt missing anchor "${anchor}"`);
  }
  for (const anchor of testCase.requiredEarlyAnchors || []) {
    assertAppearsEarly(testCase.recreation, anchor, testCase.id);
  }
  for (const anchor of testCase.forbiddenAnchors || []) {
    assert(!includesInsensitive(testCase.recreation, anchor), `${testCase.id}: en.prompt should not include "${anchor}"`);
  }
  for (const anchor of testCase.requiredNegativeAnchors || []) {
    assert(includesInsensitive(testCase.negative, anchor), `${testCase.id}: negative_prompt missing blocker "${anchor}"`);
  }
  for (const anchor of testCase.forbiddenNegativeAnchors || []) {
    assert(!includesInsensitive(testCase.negative, anchor), `${testCase.id}: negative_prompt should not include "${anchor}"`);
  }
  checkFidelityPriorities(testCase);
}

function hasGeneratorSyntax(text) {
  return /(?:^|\s)--(?:ar|s|raw|iw|no)\b|\bBREAK\b|<lora:|\[[^\]]+\]|\([^)]*\)|::\d/i.test(text);
}

function hasPromptLabels(text) {
  return /\b(?:Subject|Lighting|Composition|Style|Camera|Negative):/i.test(text);
}

function hasPromptReasoning(text) {
  return /\b(?:because|therefore|possibly|maybe|may|might|appears to be|should preserve|needs to keep)\b|可能|或者|因此|需保留|[\p{L}\p{N}-]+\/[\p{L}\p{N}-]+/iu.test(text);
}

function includesInsensitive(text, needle) {
  return text.toLowerCase().includes(needle.toLowerCase());
}

function assertAppearsEarly(text, needle, id) {
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  assert(index >= 0, `${id}: en.prompt missing early anchor "${needle}"`);
  assert(index <= Math.ceil(text.length * 0.35), `${id}: en.prompt should introduce "${needle}" before subject/detail cues.`);
}

function checkFidelityPriorities(testCase) {
  if (!testCase.fidelityPriorities) return;
  assert(testCase.fidelityPriorities.length >= 3 && testCase.fidelityPriorities.length <= 7, `${testCase.id}: fidelity_priorities should contain 3-7 items.`);
  for (const item of testCase.fidelityPriorities) {
    assert(/priority \d{1,3} of 100/i.test(item), `${testCase.id}: fidelity priority missing "priority N of 100" wording: ${item}`);
    assert(!hasGeneratorSyntax(item), `${testCase.id}: fidelity priority contains generator-specific syntax: ${item}`);
    assert(!item.includes('/100'), `${testCase.id}: fidelity priority should use "of 100", not slash syntax.`);
  }
  for (const anchor of testCase.requiredFidelityAnchors || []) {
    assert(testCase.fidelityPriorities.some((item) => includesInsensitive(item, anchor)), `${testCase.id}: fidelity_priorities missing "${anchor}"`);
  }
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
