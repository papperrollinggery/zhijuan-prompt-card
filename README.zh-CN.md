# Zhijuan Prompt Card

[English](README.md) | **简体中文**

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853)
![Local-first](https://img.shields.io/badge/local--first-yes-2EA043)
![Telemetry](https://img.shields.io/badge/telemetry-none-2EA043)

Zhijuan Prompt Card 是一个本地优先的 Chrome 扩展：把网页图片、页面截图区域和本地图片转换成可直接交给图像生成器使用的提示词。识别能力来自你自己配置的 OpenAI-compatible 视觉模型端点。

![Zhijuan Prompt Card 产品概览](docs/assets/readme/imagegen/readme-banner.png)

## 为什么需要它

很多 image-to-prompt 工具会把分析文字、模型元数据、参考图上传指令和真正的生成提示词混在一起。Zhijuan Prompt Card 只聚焦一件事：选中视觉参考，提取复刻图片所需的提示词语言，然后复制或打开到你正在使用的生成器。

这个项目不提供 Zhijuan 托管 AI 服务。你需要自己配置兼容端点、API Key 和模型。

## 核心能力

- 从网页选择图片、右键识别图片元素、框选页面区域，或上传本地文件。
- 输出中文提示词、英文提示词、面向生成器的 JSON Prompt、反向词和风格标签。
- 在模型可识别时保留画面文字、版式层级、主体锚点、镜头线索、材质行为和原图保真约束。
- 本地保存视觉历史、缩略图和可复制的提示词结果。
- 支持打开到 ChatGPT、Gemini、Midjourney、即梦、Lovart、Codex 或自定义生成器地址。
- 配置和历史默认保存在 Chrome 本地存储。
- 使用你自己的 OpenAI-compatible Chat Completions 视觉端点。

## 工作流

![Zhijuan Prompt Card 工作流](docs/assets/readme/imagegen/readme-workflow.png)

```text
网页图片 / 页面框选 / 本地文件
-> Zhijuan Prompt Card
-> 你配置的 OpenAI-compatible 视觉端点
-> 结构化提示词输出
-> 复制 / 打开生成器
```

## 提示词输出

Zhijuan Prompt Card 会把可复制提示词和内部结构化数据分开。

| 输出 | 用途 |
|---|---|
| English | 外部图像生成器的主要复刻提示词 |
| Chinese | 中文工作流下的查看、编辑和复用 |
| JSON | 面向生成器的 JSON Prompt，首字段为 `prompt` |
| Negative | 防漂移和质量约束 |
| Tags | 简洁的风格、材质标签 |

从 v0.3.3 开始，普通复制、历史复制和“打开生成器”都会使用 generator-safe prompt。`schema_version: "reconstruction_v2"` 这类内部结构元数据只保留在结构化导出中，不会再默认进入生成器提示词，除非它确实是原图里可见的文字。

## 安装

### 从 GitHub Release 安装

Chrome Web Store 和 Edge Add-ons 版本暂未发布。正常测试建议使用 Release zip。

1. 从 [Releases](https://github.com/papperrollinggery/zhijuan-prompt-card/releases/latest) 下载最新 `zhijuan-prompt-card-<version>.zip`。
2. 解压文件。
3. 打开 `chrome://extensions` 或 `edge://extensions`。
4. 启用开发者模式。
5. 点击“加载已解压的扩展程序”。
6. 选择包含 `manifest.json` 的解压目录。
7. 打开扩展设置页，填写 endpoint、API Key 和 model。

### 从源码构建

要求：

- Node.js 20+
- npm 10+
- Chrome 120+ 或新版 Microsoft Edge
- OpenAI-compatible 视觉模型端点

```bash
npm ci
npm run typecheck
npm run build
```

然后把生成的 `dist/` 目录作为未打包扩展加载。

## 配置

在扩展设置页填写：

| 字段 | 含义 |
|---|---|
| Base URL | OpenAI-compatible API base URL，例如 `http://127.0.0.1:3777/v1` |
| API Key | 你的服务商或本地适配器 key |
| Model | 支持视觉输入的 chat model |
| Default Generator | 点击交接按钮时打开的外部生成器 |
| Language | 默认 UI/输出语言偏好 |

### 推荐配置：BridgeDeck

[BridgeDeck](https://github.com/papperrollinggery/bridgedeck) 是一个可选的本地 OpenAI-compatible bridge adapter，独立维护。当你希望 Zhijuan Prompt Card 调用本地 bridge endpoint，而不是把每个模型服务商都直接接进扩展时，BridgeDeck 更适合作为推荐配置。

BridgeDeck 可以提供扩展可用的 `/v1` 视觉端点形态，同时让扩展本身保持本地优先和 provider-neutral。BridgeDeck 不随 Zhijuan Prompt Card 打包，也不是必需项。

本地示例配置：

```text
Base URL:
http://127.0.0.1:8876/v1

API Key:
local-bridge

Model:
gpt-5.5
```

如果你没有在本机运行 BridgeDeck，请把这些值替换成自己的多模态视觉模型 API。`gpt-5.5` 是维护者工作流里的 BridgeDeck model alias。用户可以使用任何兼容的多模态视觉模型。扩展本身不包含模型访问、不包含 API credits，也默认不通过 Zhijuan 服务器转发。

已测试适配器和上报方式见 [Model Compatibility](docs/MODELS.md)。

## 隐私模型

![本地优先隐私边界](docs/assets/readme/imagegen/readme-local-first.png)

- 不内置 Zhijuan 云端 endpoint。
- 不包含隐藏 telemetry。
- API Key 保存在 Chrome 扩展存储中。
- 提示词历史和缩略图保存在 `chrome.storage.local`。
- 图片只会发送到你自己配置的 endpoint。
- Release 包可由源码构建复现。

完整公开说明见 [PRIVACY.md](PRIVACY.md)、[SECURITY.md](SECURITY.md) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 文档入口

| 需求 | 链接 |
|---|---|
| 版本更新历史 | [CHANGELOG.md](CHANGELOG.md) |
| 安装与发布流程 | [docs/RELEASE.md](docs/RELEASE.md) |
| 模型兼容性 | [docs/MODELS.md](docs/MODELS.md) |
| 已安装扩展验收检查 | [docs/installed-extension-acceptance.md](docs/installed-extension-acceptance.md) |
| 截图与素材 | [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) |
| 贡献指南 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 行为准则 | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

## 开发

常用检查：

```bash
npm run typecheck
npm run build
npm run check:storage
npm run check:json-repair
npm run check:prompt-goal
```

打包 release zip：

```bash
npm run release:package
```

检查 release 包：

```bash
npm run release:check
```

## 项目状态

- 最新版本：[v0.3.3](https://github.com/papperrollinggery/zhijuan-prompt-card/releases/tag/v0.3.3)
- 分发方式：GitHub release zip 和源码构建
- 浏览器商店：暂未发布
- License：[Apache-2.0](LICENSE)

Release tag 保持机器友好格式，例如 `v0.3.3`。详细用户可见变化放在 [CHANGELOG.md](CHANGELOG.md) 和 GitHub release notes。

## 贡献

欢迎贡献浏览器兼容性、提示词 schema、生成器预设、模型兼容性记录、文档和 i18n。较大 PR 前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

Apache-2.0。见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。
