# Verification

## v0.3.3 Release Build

- Prompt handoff regression: pass, `npm run check:storage`; covers schema wrapper stripping, generator-facing JSON prompt output with top-level `prompt`, generator-facing JSON field sanitization, JSON-like field fragments accidentally returned inside generator prompts, quoted `generation_prompt` labels, nested JSON prompt wrappers, true visible `generation_prompt` code-label preservation, Image2 prompt-label stripping, upload/reference wrapper stripping, visible-text preservation, shorthand `reference(s)`, plural `as references`, naturalized no-reference-upload wording, legacy fallback, and generator syntax cleanup.
- JSON repair regression: pass, `npm run check:json-repair`.
- Prompt goal coverage: pass, `npm run check:prompt-goal`; 60 contract rules, 12 simulated fidelity cases, 1 simulated JSON generator-readiness case.
- Typecheck: pass, `npm run typecheck`.
- Build: pass, `npm run build`.
- Built bundle label check: pass, built `dist/content.js` and `dist/assets/popup.js` include generator-facing JSON prompt labels and `setFilledGeneratorJsonField(output, "prompt", getGeneratorPrompt(analysis))`.
- Bilibili E2E: pass, `npm run e2e:bilibili`, `tmp/browser-tests/pw-e2e-summary-1782027891136.json`; includes `copy_english_prompt_ok` and `copy_json_ok`, with JSON copy parsed and asserted to put `prompt` first and exclude `schema_version` / `reconstruction_v2`.
- Visual history smoke: pass, `npm run smoke:history`, `tmp/browser-tests/pw-visual-history-summary-1782027867785.json`; 14, 35, and 100 record cases, running-history guard, clear-sync guard, popup history rendering, and visible `复制 JSON 提示词` actions passed.
- Automated real-extension UI test: pass, `npm run test:real-extension`, `tmp/browser-tests/manual-real-extension-summary-1782027119160.json`; loaded the built extension in a temporary Chromium profile, saved real BridgeDeck settings with redacted evidence, then analyzed README page image pick and local file upload through the actual UI. Both returned `reconstruction_v2`, `en.prompt`, `json_prompt.generation_prompt`, `json_prompt.generation_negative_prompt`, `json_prompt.spatial_dynamics`, `json_prompt.fidelity_priorities`, dynamic `observation_units`, dynamic `reconstruction_priorities`, no hidden Japanese output, and no duplicate recreation-prompt field. This does not replace the separate user-installed refreshed-extension acceptance gate. Page image pick returned 375 English prompt words, 445 JSON generation prompt words, 74 spatial dynamics words, 8 observation units, and 5 reconstruction priorities. Local upload returned 328 English prompt words, 472 JSON generation prompt words, 67 spatial dynamics words, 9 observation units, and 5 reconstruction priorities.
- Release package: pass, `npm run release:package`.
- Release scan: pass, `npm run release:check`.
- Package output: `release/zhijuan-prompt-card-0.3.3.zip`.
- Package sha256: `f5f5f9f206c40fe6da225835ac706c9adc077c089e60041e14e07d9dd4c9a39e`.
- Dist manifest: pass, manifest `version` is `0.3.3`, `version_name` is `0.3.3 Prompt Handoff`.
- Zip manifest: pass, manifest `version` is `0.3.3`, `version_name` is `0.3.3 Prompt Handoff`.
- Diff whitespace: pass, `git diff --check`.
- Targeted cold review: pass with operational note. CEO/control thread reviewed the final diff for prompt-handoff scope, history JSON copy parity, internal structured export preservation, visible-text exceptions, docs/tests consistency, and unrelated file risk. `codex review --base HEAD` was interrupted after entering a non-terminating sanitizer review loop; before interruption it ran `npm run typecheck`, `npm run check:storage`, `npm run build`, and `npm run check:prompt-goal` without emitting a blocker.
- Cloud Codex review gate: final pushed PR head still requires a fresh cloud review before merge. Prior cloud review is stale after this local JSON prompt contract update.
- v0.3.3 scope: generator-safe prompt handoff for normal copy, history copy, JSON prompt copy, and Open in generator; default JSON output starts with a generator-facing `prompt` field instead of internal schema metadata; schema/Image2/reference-upload wrappers stay out of generator-facing prompt text unless they are true visible text.
- Release status: pushed to PR branch; pending current-head cloud review with no blockers, user-installed refreshed-extension acceptance, merge, tag, and GitHub release.

## v0.3.2 Test Build

- Prompt optimization goal: pass, `npm run check:prompt-goal`.
- JSON repair regression: pass, `npm run check:json-repair`; includes weak `json_prompt` strengthening, steam-only blocker guard, and conservative repair for JavaScript-like JSON with comments, trailing commas, single-quoted strings, and unquoted object keys.
- Prompt goal coverage: 58 contract rules, 12 simulated fidelity cases, 1 simulated JSON generator-readiness case.
- Simulated prompt cases: soft-focus nightlife conflict, high-style anime energy, monochrome studio portrait, Chinese concert poster, sports dashboard screenshot with overlay, real-person bathroom mirror selfie, casual smartphone photo, high-density panoramic skeleton preservation, simple object no-overconstraint guard, UI/product capture, and text-heavy layout reconstruction.
- Typecheck: pass, `npm run typecheck`.
- API option check: pass, `npm run check:api-options`.
- Storage check: pass, `npm run check:storage`.
- URL check: pass, `npm run check:url`.
- Diff whitespace: pass, `git diff --check`.
- Build: pass, `npm run build`.
- Bilibili E2E: pass, `npm run e2e:bilibili`, `tmp/browser-tests/pw-e2e-summary-1781797549928.json`.
- Visual history smoke: pass, `npm run smoke:history`, `tmp/browser-tests/pw-visual-history-summary-1781797507995.json`.
- Test package: pass, `npm run release:package`.
- Release scan: pass, `npm run release:check`.
- Package output: `release/zhijuan-prompt-card-0.3.2.zip`.
- Package sha256: `6e20c9fa64b17b1c0f5c1efbe4cb0ec2e909e33b376f8238df8532f9836c36f8`.
- Dist manifest: pass, manifest `version` is `0.3.2`, `version_name` is `0.3.2 Prompt Output`.
- Zip manifest: pass, manifest `version` is `0.3.2`, `version_name` is `0.3.2 Prompt Output`.
- Prior BridgeDeck model smoke: pass, `gpt-5.5` through `http://127.0.0.1:8876/v1`, captured before the `json_prompt.fidelity_priorities` schema addition.
- Prior model smoke cases: real-person bathroom mirror selfie preserved East Asian-presenting cue, warm skin tone, natural makeup, casual selfie context, mirror smudges, and no forced cinema terms; Tatsumaki image preserved `Tatsumaki / Tornado of Terror from One Punch Man`; Luo Tianyi poster preserved `洛天依`, Chinese title/date text, and poster layout.
- Prior real timeline image comparison: pass, `tmp/real-image-tests/summary.json`, captured before the `json_prompt.fidelity_priorities` schema addition.
- Prior real image 1, organic civilization timeline: pass, returned no hidden Japanese or duplicate recreation prompt fields; `en.prompt` was 275 words, captured curved/continuous Earth cross-section composition, and did not describe rectangular bands.
- Prior real image 2, banded timeline poster: pass, returned no hidden Japanese or duplicate recreation prompt fields; `en.prompt` was 345 words, preserved Chinese timeline text and explicitly captured stacked/horizontal panel structure.
- Current model-level real high-density timeline rerun: pass, `tmp/real-image-tests/current-organic-timeline-v032-structural-audit.json`, generated with `npm run test:real-structure`; returned `reconstruction_v2`, no hidden Japanese or duplicate recreation-prompt fields, `en.prompt` was 272 words, produced 10 dynamic observation units and 5 reconstruction priorities, preserved nonlinear/curved source geometry and boundary guides, and blocked straight-boundary drift with `rectangular grid redesign`, `straightened horizon bands`, and `lost curved layer boundaries`.
- Current post-JSON-layer real high-density timeline rerun: pass, `tmp/real-image-tests/current-organic-timeline-v032-post-json-layer-structural-audit.json`, generated with `npm run test:real-structure`; returned `reconstruction_v2`, no hidden Japanese or duplicate recreation-prompt fields, `en.prompt` was 283 words, produced 9 dynamic observation units and 5 reconstruction priorities, preserved nonlinear/curved source geometry and boundary guides, and blocked straight-boundary drift with `straight rectangular timeline grid`, `flattened horizontal bands`, and `lost golden curve`.
- Current offline structural re-parse for the post-JSON-layer high-density timeline audit: pass, `tmp/real-image-tests/current-organic-timeline-v032-offline-repair-structural-pass.json`; re-parsed the prior real model output through current repair logic, kept `en.prompt` at 283 words, 9 observation units, 5 reconstruction priorities, nonlinear geometry and boundary checks, and straight-boundary blockers including `straight rectangular timeline grid`, `flattened horizontal bands`, and `lost golden curve`.
- Current ramen JSON readiness re-parse: pass, `tmp/real-image-tests/ramen-json-readiness-v032-offline-repair-pass.json`, generated from prior real model output captured in `tmp/real-image-tests/ramen-json-readiness-v032-strong-json-text-guard.json`; returned `reconstruction_v2`, no hidden Japanese or duplicate recreation-prompt fields, `json_prompt.generation_prompt` was 353 words versus 268 English prompt words, `json_prompt.generation_negative_prompt` had 24 blockers, `json_prompt.spatial_dynamics` was 49 words, and semantic anchors for lifted noodles, chopsticks, suspended or floating ingredients, Chinese poster text, splash blockers, and spatial layer relationships all passed.
- Current real README banner JSON readiness audit: pass, `tmp/real-image-tests/readme-banner-json-readiness-v032-semantic-pass.json`, re-parsed real API output captured in `tmp/real-image-tests/readme-banner-json-readiness-v032.json`; returned `reconstruction_v2`, no hidden Japanese or duplicate recreation-prompt fields, `en.prompt` was 399 words, `json_prompt.generation_prompt` was 455 words, `json_prompt.generation_negative_prompt` had 24 blockers, `json_prompt.spatial_dynamics` was 55 words, and anchors for visible product text, bilingual UI labels, JSON tab, left/right panel layering, and layout-drift blockers all passed.
- Model-level real soft-focus nightlife rerun: pass, `tmp/real-image-tests/soft-focus-nightlife-v032.json`; returned `json_prompt.fidelity_priorities`, no hidden Japanese or duplicate recreation-prompt fields, `en.prompt` was 286 words, negative prompt had 23 image-specific blockers, and the English prompt covered soft focus, bloom/halation, phone-photo compression, and anti-commercial-sharpness drift.
- Manual real-extension UI test: pass, `npm run test:real-extension`, `tmp/browser-tests/manual-real-extension-summary-1781794736605.json`; loaded the built extension in a temporary Chromium profile, saved and tested the real BridgeDeck settings with redacted test evidence, then analyzed project README images through page image pick and local file upload. Both returned `reconstruction_v2`, `en.prompt`, `json_prompt.generation_prompt`, `json_prompt.generation_negative_prompt`, `json_prompt.spatial_dynamics`, `json_prompt.fidelity_priorities`, dynamic `observation_units`, dynamic `reconstruction_priorities`, no hidden Japanese output, and no duplicate recreation-prompt field. Page image pick returned 381 English prompt words, 403 JSON generation prompt words, 67 spatial dynamics words, 8 observation units, and 5 reconstruction priorities. Local upload returned 370 English prompt words, 459 JSON generation prompt words, 60 spatial dynamics words, 9 observation units, and 5 reconstruction priorities.
- Codex Thread cold review: pass, thread `019edac0-9340-78b3-9a59-069fd6c3aeab`; the reviewer found no blocker for user refresh acceptance, flagged the steam-to-splash overconstraint risk, then confirmed the follow-up fix after `npm run check:json-repair`, `npm run check:prompt-goal`, `npm run typecheck`, and `git diff --check`.
- Installed-extension acceptance checklist: ready, `docs/installed-extension-acceptance.md`.
- User refreshed-extension acceptance test: pending. Before merge, push, tag, or GitHub release, refresh or reload the user's installed browser extension and repeat at least one local image upload plus one page image selection through the actual UI.
- v0.3.2 scope: prompt-output optimization, `en.prompt` as the primary recreation prompt, JSON-local copy-ready generation prompt, JSON-local negative prompt, JSON-local spatial dynamics, dynamic reconstruction evidence in JSON output, plain-language fidelity priorities, input image detail preservation before analysis, removal of redundant hidden Japanese and duplicate recreation-prompt outputs from new model responses, stronger visible appearance fidelity, conditional camera/style/quality guidance, negative prompt blocker limits, API compatibility, and update notices.
- Release status: not tagged, not merged, not pushed, and not published. This build stops at user refreshed-extension acceptance before any GitHub release.

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
- Floating panel result render: pass, English prompt, Chinese prompt, JSON, negative controls, and style tags visible.
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
  "en_prompt_sample": "A clean minimalist flat vector illustration of an abstract sunset icon: a single vivid orange circular disk centered horizontally in the upper middle of a solid deep black-navy canvas..."
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
