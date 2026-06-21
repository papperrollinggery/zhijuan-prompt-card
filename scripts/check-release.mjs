import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const distManifestPath = join(root, 'dist/manifest.json');
const releaseZip = join(root, `release/zhijuan-prompt-card-${packageJson.version}.zip`);

const sensitivePatterns = [
  /accounts\/[0-9a-fA-F-]{36}/,
  /127\.0\.0\.1:8876\/accounts/i,
  /sk-[A-Za-z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/,
  /\/Users\/[A-Za-z0-9._-]+/
];

const textExtensions = new Set([
  '',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml'
]);
const skippedFiles = new Set(['scripts/check-release.mjs', 'zhijuan_codex_oss_launch_prompt.md']);

function fail(message) {
  console.error(`release check failed: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function scanText(label, text) {
  for (const pattern of sensitivePatterns) {
    if (pattern.test(text)) fail(`${label} matched ${pattern}`);
  }
}

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', 'tmp', 'release', 'promo', 'refs_tmp', 'outputs'].includes(entry.name)) continue;
      await walk(path, files);
    } else {
      if (skippedFiles.has(relative(root, path))) continue;
      files.push(path);
    }
  }
  return files;
}

function zipEntries(zipPath) {
  return execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readZipEntry(zipPath, entry) {
  return execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function checkReadmeImages() {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const imageRefs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const ref of imageRefs) {
    if (/^https?:\/\//i.test(ref)) continue;
    assert(existsSync(join(root, ref)), `README image missing: ${ref}`);
  }
}

function checkZip() {
  assert(existsSync(releaseZip), `missing release zip: ${relative(root, releaseZip)}`);
  const entries = zipEntries(releaseZip);
  for (const required of ['manifest.json', 'LICENSE', 'NOTICE', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md']) {
    assert(entries.includes(required), `zip missing ${required}`);
  }

  const manifest = JSON.parse(readZipEntry(releaseZip, 'manifest.json'));
  assert(manifest.version === packageJson.version, `zip manifest version ${manifest.version} does not match package ${packageJson.version}`);

  for (const entry of entries) {
    if (entry.endsWith('/')) continue;
    if (!textExtensions.has(extname(entry))) continue;
    scanText(`zip:${entry}`, readZipEntry(releaseZip, entry));
  }
}

assert(existsSync(distManifestPath), 'dist/manifest.json missing; run npm run build first');
assert(readJson(distManifestPath).version === packageJson.version, 'dist manifest version does not match package.json');
checkReadmeImages();

for (const file of await walk(root)) {
  if (!textExtensions.has(extname(file))) continue;
  scanText(relative(root, file), readFileSync(file, 'utf8'));
}

checkZip();

if (process.exitCode) process.exit(process.exitCode);
console.log(`release check passed for ${packageJson.version}`);
