# v0.3.4 GitHub Release Draft

Status: local release candidate only. Do not publish this release until user-installed refreshed-extension acceptance passes.

- Tag: `v0.3.4`
- Title: `v0.3.4`
- Asset: `release/zhijuan-prompt-card-0.3.4.zip`
- SHA256: `064b6b3233f6df39cdcfc24902273028251aca2bf99aa4befaef72d8328f83a1`

## Release Body

### English

This release improves image-to-prompt-to-image reconstruction fidelity for generator handoff.

- Portrait, landscape, and square source images now preserve their source orientation, aspect ratio, and crop more consistently across English prompt copy, JSON prompt copy, and Open in generator.
- Contradictory frame wording from compatible vision models is corrected before the prompt reaches image generators.
- JSON Prompt copy now uses a structured generator-facing reconstruction prompt: adaptive modules, whole-image atmosphere, subject, composition, style, color, visible text, constraints, and auxiliary description. Internal schema fields stay out of the copied prompt.
- Source-style guidance now better separates visible subject matter from rendering style, so subject labels, costumes, eras, or genre guesses are less likely to override the actual medium, abstraction level, detail budget, and ornament density of the source image.
- Negative prompts keep style and detail blockers conditional, reducing over-heavy universal blocker lists while still protecting low-detail, soft, flat, or layout-critical sources from common drift.
- Popup and options HTML were simplified to avoid Chrome extension load warnings around module preloading.
- The injected page script now handles extension reloads more quietly and is checked against real page injection, reducing Chrome extension error-list noise.

Privacy and network behavior are unchanged: the extension remains local-first and BYOK; selected images are sent only to the user-configured endpoint. This release adds no telemetry, analytics, payment lock, or forced cloud dependency.

Verification before publication:

- `npm run check:storage`
- `npm run check:json-repair`
- `npm run check:prompt-goal`
- `npm run check:api-options`
- `npm run check:content-script`
- `npm run check:extension-pages`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:history`
- `npm run test:real-extension`
- `npm run release:package`
- `npm run release:check`
- User-installed refreshed-extension acceptance: pass before publishing

### 中文

这个版本优化“图片 -> 提示词 -> 图片”的复刻链路，重点是把真正交给图像生成器的提示词变得更稳定。

- 竖版、横版和方图会更稳定地保留原图方向、比例和裁切，并贯穿英文复制、JSON Prompt 复制和“打开生成器”链路。
- 兼容视觉模型偶尔返回的矛盾画幅描述，会在交给生成器前被修正。
- JSON Prompt 复制现在是面向生成器的结构化复原提示词：包含动态模块、整图氛围、主体、构图、风格、色彩、可见文字、约束和辅助描述。内部 schema 字段不会进入复制内容。
- 源图风格约束会更清楚地区分“可见主体”和“渲染风格”，避免主体标签、服饰、时代或类型推断压过原图真实的媒介、抽象程度、细节密度和装饰密度。
- 反向词里的风格/细节 blocker 保持条件式，避免所有提示词都变成过重的通用禁止词，同时继续保护低细节、柔和、扁平或版式关键的图片不发生常见漂移。
- 简化 popup 和 options HTML，避免 Chrome 插件页围绕 module preload 出现加载警告。
- 网页注入脚本会更安静地处理扩展重新加载，并增加真实页面注入检查，减少 Chrome 插件错误列表噪音。

隐私和网络行为没有变化：插件仍是 local-first 和 BYOK；被选择的图片只发送到用户自己配置的端点。本版本没有新增遥测、分析、付费锁或强制云依赖。

发布前验证：

- `npm run check:storage`
- `npm run check:json-repair`
- `npm run check:prompt-goal`
- `npm run check:api-options`
- `npm run check:content-script`
- `npm run check:extension-pages`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:history`
- `npm run test:real-extension`
- `npm run release:package`
- `npm run release:check`
- 用户安装版刷新验收：发布前必须通过
