# Installed Extension Acceptance

Use this checklist only after the local build and temporary Chromium tests have passed.
This is the final user-installed extension gate before merge, push, tag, or release.

## Scope

- Version under test: `0.3.2`.
- Extension source: local unpacked `dist/` rebuilt from this branch.
- Model path: the user's configured compatible vision endpoint.
- Required UI paths: one page image selection and one local image upload.

## Preflight

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Refresh or reload the installed Zhijuan Prompt Card unpacked extension that points to this repo's `dist/`.
5. Open the extension options page and confirm the endpoint/model settings are the intended test settings.
6. Do not merge, push, tag, or publish before this checklist passes.

## Page Image Selection

1. Open a normal webpage containing a real image.
2. Open the Zhijuan floating panel.
3. Choose the page image selection action.
4. Select the target image and wait for success.
5. Confirm the English tab shows one primary copyable recreation prompt.
6. Confirm the JSON tab contains `schema_version: "reconstruction_v2"`.
7. Confirm JSON contains `generation_prompt`, `generation_negative_prompt`, and `spatial_dynamics`.
8. Confirm normal prompt copy and Open in generator use `json_prompt.generation_prompt` text, not the full JSON object.
9. Confirm pasted generator text does not include unquoted wrapper tokens such as `schema_version`, `reconstruction_v2`, `source image`, or `reference image`; quoted visible source text must stay exact.
10. Confirm JSON contains dynamic `global_fingerprint`, `observation_units`, and `reconstruction_priorities`.
11. Confirm there is no Japanese output block and no duplicate `recreation_prompt` output.

## Local Image Upload

1. Open the extension popup.
2. Upload one local image.
3. Wait for success.
4. Confirm the English prompt is specific enough to preserve subject, composition, text/layout, style, optical finish, and drift blockers that matter for that image.
5. Confirm `negative_prompt` is image-specific and does not globally ban blur, haze, bloom, grain, or low resolution when those are visible source traits.
6. Confirm the JSON output uses dynamic observation units rather than a fixed image-type template.
7. If the source image has motion, floating, suspension, occlusion, or layered depth, confirm those relationships appear in `json_prompt.generation_prompt` and `json_prompt.spatial_dynamics`, not only inside array fields.
8. Confirm full JSON copying remains available only through the explicit structure JSON controls.

## Pass Criteria

- Both UI paths complete without API, parse, or storage errors.
- Normal prompt copy and Open in generator use `json_prompt.generation_prompt` as the main generator handoff, with `en.prompt` only as fallback.
- New output has no hidden Japanese field and no duplicate recreation-prompt field.
- Explicit JSON data copy remains available without dropping load-bearing motion, spatial, text, or negative-prompt facts.
- JSON v2 evidence is present and meaningful for the actual image.
- The generated prompt does not force every image toward a sharp, rectangular, polished, or over-structured style.
- No project-owned Playwright, temporary Chromium, test server, or stale extension test process remains running afterward.

## Evidence To Record

- Date and browser used.
- Extension version shown in the options/popup UI.
- One screenshot of page-image result.
- One screenshot of local-upload result.
- Whether both outputs pass the criteria above.
