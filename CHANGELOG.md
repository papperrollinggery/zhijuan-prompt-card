# Changelog

## 0.3.5

**English**

- Raises the default API request timeout from 180 seconds to 600 seconds for slower reasoning-model image analysis.
- Adds an API timeout setting in the options page, clamped between 60 and 1800 seconds.
- Adds a retry button on failed analysis results when the original source image or image URL is still available.

**中文**

- 将默认 API 请求超时时间从 180 秒提高到 600 秒，适配较慢的深度思考模型识图。
- 在设置页新增 API 超时秒数，限制范围为 60 到 1800 秒。
- 识别失败且原始图片或图片 URL 仍可用时，失败面板新增“重新识别”按钮。

## 0.3.4

**English**

- Fixes portrait-source reconstruction prompts being able to drift into horizontal or widescreen generator instructions.
- Uses the uploaded image dimensions as source-frame evidence, then preserves that orientation, aspect ratio, and crop through natural-language prompt copy, JSON prompt copy, and Open in generator.
- Corrects contradictory model-returned frame claims before generator handoff, including wrong aspect ratios in JSON fields and nested structured prompt details.
- Keeps correct orientation blockers in negative prompts, so portrait images explicitly block landscape, horizontal, and widescreen drift instead of asking generators to avoid the real source frame.
- Changes JSON Prompt copy into a structured generator-facing reconstruction prompt, with model-selected adaptive modules plus fields for whole-image atmosphere, subject, composition, style, color, visible text, constraints, and an auxiliary description instead of a prompt-first wrapper.
- Adds source-style fingerprint guidance so subject labels, costumes, eras, or genre guesses do not override the visible medium, abstraction level, detail budget, and ornament density.
- Keeps style/detail negative blockers conditional, so low-detail, soft, or flat sources are protected from likely drift without turning every prompt into a heavy universal blocker list.
- Adds regressions for portrait sports livestream posters where a model incorrectly returns wide-aspect frame wording.
- Simplifies the popup/options extension HTML to avoid Chrome extension load warnings around module preloading.
- Hardens the injected content script after extension reloads, reduces noisy Chrome extension errors, and adds a content-script page injection regression check.

**中文**

- 修复竖版原图的复刻提示词可能漂移成横版或宽屏生成指令的问题。
- 使用上传图片的真实尺寸作为 source-frame 证据，并在自然语言复制、JSON Prompt 复制和“打开生成器”链路中保持原图方向、比例和裁切。
- 在交给生成器前修正模型返回的矛盾画幅描述，包括 JSON 字段和嵌套结构化提示细节里的错误比例。
- 反向词保留正确的方向漂移 blocker：竖图会阻止横版、横向和宽屏漂移，不再误把真实竖版画幅当成需要避免的内容。
- 将 JSON Prompt 复制改为面向生成器的结构化复原提示词，用模型自行判断的动态模块，以及整图氛围、主体、构图、风格、色彩、可见文字、约束和辅助描述字段组织，不再是 `prompt` 首字段包装。
- 增加源图风格指纹约束，避免主体标签、服饰、时代或类型推断压过可见的媒介、抽象程度、细节预算和装饰密度。
- 风格/细节反向约束保持条件式，只在确实可能漂移时保护低细节、柔和或扁平来源，避免所有提示词都变成过重的通用禁止词清单。
- 增加竖版足球直播海报回归，覆盖模型误返回宽屏画幅描述的情况。
- 简化 popup/options 扩展 HTML，避免 Chrome 插件页围绕 module preload 出现加载警告。
- 加固网页注入的 content script，降低扩展重新加载后的 Chrome 插件错误噪音，并新增 content-script 页面注入回归检查。

## 0.3.3

**English**

- Fixes normal prompt copy, history prompt copy, and Open in generator so structural JSON labels, Image2 labels, and reference-upload wording do not leak into the generator-facing prompt.
- Changes the JSON result and history JSON copy to a generator-facing JSON prompt whose first field is `prompt`, keeping it aligned with the natural-language generator prompt.
- Handles JSON-like field fragments accidentally returned inside the generator prompt, including leading `"schema_version": "reconstruction_v2",` and quoted `"generation_prompt": ...` lines.
- Keeps `schema_version: "reconstruction_v2"` in internal structured exports while preventing it from becoming default prompt text.
- Preserves true visible text exactly, including UI labels, printed words, and visible schema-like labels, while still cleaning non-visible source/reference wrapper wording.
- Removes common generator-specific syntax from generator-facing prompt fields, including aspect/weight flags, LoRA tags, `BREAK`, bracket tokens, and prompt weights.
- Keeps legacy and partial history records copyable through compatibility fallbacks.

**中文**

- 修复普通复制、历史复制和“打开生成器”，避免结构化 JSON 标签、Image2 标签和参考图上传话术进入面向生成器的提示词。
- 将 JSON 结果和历史 JSON 复制改为面向生成器的 JSON Prompt，首字段为 `prompt`，与自然语言生成提示词保持一致。
- 处理模型误把 JSON 字段片段塞进生成提示词的情况，包括开头 `"schema_version": "reconstruction_v2",` 和带引号的 `"generation_prompt": ...` 行。
- `schema_version: "reconstruction_v2"` 继续保留在内部结构导出中，但不会再变成默认提示词正文。
- 真实可见文字保持原样，包括 UI 标签、印刷文字和画面中确实可见的类似 schema 标签；非可见的 source/reference 包装话术仍会被清理。
- 清理面向生成器字段中的常见生成器专属语法，包括比例/权重参数、LoRA 标签、`BREAK`、括号 token 和 prompt weight。
- 旧历史和不完整历史记录继续通过兼容 fallback 保持可复制。

## 0.3.2

**English**

- Makes the English result the primary copy-ready recreation prompt, with length scaling to the image instead of a fixed short cap.
- Removes redundant hidden language output and duplicate prompt surfaces from new model responses while keeping Chinese/English prompts, structured JSON, negative prompt, and style tags.
- Improves structured JSON output with a copy-ready generation prompt, matching negative prompt, and spatial dynamics summary so source-defining softness, texture, compression, clarity, layout relationships, floating or suspended motion, and drift risks survive when the JSON tab is copied into generators.
- Strengthens JSON negative prompts by compiling high-priority drift risks, visible text loss, missing motion, depth collapse, material drift, and boundary drift from the structured evidence layer instead of trusting item count alone.
- Improves result parsing resilience when compatible models return JavaScript-like JSON formatting such as comments, trailing commas, single-quoted strings, or unquoted object keys.
- Better captures dense layouts, text placement, optical finish, material behavior, and structure-vs-detail tradeoffs for recreation.
- Preserves more source image detail before analysis, especially for dense UI, poster, and text-heavy images.
- Simplifies the result UI so users have one obvious primary prompt to copy and send to generators.
- Keeps old history readable for legacy records created by earlier output formats.
- Adds real timeline-image verification for organic continuous layouts versus stacked rectangular infographic bands, plus real ramen-poster JSON readiness verification for lifted noodles, suspended ingredients, Chinese text hierarchy, and splash-motion blockers.

**中文**

- 英文结果作为主要可复制复刻提示词，长度按图片复原需要扩展，不再受固定短词数限制。
- 新模型输出移除冗余隐藏语言输出和重复提示词入口，同时保留中英文 Prompt、结构化 JSON、反向词和风格标签。
- 改进结构化 JSON 输出，增加可复制生成提示词、匹配反向词和空间动势摘要，让原图中的柔焦、质地、压缩感、清晰度、版式关系、悬浮运动和漂移风险在复制 JSON 到生成器时也不容易丢失。
- 强化 JSON 反向词：从结构化证据层提取高优先级漂移风险、文字缺失、动势缺失、景深坍塌、材质漂移和边界漂移，而不是只看反向词数量是否足够。
- 提升兼容模型返回类 JSON 时的解析韧性，可兜底处理注释、尾逗号、单引号字符串和未加引号的对象 key。
- 更好描述密集版式、文字位置、光学质感、材质行为，以及结构与细节之间的取舍关系。
- 分析前更好保留源图细节，尤其面向密集 UI、海报和文字较多的图片。
- 简化结果 UI，避免出现多个看似主提示词的复制目标；生成器跳转统一使用主英文结果。
- 旧历史记录仍可读取，兼容早期输出格式生成的数据。
- 增加真实时间线图片验证，覆盖自然连续版式与矩形分栏信息图的差异；增加真实拉面海报 JSON 可生成性验证，覆盖拉起面条、悬浮食材、中文文字层级和飞溅动势 blocker。

## 0.3.1

**English**

- Improves source-image fidelity so soft focus, haze, film blur, low contrast, depth-of-field, lighting texture, and intentional low-fidelity looks are less likely to be over-cleaned.
- Keeps v0.3.0 recognition, text/layout, UI screenshot, material, camera, and style reconstruction strengths while reducing template-like drift.
- Improves real-person reconstruction fidelity for visible facial structure, skin tone, skin texture, hair, pose, body proportions, and casual photo context.
- Improves consistency between natural prompts and JSON output so important visible facts are less likely to be dropped.
- Better preserves ambiguous material, pattern, and surface details instead of overfitting them into generic categories.
- Keeps language prompt tabs focused on copy-ready prompt text instead of mixing in analysis text.
- Makes quality and negative-prompt guidance more conditional to reduce over-polished, AI-flavored, or generic outputs.
- Fixes OpenAI / BridgeDeck / compatible endpoint request options by using `max_completion_tokens` for GPT-5, o-series, and reasoning models, while keeping `max_tokens` and `temperature` for older compatible models.
- Adds in-extension update notices and upgrade guidance, including GitHub release checks, update-note links, and unpacked-install reload instructions.

**中文**

- 提升原图风格保真，减少朦胧、虚焦、胶片感、低对比、光线质感和刻意低清效果被过度清理的问题。
- 保留 v0.3.0 的识别锚点、文字版式、UI 截图、材质、镜头和风格复刻能力，同时减少模板化漂移。
- 改进真人图片的脸型、肤色、皮肤质感、发型、姿势、身体比例和生活照场景保真。
- 改进普通提示词和 JSON 输出的一致性，减少关键可见信息丢失。
- 更好保留复杂材质、图案和表面关系，减少被误写成通用类别。
- 语言提示词标签页只保留可直接复制使用的提示词，不再混入分析文本。
- 质量和反向词约束改为更动态，减少过度精修、AI 味和泛化输出。
- 修复 OpenAI / BridgeDeck / 兼容端点请求参数：GPT-5、o-series 和 reasoning 模型使用 `max_completion_tokens`，旧兼容模型继续使用 `max_tokens` 与 `temperature`。
- 增加插件内更新提示和升级指引，包括 GitHub Release 检查、更新说明入口和本地加载插件的重新加载说明。

## 0.3.0

**English**

- Improved image-to-prompt reconstruction fidelity for stronger image-to-prompt-to-image consistency.
- Better preserves recognizable subjects, source references, composition, text layout, visual style, material feel, and scene structure when supported by the image.
- Improves poster, UI, screenshot, and design-reference handling, including original visible text and layout relationships.
- Produces clearer, more reusable prompts with better drift control for follow-up image generation.
- Updates bilingual release/update messaging for v0.3.0.

**中文**

- 优化图片反推提示词效果，提高“图片 -> 提示词 -> 图片”的复刻一致性。
- 更好保留图片中的可识别主体、来源参考、构图、文字版式、视觉风格、材质质感和场景结构。
- 改进海报、UI、截图和设计参考图的处理，减少文字、布局和画面关系漂移。
- 输出更清晰、更可复用的提示词，便于继续用于后续图像生成。
- 更新 v0.3.0 的中英文更新说明。

## 0.2.0

- Added Visual History MVP.
- Added local thumbnail previews.
- Added quick history rail in the floating panel.
- Added popup visual history grid.
- Added local storage budget protection for thumbnails.
- Added release packaging scripts.
- Added public privacy, security, contribution, and release docs.
- Removed private account-path defaults from public configuration.
- Documented BridgeDeck as an optional local OpenAI-compatible adapter.
