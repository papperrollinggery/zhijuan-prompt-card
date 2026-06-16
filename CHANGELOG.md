# Changelog

## 0.3.1

**English**

- Rebalanced image-to-prompt reconstruction constraints so the model observes first and applies only relevant prompt controls.
- Improves real-person reconstruction fidelity for visible facial structure, skin tone, skin texture, hair, pose, body proportions, and casual photo context.
- Improves consistency between natural prompts and JSON output so important visible facts are less likely to be dropped.
- Better preserves ambiguous material, pattern, and surface details instead of overfitting them into generic categories.
- Keeps language prompt tabs focused on copy-ready prompt text instead of mixing in analysis text.
- Makes camera, style, quality, and negative-prompt guidance more conditional to reduce over-polished or generic outputs.

**中文**

- 重新平衡图片反推提示词约束，让模型先观察图像，再按需启用复刻控制。
- 改进真人图片的脸型、肤色、皮肤质感、发型、姿势、身体比例和生活照场景保真。
- 改进普通提示词和 JSON 输出的一致性，减少关键可见信息丢失。
- 更好保留复杂材质、图案和表面关系，减少被误写成通用类别。
- 语言提示词标签页只保留可直接复制使用的提示词，不再混入分析文本。
- 摄影、风格、质量和反向词约束改为更动态，减少过度精修和泛化输出。

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
