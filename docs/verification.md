# Verification

## v0.3.1 Test Build

- Prompt optimization goal: pass, `npm run check:prompt-goal`.
- Prompt goal coverage: 46 contract rules, 10 reconstruction priorities, 6 simulated human cases.
- Simulated prompt cases: high-style anime energy, monochrome studio portrait, Chinese concert poster, sports dashboard screenshot with overlay, real-person bathroom mirror selfie, casual smartphone photo.
- Typecheck: pass, `npm run typecheck`.
- Storage check: pass, `npm run check:storage`.
- URL check: pass, `npm run check:url`.
- Diff whitespace: pass, `git diff --check`.
- Build: pass, `npm run build`.
- Test package: pass, `npm run release:package`.
- Release scan: pass, `npm run release:check`.
- Package output: `release/zhijuan-prompt-card-0.3.1.zip`.
- Package sha256: `1c03c4fe0623146809726f0ee4aee0e13d9280f250b62a7414de7b95fadc5c20`.
- Dist manifest: pass, manifest `version` is `0.3.1`, `version_name` is `0.3.1 Prompt Balance Test`.
- Zip manifest: pass, manifest `version` is `0.3.1`, `version_name` is `0.3.1 Prompt Balance Test`.
- BridgeDeck model smoke: pass, `gpt-5.5` through `http://127.0.0.1:8876/v1`.
- Model smoke cases: real-person bathroom mirror selfie preserved East Asian-presenting cue, warm skin tone, natural makeup, casual selfie context, mirror smudges, and no forced cinema terms; Tatsumaki image preserved `Tatsumaki / Tornado of Terror from One Punch Man`; Luo Tianyi poster preserved `洛天依`, Chinese title/date text, and poster layout.
- v0.3.1 scope: prompt-only balance update, stronger real-person visible appearance fidelity, conditional camera/style/quality guidance, negative prompt blocker limits, version bump for browser testing.
- Release status: not tagged and not published. This build is for user browser testing before a GitHub release.

## Release 0.3.0

- Prompt optimization goal: pass, `npm run check:prompt-goal`.
- Prompt goal coverage: 35 contract rules, 10 reconstruction priorities, 4 simulated human cases.
- Simulated prompt cases: high-style anime energy, monochrome studio portrait, Chinese concert poster, sports dashboard screenshot with overlay.
- Typecheck: pass, `npm run typecheck`.
- Storage check: pass, `npm run check:storage`.
- URL check: pass, `npm run check:url`.
- Diff whitespace: pass, `git diff --check`.
- Build: pass, `npm run build`.
- Visual history smoke: pass, `npm run smoke:history`.
- Bilibili E2E: pass, `npm run e2e:bilibili`.
- Release package: pass, `npm run release:package`.
- Release scan: pass, `npm run release:check`.
- Package output: `release/zhijuan-prompt-card-0.3.0.zip`.
- Dist manifest: pass, manifest `version` is `0.3.0`, `version_name` is `0.3.0 Prompt Fidelity`.
- Zip manifest: pass, manifest `version` is `0.3.0`, `version_name` is `0.3.0 Prompt Fidelity`.
- Zip required notices: pass, includes `LICENSE`, `NOTICE`, `PRIVACY.md`, `THIRD_PARTY_NOTICES.md`.
- v0.3.0 scope: reverse prompt contract, prompt goal checks, bilingual release/update copy, version bump, docs.
- UI structure: unchanged except update notices can show the GitHub release title when available.
- Privacy/network scope: unchanged; update check still reads GitHub latest release metadata and image analysis still uses the user-configured endpoint.

## Release 0.2.0

- Clean install: pass, `npm ci`.
- Typecheck: pass, `npm run typecheck`.
- Storage check: pass, `npm run check:storage`.
- URL check: pass, `npm run check:url`.
- Build: pass, `npm run build`.
- Visual history smoke: pass, `npm run smoke:history`.
- Bilibili E2E: pass, `npm run e2e:bilibili`.
- Release package: pass, `npm run release:package`.
- Release scan: pass, `npm run release:check`.
- Package output: `release/zhijuan-prompt-card-0.2.0.zip`.
- Zip manifest: pass, manifest `version` is `0.2.0`.
- Zip required notices: pass, includes `LICENSE`, `NOTICE`, `PRIVACY.md`, `THIRD_PARTY_NOTICES.md`.
- Precise zip secret scan: pass, no matches for private account paths, API keys, API key environment names, bearer tokens, or local absolute home paths.
- Old unsafe test package: removed from `release/` and quarantined under ignored `tmp/quarantine/`.

## Build

- Prompt optimization goal: pass, `npm run check:prompt-goal`
- Typecheck: pass, `npm run typecheck`
- Build: pass, `npm run build`
- Dev checks: pass, `npm run check:storage && npm run check:url`
- Diff whitespace: pass, `git diff --check`
- Permission/privacy grep: pass, no matches for `supabase|stripe|wechat|analytics|google sign|identity` in `src public package.json`

## UI Redesign V2

- `zhijuan-super-image-gen`: pass, accepted run `20260523-180424-black-glass-clean-ui-board`
- Design board: pass, `docs/ui-redesign-v2/design-board.html`
- Component detail board: pass, `docs/ui-redesign-v2/component-detail.html`
- Component spec: pass, `docs/ui-redesign-v2/component-spec.md`
- Design review: pass, `docs/ui-redesign-v2/review.md`
- Popup redesign: pass, command puck + bottom utility dock.
- Result panel redesign: pass, result lens with left flow rail, source strip, prompt output, expanded and minimized states.
- Picker overlay redesign: pass, black glass veil, lake-green hover frame, selected stamp.
- Options redesign: pass, drawer-style settings workbench.
- Palette check: pass, old cyan/orange implementation colors removed from `src`.

## Chrome Load

- `dist/manifest.json`: present
- `dist/popup.html`: present
- `dist/options.html`: present
- `dist/background.js`: present
- `dist/content.js`: present
- Chrome package validation: pass, `Google Chrome --pack-extension="$(pwd)/dist"`
- Chrome for Testing unpacked load: pass, extension state `ENABLED`, location `UNPACKED`, no manifest errors.
- Popup as extension page: pass, default BridgeDeck settings visible.
- Content script injection on local HTTP page: pass.
- UI redesign board render: pass, `docs/ui-redesign/component-board.html`
- Content panel redesign harness render: pass, `docs/screenshot-harness.html?mode=result`
- UI v2 design board render: pass, `docs/ui-redesign-v2/design-board.html`
- UI v2 component detail render: pass, `docs/ui-redesign-v2/component-detail.html`
- UI v2 popup render: pass, `dist/popup.html`
- UI v2 options render: pass, `dist/options.html`
- UI v2 expanded panel harness render: pass, `docs/screenshot-harness.html?mode=result`
- UI v2 collapsed panel harness render: pass, `docs/screenshot-harness.html?mode=collapsed`

## BridgeDeck

- Base URL: `http://127.0.0.1:8876/v1`
- API key: `local-bridge`
- Model: `gpt-5.5`
- Vision request: pass
- Schema parse through `analyzeImageWithApi`: pass
- Extension-triggered image analysis through BridgeDeck: pass.
- Floating panel result render: pass, English prompt/recreation/negative controls visible.
- Copy button: pass, `Prompt copied` notice shown.
- Generator open: pass, Gemini tab opened.
- History after image analysis: pass, one successful local entry.
- Screenshot selection overlay: pass, full-viewport overlay and drag selection render correctly.
- Screenshot region analysis: pass, selected region is captured through `chrome.tabs.captureVisibleTab` and cropped from the real visible-tab bitmap.
- Capture path: real visible-tab capture only; denied capture now surfaces as an error instead of falling back to DOM-rendered pseudo screenshots.

## Bilibili E2E

- Command: pass, `npm run e2e:bilibili`
- Extension load: pass, temporary Chromium profile loaded unpacked `dist`.
- Bilibili content script: pass, `zhijuan-prompt-root` shadow root injected.
- Region capture target preview: pass, saved data URL under `tmp/browser-tests/`.
- Region capture pixels: pass, `width=360`, `height=170`, `blackRatio=0`, `brightRatio=0.9633040935672514`.
- Full flow: pass, region capture, copy prompt, copy JSON, favorite toggle, regenerate, image pick, local file, collapse, history, and language toggle.

## Example Output JSON

```json
{
  "subject": "One large saturated orange circular disk, abstract sun-like form, centered in a simple geometric landscape.",
  "colors": ["deep black-navy", "vivid orange", "warm off-white"],
  "en_style_tags": ["minimal geometry", "flat vector", "abstract sunset", "high contrast"],
  "recreation_prompt_sample": "A clean minimalist flat vector illustration of an abstract sunset icon: a single vivid orange circular disk centered horizontally in the upper middle of a solid deep black-navy canvas..."
}
```

## Screenshots

- `docs/screenshots/popup.png`
- `docs/screenshots/settings.png`
- `docs/screenshots/history.png`
- `docs/screenshots/loading-panel.png`
- `docs/screenshots/result-panel.png`
- `docs/screenshots/chrome-load.json`
- `docs/screenshots/ui-redesign-board.png`
- `docs/screenshots/ui-redesign-panel-harness.png`
- `docs/screenshots/ui-redesign-v2-board.png`
- `docs/screenshots/ui-redesign-v2-components.png`
- `docs/screenshots/ui-redesign-v2-popup.png`
- `docs/screenshots/ui-redesign-v2-panel.png`
- `docs/screenshots/ui-redesign-v2-collapsed.png`
- `docs/screenshots/ui-redesign-v2-options.png`

## Known Issues

- Chrome does not auto-refresh unpacked extensions after rebuild. Use the refresh icon on `chrome://extensions`.
