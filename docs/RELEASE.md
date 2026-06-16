# Release Checklist

This checklist is for a public GitHub release zip and optional browser-store submission.

## Preconditions

- Worktree contains only intended source/docs changes.
- `package.json`, `src/manifest.ts`, and `dist/manifest.json` use the same version.
- No old test zip is used as a release asset.
- Browser-store listings are not marked published until Chrome Web Store / Edge Add-ons review is actually complete.

## Build And Verify

```bash
git status --short
npm ci
npm run typecheck
npm run check:storage
npm run check:url
npm run build
npm run smoke:history
```

Run the Bilibili end-to-end flow when browser automation is available:

```bash
npm run e2e:bilibili
```

## Package

```bash
npm run release:package
npm run release:check
```

The package script writes:

```text
release/zhijuan-prompt-card-<version>.zip
```

The zip includes:

- `manifest.json`
- extension JavaScript/CSS/HTML/assets
- `LICENSE`
- `NOTICE`
- `PRIVACY.md`
- `THIRD_PARTY_NOTICES.md`

## Manual Package Checks

```bash
VERSION=$(node -p "require('./package.json').version")
unzip -p "release/zhijuan-prompt-card-$VERSION.zip" manifest.json
unzip -Z1 "release/zhijuan-prompt-card-$VERSION.zip" | sort
zipgrep -n "accounts/" "release/zhijuan-prompt-card-$VERSION.zip" || true
zipgrep -n "sk-" "release/zhijuan-prompt-card-$VERSION.zip" || true
```

Expected:

- manifest `version` equals `package.json` version.
- No private account paths.
- No API keys.
- No local absolute home-directory paths.

## Public Git History Gate

Before making a repository public, also scan Git history. If this fails, publish from a clean orphan branch or a new clean repository instead of pushing the existing history.

```bash
git log --all --format='%H' | while read commit; do
  git grep -nE 'accounts/[0-9a-fA-F-]{36}|127\\.0\\.0\\.1:8876/accounts|sk-[A-Za-z0-9]{20,}|Bearer [A-Za-z0-9._-]{20,}|/Users/[A-Za-z0-9._-]+' "$commit" -- . ':!package-lock.json' ':!node_modules' 2>/dev/null | sed "s/^/$commit /"
done
```

Expected for a public repository:

- No private account paths.
- No API keys or bearer tokens.
- No local absolute home-directory paths.

## Chrome / Edge Install Check

1. Unzip `release/zhijuan-prompt-card-<version>.zip`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer Mode.
4. Load the unzipped folder.
5. Confirm the extension version matches the release version.
6. Open Options and configure Base URL, API Key, and Model.
7. Test one local image upload and one page image selection.

## GitHub Release

1. Tag the release, for example `v0.3.0`.
2. Create the GitHub release.
3. Attach `release/zhijuan-prompt-card-<version>.zip`.
4. Use a bilingual release title such as `v0.3.0 Prompt Fidelity / 提示词复刻优化`.
5. Include the bilingual verification summary from `docs/verification.md`.

## Optional Browser Stores

Use the same zip only after it passes the release checks above. Store listing text and privacy answers must match `README.md` and `PRIVACY.md`, especially:

- no login
- no telemetry
- no analytics
- selected images sent only to the user-configured endpoint
- `<all_urls>` and `file:///*` permissions explained
