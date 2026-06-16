# Model Compatibility

Zhijuan Prompt Card requires an OpenAI-compatible Chat Completions endpoint with vision input support.

## Maintainer-tested

| Adapter | Model | Status | Notes |
|---|---|---|---|
| BridgeDeck | gpt-5.5 | Recommended | Best reconstruction quality in the maintainer workflow; v0.3.0 prompt constraints are tuned for structured visual reconstruction |

## v0.3.0 prompt expectations / v0.3.0 提示词预期

**English**

- The model should preserve recognizable people, fictional characters, works, stories, landmarks, and scenes when visible evidence supports them.
- The model should use `style_index 0-100`, camera/cinema/lens/filter cues, material locks, and image-specific negative prompts.
- Camera and lens terms are reconstruction cues, not factual metadata unless clearly visible.

**中文**

- 当可见证据支持时，模型应保留真人、虚构角色、作品、故事、地标和场景锚点。
- 模型应输出 `style_index 0-100`、摄影/影视/镜头/滤镜 cue、材质锁定和图片专属反向词。
- 摄影机与镜头词是复刻视觉 cue，除非画面明确证明，否则不是事实元数据。

## Community-tested

| Provider / Adapter | Model | Status | Notes |
|---|---|---|---|
| TBD | TBD | TBD | Open a model compatibility issue |

## Report compatibility

Please open a Model Compatibility issue with:

- Provider / adapter
- Model
- Endpoint style
- Vision support
- Error message
- Non-sensitive example config
