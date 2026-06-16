# 图片复刻提示词约束优化方案

## 目标

把插件的图片反推提示词能力从“描述图片”提升为“生成可复刻的视觉合同”，让用户从图片得到提示词，再把提示词交给图像生成模型时，尽量保留：

- 可识别人物、角色、作品、故事、地标、场景来源
- 主体数量、位置、裁切、视角、透视和空间层次
- 风格化强度、媒介、画法、笔触、渲染完成度
- 摄影或影视器材感、焦段、光圈、快门感、滤镜、后期调色
- 材质表面、反光程度、颗粒、锐化、质感和光影氛围
- 海报、截图、UI、票据、文档中的原始文字语言、版式层级、日期、数字、logo、裁切和叠层关系
- 具体负面约束，避免生成图漂成通用美女、商业海报、油腻高光、过锐 HDR 或错误材质

现实边界：纯文本提示词不能保证像素级复刻。要接近“完美复刻”，还需要同一生成模型、相近尺寸、相近随机种子或参考图机制。插件当前目标应定义为“最大化视觉一致性”，不是承诺绝对复制。

## 当前仓库基线

- 主提示词在 `src/shared/reversePrompt.ts` 的 `REVERSE_PROMPT_SYSTEM`。
- 输出结构由 `PromptAnalysis` 固定，前端依赖字段包括 `zh/en/ja.prompt`、`json_prompt`、`recreation_prompt`、`prompt_core`、`negative_prompt`。
- 不改 UI、不改公开 schema，优先在现有字段内部提高信息密度。
- README 和 `docs/MODELS.md` 标记默认推荐模型为 `gpt-5.5`。
- 当前提示词已经开始加入识别锚点和质量底线，但风格、材质、影视/摄影语言仍不够稳定。

## 外部研究摘要

### OpenAI 官方图像提示词经验

OpenAI 图像提示词指南强调：生产提示词应有稳定顺序，例如背景/场景、主体、关键细节、约束；材质、形状、纹理、媒介要具体；摄影参数可用于控制视觉感，但不要把它们当作精确物理模拟。复杂编辑或复刻任务需要显式列出要保留的内容与禁止漂移项。

参考：

- [OpenAI GPT Image Generation Models Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- [OpenAI Prompt guidance for GPT-5.5](https://developers.openai.com/api/docs/guides/prompt-guidance)
- [OpenAI GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)

### Midjourney 官方控制面

Midjourney 把提示词、图片参考、风格参考和参数拆成不同控制面：

- Image Prompt 影响内容、构图和颜色，但不是精确复制。
- Style Reference 更偏颜色、媒介、纹理和光照，不复制人物或物体。
- Stylize 控制“贴近提示词”与“艺术自由度”的权衡。
- Raw 减少系统自动加风格，适合更可控的提示词。
- Quality 会影响细节和纹理呈现。

插件不能输出 `--s`、`--raw`、`--iw` 等平台参数，因为它要保持通用。但可以把这些控制面翻译成自然语言字段：`style_index 0-100`、`style reference cues`、`literal vs stylized`、`texture/detail level`。

参考：

- [Midjourney Prompt Basics](https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics)
- [Midjourney Image Prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts)
- [Midjourney Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference)
- [Midjourney Stylize](https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize)
- [Midjourney Raw](https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw)
- [Midjourney Quality](https://docs.midjourney.com/hc/en-us/articles/32176522101773-Quality)

### 社区提示词结构共性

GitHub、MJ 社区、图片提示词工具和公开 prompt collection 的共性是：好提示词不是堆形容词，而是一个稳定视觉 brief。

常见结构：

`subject + environment + composition + lighting + style/medium + camera/lens feel + mood + material/quality + restrictions`

对本插件有价值的点：

- 标签库要分类组织，不要把风格、镜头、光照、材质混成一串。
- 摄影提示词常见要素是 framing、angle、lighting style、color style、composition、camera settings、post-processing。
- 反推图片时，提示词应先描述画面中已经存在的证据，再估计可用于复刻的摄影/绘画语言。
- 输出应短而密，避免“masterpiece, best quality, beautiful”等低信息词占据权重。

参考：

- [cliprise/awesome-ai-image-generator-prompts](https://github.com/cliprise/awesome-ai-image-generator-prompts)
- [rockbenben/img-prompt](https://github.com/rockbenben/img-prompt)
- [qwersyk/Midjourney-Photo-Prompt-Generator](https://github.com/qwersyk/Midjourney-Photo-Prompt-Generator/blob/main/main.json)
- [KLL535/ComfyUI_Simple_Qwen3-VL-gguf system prompts](https://github.com/KLL535/ComfyUI_Simple_Qwen3-VL-gguf/blob/main/system_prompts.json)
- [hashmil/stablediffusion-midjourney-prompts](https://github.com/hashmil/stablediffusion-midjourney-prompts/blob/main/GenericPromptGeneratorGPT.txt)

X/Twitter 社区内容搜索到的公开结果大多需要登录或只返回摘要，不能作为稳定可引用依据；本方案只吸收其中与官方和 GitHub 社区一致的通用结构，不把单条 X 帖当事实来源。

## 当前问题诊断

### 1. 识别锚点被弱化

问题：模型能看出某些动漫人物、真人、作品、故事或地标，但系统约束过去倾向于“只描述通用外观”，导致 `green-haired anime woman` 这种泛化结果，丢掉 `Tatsumaki / One Punch Man` 这类强复刻锚点。

改法：允许并鼓励使用可见证据支持的识别锚点。强识别直接写名称；不确定时写 `resembles`、`appears to be`、`inspired by`。

### 2. 风格化没有被量化

问题：提示词写“cinematic anime style”太泛，生成模型可能走向高锐 HDR、商业海报、写实地球、油亮 latex，而不是原图的柔和二次元/3D 混合质感。

改法：在 `style_camera` 和 `recreation_prompt` 中加入 `style_index 0-100`，并用自然语言解释风格化强度。例如：

- `style_index 20/100`: literal documentary / low stylization
- `style_index 40/100`: realistic editorial / controlled polish
- `style_index 60/100`: cinematic stylization / art-directed
- `style_index 80/100`: high stylization / anime, fantasy, surreal, painterly
- `style_index 95/100`: extreme stylization / symbolic, graphic, abstract

### 3. 摄影和影视器材语言太粗

问题：只写 `camera_class; focal_length; aperture` 不够。模型需要知道这些是“复刻视觉感”的 cue，不是 EXIF 事实。

改法：要求模型输出：

- camera class: smartphone, mirrorless, DSLR, cinema camera, virtual 3D camera, scanner/screenshot, illustrated camera
- lens feel: ultra-wide, 24mm wide, 35mm environmental, 50mm natural, 85mm portrait compression, telephoto compression, macro
- aperture/depth: deep focus, shallow DoF, f/1.4-like, f/2.8-like, f/8-like, tilt-shift-like
- shutter feel: frozen action, motion streaks, long exposure, handheld blur
- cinema look: large-format cinema camera look, ALEXA-like soft highlight rolloff, RED-like crisp digital detail, IMAX-like wide grandeur
- filter/post: diffusion filter, black mist, halation, bloom, polarizer feel, cross-processing, bleach bypass, teal-orange grade, muted film emulation

规则：除非图片中有明确元数据或可见设备，不写“shot on ARRI Alexa”。可以写 `ALEXA-like highlight rolloff` 或 `large-format cinema camera feel`。

### 4. 材质和表面行为没有锁定

问题：原图的“哑光黑衣、柔和皮肤、半透明绿色能量”容易被生成成“油亮衣服、油腻皮肤、硬质霓虹光柱”。

改法：在正向提示词中写清：

- material: cotton, silk, leather, latex, metal, glass, paper, ceramic, skin, hair, smoke, plasma, watercolor pigment
- finish: matte, satin, glossy, wet, dry, worn, polished, translucent, subsurface, soft-focus, grainy
- surface behavior: soft specular, hard specular, diffuse reflection, fabric weave, brush texture, cel-shaded flat color, painterly edge
- failure blockers: glossy latex if not visible, oily skin, over-sharpened texture, plastic skin, muddy brushwork, waxy face

### 5. 负向词还不够“图片专属”

问题：通用负向词只能减少噪点，但不能防止主体、构图、材质、风格漂移。

改法：负向词分两层：

- universal quality blockers: excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts
- image-specific blockers: wrong character, generic anime woman, extra people, centered poster pose, harsh sun flare, glossy latex outfit, thick neon beam, hyperreal Earth texture

### 6. 质量底线需要动态保留，不能误伤源图风格

用户指定的质量底线应作为默认质量意图保留：

`The image is clean and transparent, with complete and natural materials, smooth and uniform texture, and the main subject Be clear, with distinct background layers, and avoid excessive sharpening, color spots, and noise Cracks, collapse, and distortion`

普通干净、顺滑、高清、非噪声风格图，建议在复刻提示词末尾加入接近下列意图的质量句：

`The image is clean and transparent, with complete and natural materials, smooth and uniform texture, and a clear main subject, with distinct background layers; avoid excessive sharpening, color spots, noise, cracks, collapse, and distortion.`

放置位置：追加到 `zh.prompt`、`en.prompt`、`ja.prompt` 和 `recreation_prompt` 末尾。负向词中同步加入质量 blocker。

例外：如果源图本身是胶片颗粒、墙面裂纹、纸纤维、笔触、做旧表面、像素艺术、VHS/CRT、监控录像、故意低保真、故意失焦或扭曲风格，就不要加入会抹掉这些风格的“clean/smooth”质量句。此时应把这些特征写成 style/material cue，只阻止非源图伪影。

补充边界：缩略图、预览图、意外压缩和下采样造成的低清不应保留，默认要还原为清晰可读版本。

### 7. 文字和 UI 截图需要独立保真分支

问题：文字海报和 UI 截图不是普通插画。若只按“美术风格”复刻，模型会把中文标题翻译成英文、改日期、挪动标题，或把低清网页截图重绘成干净完整网页。

改法：

- 原文保留：可读文字必须保留原始语言和书写系统，不翻译、不罗马化、不改写、不重排。
- 版式保留：记录标题位置、大小、层级、对齐、间距、发光、阴影、颜色和与主体的遮挡关系。
- 数字保留：日期、时间、比分、版本号、金额、坐标、表格数据必须优先保留。
- 截图保留：截图要写成 screenshot / UI capture，保留裁切、布局、可见文字语言、浮窗叠层、边缘截断和 z-order；默认输出清晰可读版本，不保留缩略图模糊、意外压缩和下采样低清。
- 负向阻断：加入 translated text, changed date, moved title, missing logo, different website, full-page mockup, missing overlay, thumbnail blur, compression artifacts, accidental low resolution 等 blocker。

### 8. 颜色应使用近似标准色号

问题：只写 `"purple", "white", "hot pink"` 这类泛色名不够稳定，生成模型无法精确控制主色、强调色和 UI/文字发光色。

改法：

- `json_prompt.colors` 使用 3-6 个近似 HEX 色号。
- 每个颜色写成 `#RRGGBB + 色名 + 视觉用途`。
- 示例：`#7FE8E1 aqua glow - title light`、`#101820 graphite black - UI background`。
- 不要求像素取样级精确，重点是让生成器知道色相、明度、饱和度和用途。

## 建议的模型约束词架构

不新增 schema，只改变现有字段填充规则。

### 输出字段职责

- `zh/en/ja.prompt`: 给用户阅读和复制的完整复刻提示词，语言自然，无标签。
- `zh/en/ja.analysis`: 简短解释模型看到了什么，包含识别置信度和关键复刻依据。
- `json_prompt.subject`: 主体数量、身份/角色/作品锚点、可见身份线索。
- `json_prompt.action_pose`: 姿态、动作、视线、互动、运动方向。
- `json_prompt.details_appearance`: 外观、服装、发型、配饰、材质、纹理。
- `json_prompt.environment_background`: 前景/中景/背景、地标、道具、层次。
- `json_prompt.lighting_atmosphere`: 光源方向、光质、色温、雾化、体积光、氛围。
- `json_prompt.composition_framing`: 比例、裁切、景别、机位、高低角度、透视、主体位置。
- `json_prompt.style_camera`: 媒介、style_index、写实度、镜头感、相机/电影机感、焦段、光圈、快门感、滤镜、后期、绘画技法。
- `json_prompt.colors`: 主色、辅色、强调色，必要时写色彩关系。
- `json_prompt.materials`: 3 到 6 个最重要材质，不要填泛词。
- `json_prompt.quality_modifiers`: 3 到 6 个复刻质感词，偏“锁定”而非夸奖。
- `json_prompt.likely_generation_intent`: 一句话说明可见创作目标。
- `recreation_prompt`: 最重要，一行英文，给生成模型直接用。
- `prompt_core`: 18 到 35 词的最小核心提示词。
- `negative_prompt`: 英文逗号分隔，图片专属漂移 blocker。

### 正向提示词顺序

`recognizable anchor + exact visible text/language/layout when important + subject count + core action/pose + composition/crop + camera/lens geometry + environment layers + style/medium/style_index + lighting/color + material/texture locks + adaptive quality guidance`

顺序原因：

1. 先锁识别对象和主体数量，避免泛化。
2. 再锁构图和镜头，避免重排画面。
3. 再锁风格、光照、材质，避免质感漂移。
4. 最后加统一质量底线，避免质量词吞掉主体权重。

### 负向提示词顺序

`wrong identity + wrong count + wrong composition + wrong camera/viewpoint + wrong style/finish + wrong material + wrong lighting/color + wrong background + universal quality blockers`

## 建议替换的核心约束词草案

以下是可直接整合进 `REVERSE_PROMPT_SYSTEM` 的约束段。保持英文，因为当前系统提示词是英文，且插件主要要生成跨平台英文复刻词。

```text
Evidence and recognition:
- Use visible evidence first, but do not flatten recognizable anchors into generic descriptions.
- If the image clearly suggests a known person, fictional/anime/game/comic/movie character, source work, story/franchise, album cover, poster, artwork, landmark, event, or named scene, include that anchor in subject, analysis, json_prompt.subject, likely_generation_intent, recreation_prompt, and prompt_core.
- If recognition is strong, name it directly. If plausible but uncertain, use "resembles", "appears to be", or "inspired by".
- Do not invent hidden lore, exact artist, brand, location, camera model, or lens model unless visible or strongly recognizable.
- Camera and lens terms may be estimated as reconstruction cues, not factual metadata.
```

```text
Reconstruction priority:
1. recognizable person, character, work, story, scene, location, or visual-culture anchor when supported
2. visible text, original language/script, typography hierarchy, and UI/layout positions
3. aspect ratio, crop, subject scale, and negative space
4. subject count and relative positions
5. camera geometry, lens feel, viewpoint, and perspective
6. action, pose, gaze, motion blur, and focus plane
7. foreground, midground, background anchors, props, and spatial depth
8. lighting source, direction, contrast, color temperature, haze, and atmosphere
9. material finish, texture, reflectivity, translucency, and surface behavior
10. medium, style family, brushwork/render finish, post-processing, and style_index
```

```text
Style and camera:
- In style_camera, always include: medium; realism level; style_index 0-100; camera_class or illustrated/virtual camera; lens feel or focal length estimate; aperture/DoF feel; shutter/motion feel; filter or flash; post-processing/color grade; brushwork/render surface; composition rule.
- style_index means visual stylization intensity, not a Midjourney parameter: 0-20 literal/documentary, 21-40 realistic/editorial, 41-60 cinematic/art-directed, 61-80 highly stylized/anime/fantasy/painterly, 81-100 extreme graphic/surreal/abstract.
- Use professional visual language only when it helps reconstruction: ALEXA-like highlight rolloff, large-format cinema feel, black mist diffusion, halation, bleach bypass, teal-orange grade, Kodak Portra-like film color, 35mm environmental lens feel, 85mm portrait compression, f/1.8-like shallow DoF.
- Do not claim factual camera metadata. Prefer "ALEXA-like" or "large-format cinema feel" over "shot on ARRI Alexa" unless the image proves it.
```

```text
Material and texture lock:
- Describe the most important surface behavior: matte, satin, glossy, wet, dry, worn, polished, translucent, smoky, fabric weave, leather grain, plastic sheen, metallic specular, paper fibers, brush texture, cel-shaded flat color, painterly soft edge, crisp vector edge.
- For skin, hair, cloth, energy, smoke, glass, metal, paper, UI, or paint, state the visible finish and what it must not become.
- Prefer precise material locks over generic quality words.
```

```text
Text, poster, and UI fidelity:
- For text-heavy designs, posters, UI, screenshots, logos, tickets, ads, and documents, preserve the original language and script. Copy legible text exactly. Do not translate, romanize, paraphrase, replace, invent, or reorder visible text.
- If text is partly legible, quote only the legible parts and describe the rest as small unreadable text in the same script. Keep dates, times, numbers, names, and logos in their original language and position.
- For typography and layout, state text position, scale, hierarchy, alignment, spacing, glow/shadow, color, and relation to nearby subjects.
- For screenshots and UI captures, describe them as screenshots, not redesigned app concepts. Preserve browser/app crop, layout, visible text language, overlay windows, panels, right/left edge cuts, and z-order. Reconstruct a clean readable version by default; do not preserve thumbnail blur, compression artifacts, or accidental low-resolution input unless low fidelity is clearly an intentional visual style. Do not replace the visible UI with a polished redesign or different website.
```

```text
Prompt writing:
- recreation_prompt is the primary generation prompt. Keep it one line, concrete, generator-neutral, and about 70-130 English words; allow up to 160 words for complex multi-subject scenes.
- Put the most load-bearing constraints first.
- Use a dense visual brief order: recognizable anchor; subject count/action; composition/crop/camera; environment layers; style/medium/style_index; lighting/color; material/texture locks; quality floor.
- Avoid labels inside zh.prompt, en.prompt, ja.prompt, recreation_prompt, and prompt_core.
- Avoid empty quality filler such as "masterpiece", "best quality", "beautiful", "stunning", unless the image itself is a beauty/fashion/commercial polish study.
- Do not include generator-specific syntax such as --ar, --s, --raw, --iw, --no, BREAK, (), [], LoRA tags, weights, or model parameters.
```

```text
Quality floor:
- For ordinary clean or smooth source images, append adaptive quality guidance close to: "clean and transparent image, complete and natural materials, smooth and uniform texture, clear main subject, distinct background layers, avoid excessive sharpening, color spots, unwanted noise, cracks, collapse, and distortion."
- If grain, cracks, rough texture, noisy film, pixel art, VHS/CRT artifacts, blur, low fidelity, or distortion are intentional source style, preserve them as style/material cues and do not add the clean/smooth quality clause that would erase that style.
```

```text
Negative prompt:
- negative_prompt must be image-specific, comma-separated English phrases.
- Include blockers for likely drift: wrong identity, generic substitute subject, wrong subject count, wrong camera angle, recentered composition, wrong crop, wrong material finish, wrong energy/smoke/texture shape, wrong background anchors, wrong lighting, excessive beauty polish, extra props, text changes.
- Always add quality blockers: excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts.
```

## 示例：高风格动漫能量图

原图复刻方向：

- 识别：如果模型识别到 `Tatsumaki / Tornado of Terror from One Punch Man`，应写入，不应降级为 `green-haired anime woman`。
- 风格：柔和二次元/3D 混合，非硬锐科幻海报。
- 材质：黑色衣服偏哑光或柔皮革，不是 latex。
- 能量：半透明丝状、雾状、向下汇聚，不是粗硬霓虹柱。
- 背景：地球和云层有空气透视，不是过锐卫星地图。

建议 `recreation_prompt`：

```text
Tatsumaki / Tornado of Terror from One Punch Man, one petite green-haired esper woman hovering high above Earth in a vertical 2:3 composition, oblique aerial viewpoint with the curved planet and soft cloud layers tilted beneath her; arms crossed, head lowered, hair streaming upward, fitted black long-sleeve dress with high collar, thigh slit, trailing scarf-like fabric, black heels. Soft atmospheric anime-CG hybrid, style_index 78/100, painterly diffuse finish, translucent teal psychic energy wisps and thin vertical light trails converging below her feet, restrained contrast, no harsh poster glare, matte black fabric/soft leather surface. The image is clean and transparent, with complete and natural materials, smooth and uniform texture, and a clear main subject, with distinct background layers; avoid excessive sharpening, color spots, noise, cracks, collapse, and distortion.
```

建议 `negative_prompt`：

```text
generic anime woman, wrong character, extra people, ground-level view, centered poster pose, looking at camera, smiling face, short hair, glossy latex outfit, oily skin, giant hair mass, thick neon beam, harsh sun flare, hard HDR contrast, hyperreal satellite-map Earth texture, starfield background, wings, weapons, red magic, missing Earth below, no vertical energy trails, excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts
```

## 示例：黑白棚拍肖像

识别策略：

- 如果画面只出现手写 `NiL`，不要把它直接当真人姓名事实。
- 如果用户或可见上下文明确人物身份，可以加入。
- 如果没有强证据，用“young East Asian man with round glasses”这类可见描述。

建议 `style_camera`：

```text
monochrome editorial studio portrait; realism 70/100; style_index 35/100; full-frame mirrorless or medium-format portrait feel; 35mm-50mm low-angle perspective; deep-to-medium focus; controlled studio lamps; soft contrast black-and-white grade; matte wall texture; quiet negative space
```

建议 `negative_prompt`：

```text
extra people, missing twin studio lamps, recentered headshot, smiling fashion pose, colorful palette, clean luxury backdrop, poster hero lighting, cropped-out boots, wrong chair material, oversized text, glamour blur, excessive sharpening, color spots, noise, cracks, collapse, distortion, greasy texture, oily surface, grainy artifacts
```

## 实装方案

只改模型约束词和对应验证，不动 UI。

### 文件

- `src/shared/reversePrompt.ts`: 替换或压缩系统约束词。
- `scripts/check-prompt-goal.mjs`: 增加静态规则和模拟案例。
- `docs/prompt-optimization-goal.md`: 更新完成标准。
- `docs/prompt-constraint-optimization-plan.md`: 本方案文档。

### 最小补丁步骤

1. 保持 JSON 顶层 shape 不变。
2. 在 `Evidence policy` 中加入识别锚点规则。
3. 在 `Reconstruction priority` 中把识别锚点、构图、镜头、材质、风格顺序明确化。
4. 扩展 `style_camera` 字段说明，但不新增字段。
5. 加入 `style_index 0-100` 的自然语言定义。
6. 加入材质/质感锁定规则。
7. 规范 `recreation_prompt` 的顺序和长度。
8. 强化 `negative_prompt` 的图片专属漂移 blocker。
9. 追加用户指定的质量底线。
10. 更新本地校验脚本，确保未来不会退回泛化提示词。

### 校验命令

```bash
npm run check:prompt-goal
npm run typecheck
npm run build
```

### 人类使用模拟

每次改约束词后，至少跑四类图：

- 高风格动漫/游戏/影视角色图：检查识别锚点、风格指数、能量/材质 blocker。
- 真人棚拍/街拍图：检查人物身份策略、镜头语言、皮肤/服装质感。
- 多人商业/偶像/舞台图：检查人数、相对位置、色彩、道具、布景。
- 设计/海报/UI/产品图：检查文字、版式、材质、logo/品牌保留策略。
- 网页截图/插件浮窗图：检查截图裁切、可见文字语言、UI 叠层和边缘截断，同时默认清理缩略图模糊、意外压缩和低清输入。

手工检查项：

- 生成提示词是否把可识别对象写成具体名称。
- 不确定识别是否用了 `resembles` 或 `appears to be`。
- `recreation_prompt` 第一段是否锁定了主体、构图和镜头。
- 是否包含 `style_index` 和风格/媒介解释。
- 是否明确材质反光、表面、纹理和禁止漂移项。
- 文字是否保留原始语言、日期、时间、logo、位置和层级，没有被翻译或改写。
- 截图是否仍是截图，布局/叠层不变，但画质默认清晰可读，没有被重绘成不同网页或营销页面。
- `negative_prompt` 是否图片专属，不只是泛用差质量词。
- 是否没有平台参数和模型专属语法。

## 推荐验收标准

一版约束词可以进入实装，至少满足：

- `recreation_prompt` 能在 70 到 130 词内覆盖主体、构图、风格、镜头、光照、材质、质量底线。
- 对强识别角色/作品不再泛化。
- 对真人识别遵循证据，不乱猜身份。
- 对风格化图片能写出 `style_index`、媒介、笔触或渲染完成度。
- 对摄影图能写出合理的镜头/焦段/光圈/滤镜/后期语言，并标注为视觉 cue。
- 对质感问题有正向 material lock 和负向 blocker。
- 通过 `npm run check:prompt-goal`、`npm run typecheck`、`npm run build`。

## 关键取舍

- 不输出 Midjourney 参数，但吸收其控制思想。
- 不新增 UI 字段，避免破坏插件展示和历史兼容。
- 不把所有摄影词都塞进每张图，只在有助于复刻时写。
- 不为了安全而过度屏蔽识别锚点；识别是复刻优势。
- 不追求长提示词，追求短、密、可执行。
