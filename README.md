# Zhijuan Prompt Card

`Apache-2.0` `Chrome Extension` `Manifest V3` `TypeScript` `React` `Vite` `Local-first` `BYOK` `No telemetry`

![Zhijuan Prompt Card product overview](docs/assets/readme/imagegen/readme-banner.png)

**English:** Local-first image-to-prompt Chrome extension for designers, photographers, AI artists, and visual creators.

**中文：** 本地优先的 Chrome 图片反推提示词扩展，把网页图片、框选区域、本地图片转换成可复用的结构化 Prompt。

Zhijuan Prompt Card is not a cloud AI platform. It is a focused browser extension for selecting visual references and turning them into structured prompt language through your own vision endpoint.

Zhijuan Prompt Card 不是云端 AI 平台。它只负责选图、框选、上传和提示词结构化；视觉识别由你自己配置的模型端点完成。

## What It Does / 功能概览

**English**

- Right-click any webpage image.
- Pick an image from the current page.
- Crop a page region.
- Upload a local image.
- Send the selected image to your configured vision endpoint.
- Generate Chinese / English prompts, generator-facing JSON prompt, negative prompt, and style tags. English and JSON prompts are both recreation prompts.
- Preserve recognizable visual anchors and stronger style/material/camera reconstruction cues when the model can infer them from the image.
- Keep local visual history with thumbnails.
- Copy prompts or open generator tools for continuation.

**中文**

- 右键识别网页图片。
- 从当前页面选择图片。
- 框选页面区域。
- 上传本地图片。
- 把选中的图片发送到你自己配置的视觉模型端点。
- 输出中文、英文 Prompt、面向生成器的 JSON Prompt、Negative Prompt 和 Style Tags。英文和 JSON 都是复刻提示词。
- 在模型能识别时保留人物、角色、作品、故事、场景等视觉锚点，并强化风格、材质、镜头复刻线索。
- 本地保存视觉历史和缩略图。
- 一键复制 Prompt，或打开生成器继续创作。

## Who Is It For / 适合谁

- AI artists collecting visual references.
- Designers reverse-engineering style, layout, lighting, and composition.
- Photographers analyzing visual language and framing.
- Directors building moodboards and scene prompts.
- Developers testing vision-model prompt pipelines.

适合 AI 绘图、视觉设计、摄影参考、导演分镜、Moodboard、视觉模型提示词测试。

## Workflow / 工作流

![Zhijuan Prompt Card workflow](docs/assets/readme/imagegen/readme-workflow.png)

```text
Image / Page Region / Local File
-> Zhijuan Prompt Card
-> User-configured OpenAI-compatible Vision Endpoint
-> Structured Prompt Output
-> Copy / Open in Generator
```

```text
网页图片 / 页面框选 / 本地文件
-> Zhijuan Prompt Card
-> 用户配置的 OpenAI-compatible 视觉端点
-> 结构化 Prompt 输出
-> 复制 / 打开生成器继续使用
```

## Current Features / 当前功能

**English**

- Manifest V3 Chrome extension.
- Popup command surface.
- Right-click image analysis.
- Webpage image picker.
- Screenshot region capture.
- Local image upload.
- Floating prompt panel.
- Chinese / English prompt output.
- JSON prompt, negative prompt, and style tags. English and JSON prompts are both generator-facing outputs.
- Recognizable person / character / work / scene anchors when visible evidence supports them.
- `style_index 0-100`, source-fidelity priorities, camera/cinema/lens/filter cues, material locks, original text/layout preservation, screenshot fidelity, and image-specific drift blockers in prompt output.
- Visual history MVP with local thumbnails.
- Quick history rail in the floating panel.
- Popup visual history grid.
- Local history in `chrome.storage.local`.
- Copy prompt / JSON / negative prompt.
- Open prompts in ChatGPT, Gemini, Midjourney, Jimeng, Lovart, Codex.
- Options page for Base URL, API Key, Model, default generator, and language.
- No bundled cloud by default.

**中文**

- Manifest V3 Chrome 扩展。
- Popup 操作入口。
- 右键图片识别。
- 页面选图。
- 页面区域框选截图。
- 本地图片上传。
- 浮动 Prompt 面板。
- 中文 / 英文 Prompt 输出。
- JSON Prompt、Negative Prompt 和 Style Tags。英文和 JSON 都是面向生成器的提示词输出。
- 在可见证据支持时保留真人 / 角色 / 作品 / 场景识别锚点。
- Prompt 输出包含 `style_index 0-100`、原图复原优先级、摄影/影视/镜头/滤镜 cue、材质锁定、原文/版式保留、截图保真和图片专属防漂移反向词。
- Visual History MVP，本地缩略图历史。
- 浮动面板里的最近历史抽屉。
- Popup 视觉历史网格。
- 历史记录保存在 `chrome.storage.local`。
- 复制 Prompt / JSON / Negative Prompt。
- 打开 ChatGPT、Gemini、Midjourney、即梦、Lovart、Codex 继续使用。
- Options 页面配置 Base URL、API Key、Model、默认生成器和语言。
- 默认不绑定任何 Zhijuan 云端服务。

## Generator Handoff v0.3.3 / 生成器交接 v0.3.3

v0.3.3 makes copied generator prompts cleaner for Image2 and other external image generators, including both natural-language and JSON prompt formats.

v0.3.3 优化复制到 Image2 等外部图像生成器的提示词，包括自然语言和 JSON 两种提示词格式。

**English**

- Normal Copy, history Copy, and Open in generator now use a generator-safe prompt.
- Structural JSON labels, Image2 labels, and reference-upload instructions are removed from generator-facing prompt text.
- JSON-like field fragments accidentally returned inside the generator prompt are cleaned before handoff.
- The JSON tab now starts with a generator-facing `prompt` field, not internal schema metadata.
- `schema_version: "reconstruction_v2"` is kept only in internal structured exports, not in the default JSON prompt unless it is truly visible text in the source image.
- Visible UI labels, printed words, and visible schema-like labels are preserved when they are part of the image.
- Common generator-specific syntax such as flags, prompt weights, LoRA tags, brackets, and `BREAK` is removed from generator-facing fields.
- Legacy history records remain copyable through fallback handling.

**中文**

- 普通复制、历史复制和“打开生成器”现在使用适合直接生成图片的安全提示词。
- 结构化 JSON 标签、Image2 标签和参考图上传指令不会再进入面向生成器的提示词正文。
- 如果模型误把 JSON 字段片段返回到生成提示词里，交接前会清理掉。
- JSON 标签页现在以面向生成器的 `prompt` 字段开头，不再以内部 schema 元数据开头。
- `schema_version: "reconstruction_v2"` 只保留在内部结构导出中；除非它确实是原图可见文字，否则不会进入默认 JSON 提示词。
- UI 标签、印刷文字和画面中真实可见的类似 schema 标签会被保留。
- 面向生成器的字段会移除常见生成器专属语法，例如参数 flag、prompt weight、LoRA 标签、括号 token 和 `BREAK`。
- 旧历史记录继续通过 fallback 保持可复制。

## Prompt Output v0.3.2 / 提示词输出 v0.3.2

v0.3.2 makes the English prompt the primary recreation prompt and removes redundant hidden output fields.

v0.3.2 将英文 Prompt 作为主要复刻提示词，并移除冗余隐藏输出字段。

**English**

- English Prompt is the primary copy-ready recreation prompt.
- Prompt length scales to the image instead of a fixed short cap.
- New model responses no longer request hidden Japanese output or duplicate recreation-prompt output.
- English style tags remain available.
- JSON output includes plain-language fidelity priorities so source-defining softness, compression, texture, clarity, or layout constraints have room to be preserved without generator-specific parameter syntax.
- Generator handoff uses the English Prompt.
- Old history remains readable through compatibility fallback.

**中文**

- 英文 Prompt 是主要可复制复刻提示词。
- 提示词长度按图片复原需要扩展，不再受固定短词数限制。
- 新模型响应不再请求隐藏日语输出或重复复刻提示词输出。
- 英文风格标签继续保留。
- JSON 输出新增自然语言复原优先级，让原图里的柔焦、压缩感、质地、清晰度或版式约束有表达空间，但不输出生成器专属参数语法。
- 生成器跳转使用英文 Prompt。
- 旧历史记录通过兼容 fallback 保持可读。

## Prompt Fidelity v0.3.0 / 提示词复刻 v0.3.0

v0.3.0 improves image-to-prompt-to-image reconstruction fidelity.

v0.3.0 优化“图片 -> 提示词 -> 图片”的复刻一致性。

**English**

- Keeps recognizable people, fictional characters, source works, stories, landmarks, and scene anchors when supported by visible evidence.
- Adds plain-language `style_index 0-100` for stylization strength without generator-specific syntax.
- Adds camera, cinema, focal length, aperture, filter, film, and color-grade cues as reconstruction language.
- Adds material and texture locks for matte, glossy, translucent, fabric, leather, brush, and vector surface behavior.
- Preserves original visible text language, typography hierarchy, dates, numbers, logos, UI layout, screenshot crop, and overlay z-order.
- Strengthens image-specific negative prompts for wrong identity, wrong crop, wrong material, oily/glossy drift, hard HDR, over-sharpening, and background drift.
- Adds a shared quality floor to reduce noise, color spots, cracks, collapse, distortion, greasy texture, and grainy artifacts.

**中文**

- 在可见证据支持时保留真人、虚构角色、作品、故事、地标和场景锚点。
- 新增自然语言 `style_index 0-100` 表达风格化强度，不输出生成器专属语法。
- 新增摄影、电影机、焦段、光圈、滤镜、胶片、调色等复刻 cue。
- 新增材质与质感锁定，覆盖哑光、高光、半透明、织物、皮革、笔触、矢量边缘等表面行为。
- 保留原始可见文字语言、字体层级、日期、数字、logo、UI 版式、截图裁切和浮窗叠层。
- 强化图片专属反向词，阻止身份错误、裁切错误、材质错误、油腻高光、过硬 HDR、过度锐化和背景漂移。
- 加入统一质量底线，减少噪点、色斑、裂纹、崩坏、扭曲、油腻质感和颗粒伪影。

## Visual History MVP / 视觉历史 MVP

v0.2.0 adds visual history.

v0.2.0 新增视觉历史。

**English**

- Local thumbnail preview.
- Compact quick history rail in the floating panel.
- Visual grid in the popup history page.
- Local storage budget protection.
- Broken image fallback.
- No separate image folder.

**中文**

- 本地缩略图预览。
- 浮动面板中的最近历史抽屉。
- Popup 历史视觉网格。
- 本地存储预算保护。
- 图片损坏 fallback。
- 不额外创建本地图片文件夹。

Thumbnails are stored in `chrome.storage.local`. Images are not uploaded to a Zhijuan server by default.

缩略图保存在 `chrome.storage.local`。默认不会把图片上传到 Zhijuan 服务器。

## Quick Start / 快速开始

Requirements:

- Node.js 20+.
- npm 10+.
- Chrome 120+ or recent Microsoft Edge.
- Your own OpenAI-compatible vision endpoint.

需要 Node.js 20+、npm 10+、Chrome 120+ 或新版 Edge，以及你自己配置的多模态视觉 API。

### Install from source / 从源码安装

```bash
npm ci
npm run typecheck
npm run build
```

**Chrome / Edge**

1. Open `chrome://extensions`.
2. Or open `edge://extensions` for Microsoft Edge.
3. Enable Developer Mode.
4. Click Load unpacked / 加载已解压扩展.
5. Select `dist/`.
6. Open extension options and configure endpoint, key, and model.

中文：执行构建命令后，在 Chrome 或 Edge 扩展页面启用开发者模式，加载 `dist/`，再到扩展设置填写 endpoint、key、model。

### Install from GitHub release zip / 从 GitHub Release zip 安装

The browser-store versions are not published yet. Until Chrome Web Store / Edge Add-ons listings are available, use the source build or the GitHub release zip.

Chrome Web Store / Edge Add-ons 暂未发布。正式商店版本可用前，请使用源码构建或 GitHub release zip。

1. Download `zhijuan-prompt-card-<version>.zip` from the GitHub release page.
2. Unzip it into a local folder.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable Developer Mode.
5. Click Load unpacked / 加载已解压扩展.
6. Select the unzipped folder that contains `manifest.json`.
7. Open extension options and configure Base URL, API Key, and Model.

Release package verification / 发布包核验：

```bash
VERSION=$(node -p "require('./package.json').version")
unzip -p "release/zhijuan-prompt-card-$VERSION.zip" manifest.json
```

The `version` in `manifest.json` should match `package.json`.

`manifest.json` 中的 `version` 应与 `package.json` 一致。

## Configuration / 配置

The extension calls an OpenAI-compatible Chat Completions endpoint.

插件调用 OpenAI-compatible Chat Completions 端点。

```text
POST {BASE_URL}/chat/completions
```

The endpoint must support:

- `image_url` input with data URL.
- Vision understanding.
- Text response containing JSON that matches the expected schema.

端点需要支持：

- 使用 data URL 的 `image_url` 输入。
- 视觉理解能力。
- 返回符合预期 schema 的 JSON 文本。

Request parameter compatibility:

- GPT-5, o-series, and reasoning model names use `max_completion_tokens` with `reasoning_effort: medium`.
- Older models and ordinary compatible endpoints keep `max_tokens` and `temperature`.
- If an endpoint rejects `max_tokens`, `temperature`, or `reasoning_effort` as unsupported, the extension retries once with the safer compatible option.

请求参数兼容：

- GPT-5、o-series 和 reasoning 模型名使用 `max_completion_tokens`，并设置 `reasoning_effort: medium`。
- 旧模型和普通兼容端点保留 `max_tokens` 与 `temperature`。
- 如果端点返回 `max_tokens`、`temperature` 或 `reasoning_effort` 不支持，扩展会用更兼容的参数安全重试一次。

Settings:

- Base URL: your endpoint base URL.
- API Key: your endpoint API key. Stored locally in `chrome.storage.local`.
- Model: your vision-capable model name.

配置项：

- Base URL：你的 endpoint base URL。
- API Key：你的 endpoint API key，保存在 `chrome.storage.local`。
- Model：你的视觉模型名称。

## Recommended Setup: BridgeDeck / 推荐配置：BridgeDeck

BridgeDeck is an optional local OpenAI-compatible bridge adapter maintained separately: [github.com/papperrollinggery/bridgedeck](https://github.com/papperrollinggery/bridgedeck).

It is useful when you want Zhijuan Prompt Card to call a local bridge endpoint instead of wiring every model provider directly into the extension. BridgeDeck can expose a `/v1` API shape that the extension can use as its vision endpoint, while the extension itself stays local-first and provider-neutral.

BridgeDeck is not bundled with Zhijuan Prompt Card and is not required.

BridgeDeck 是一个可选的本地 OpenAI-compatible bridge adapter，独立维护：[github.com/papperrollinggery/bridgedeck](https://github.com/papperrollinggery/bridgedeck)。

当你希望 Zhijuan Prompt Card 调用本地 bridge endpoint，而不是把每个模型服务商都直接接进扩展时，BridgeDeck 更适合作为推荐配置。它可以提供扩展可用的 `/v1` 视觉端点形态，同时让扩展本身保持本地优先和 provider-neutral。

BridgeDeck 不随 Zhijuan Prompt Card 打包，也不是必需项。

Example local configuration:

```text
Base URL:
http://127.0.0.1:8876/v1

API Key:
local-bridge

Model:
gpt-5.5
```

If BridgeDeck is not running locally, replace these values with your own compatible vision endpoint.

如果你没有在本机运行 BridgeDeck，请把这些值替换成自己的多模态视觉模型 API。

`gpt-5.5` is a BridgeDeck model alias in the maintainer workflow. Users can use any compatible multimodal vision model. The extension does not include model access, API credits, or a Zhijuan forwarding server by default.

`gpt-5.5` 是维护者工作流里的 BridgeDeck model alias。用户可以使用任何兼容的多模态视觉模型。扩展本身不包含模型访问、不包含 API credits，也默认不通过 Zhijuan 服务器转发。

## Privacy / 隐私边界

![Local-first privacy boundary](docs/assets/readme/imagegen/readme-local-first.png)

**English**

- No login.
- No credits.
- No telemetry.
- No analytics.
- No bundled Zhijuan cloud.
- The extension does not operate a server.
- Selected images are sent only to the endpoint configured by the user.
- API keys are stored in `chrome.storage.local`.
- Prompt history is stored in `chrome.storage.local`.
- Visual thumbnails are stored in `chrome.storage.local`.
- Local image files are not copied into a separate folder.

**中文**

- 无登录。
- 无 credits。
- 无 telemetry。
- 无 analytics。
- 不内置 Zhijuan 云端。
- 扩展本身不运营服务器。
- 选中的图片只发送到用户自己配置的 endpoint。
- API key 保存在 `chrome.storage.local`。
- Prompt 历史保存在 `chrome.storage.local`。
- 视觉缩略图保存在 `chrome.storage.local`。
- 本地图片文件不会另存到单独文件夹。

## Permissions / 权限说明

Zhijuan Prompt Card uses broad page access because image picking, right-click analysis, floating panels, and region capture must work on arbitrary user-selected pages. The extension does not analyze a page until the user triggers an action.

Zhijuan Prompt Card 需要较宽的页面访问权限，是为了在用户主动操作时支持任意网页图片、右键分析、浮动面板和页面区域框选。用户未触发操作前，扩展不会主动分析页面。

| Permission | Why it is used |
|---|---|
| `contextMenus` | Adds right-click image analysis. |
| `storage` | Stores settings, local prompt history, and local thumbnails. |
| `scripting` | Injects the image picker, floating panel, and generator handoff helpers. |
| `clipboardWrite` | Copies prompts, JSON, and negative prompts. |
| `<all_urls>` | Lets the content script and image picker work on user-selected HTTP/HTTPS pages. |
| `file:///*` | Allows local-file-page testing and local HTML workflows when the browser user enables file access for the unpacked extension. |

| 权限 | 用途 |
|---|---|
| `contextMenus` | 提供右键图片分析入口。 |
| `storage` | 保存本地设置、Prompt 历史和本地缩略图。 |
| `scripting` | 注入页面选图、浮动面板和生成器跳转辅助逻辑。 |
| `clipboardWrite` | 复制 Prompt、JSON 和 Negative Prompt。 |
| `<all_urls>` | 支持在用户主动选择的 HTTP/HTTPS 页面上选图和框选。 |
| `file:///*` | 支持本地 HTML / 本地文件页面测试；浏览器仍需用户为扩展开启文件访问。 |

## Model Compatibility / 模型兼容

Model compatibility depends on whether your endpoint supports OpenAI-compatible chat completions with vision input.

模型兼容性取决于你的端点是否支持带视觉输入的 OpenAI-compatible chat completions。

Currently maintainer-tested:

| Adapter | Model | Status | Notes |
|---|---|---|---|
| BridgeDeck | gpt-5.5 | Recommended | Maintainer-tested reconstruction quality |

Community-tested models are tracked in [docs/MODELS.md](docs/MODELS.md).

社区测试模型记录在 [docs/MODELS.md](docs/MODELS.md)。

## Why Open Source? / 为什么开源

**English**

- Transparent privacy boundary.
- Community model compatibility reports.
- Prompt schema improvement.
- Browser compatibility fixes.
- Safer local-first workflow.
- Easier trust review.

**中文**

- 隐私边界透明。
- 社区共同补充模型兼容报告。
- 共同改进 Prompt schema。
- 修复不同浏览器兼容问题。
- 保持更安全的本地优先工作流。
- 方便用户审查和信任。

## Roadmap / 路线图

Short-term / 短期：

- Better onboarding / 更好的 onboarding。
- Export history / 导出历史。
- Import/export settings / 导入导出设置。
- More generator presets / 更多生成器 preset。
- More model compatibility notes / 更多模型兼容说明。
- Better prompt schema tests / 更完整的 prompt schema 测试。
- Better visual history smoke coverage / 更完整的视觉历史 smoke 覆盖。

Longer-term work should keep the extension local-first, transparent, and usable with user-configured model endpoints.

长期维护继续围绕本地优先、边界透明、用户自配模型端点展开。

## Contributing / 贡献

See [CONTRIBUTING.md](CONTRIBUTING.md).

查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

Maintenance principles / 维护原则：

- Small PRs preferred / 优先小 PR。
- Issue first for large changes / 大改先开 issue。
- No telemetry / 不接受 telemetry。
- No forced cloud dependency / 不接受强制云端依赖。
- No hardcoded private endpoints / 不接受硬编码私有 endpoint。
- No paywall inside open-source core / 开源核心不加入付费锁。
- Network behavior must be documented / 网络行为必须文档化。

## License / 许可证

Apache-2.0.

The code is licensed under Apache-2.0. Third-party dependency notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The name "Zhijuan Prompt", logos, and official cloud service branding are not licensed for commercial reuse without prior permission.

代码使用 Apache-2.0 许可证。第三方依赖声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。名称 "Zhijuan Prompt"、相关 logo、官方云服务品牌不授权未经许可的商业复用。
