import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const distDir = resolve('dist');
const userDataDir = await mkdtemp(join(tmpdir(), 'zhijuan-extension-pages-'));
const pageNames = ['popup', 'options'];
const evidence = {
  browser: 'playwright-chromium-temp-profile',
  extensionId: '',
  pages: {}
};

let context;
let failed = false;

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`, '--no-first-run', '--no-default-browser-check']
  });

  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 15_000 }));
  evidence.extensionId = new URL(worker.url()).host;

  for (const pageName of pageNames) {
    evidence.pages[pageName] = await inspectExtensionPage(pageName);
    if (!evidence.pages[pageName].ok) failed = true;
  }

  console.log(JSON.stringify(evidence, null, 2));
  if (failed) process.exitCode = 1;
} finally {
  await context?.close().catch(() => undefined);
  await rm(userDataDir, { recursive: true, force: true });
}

async function inspectExtensionPage(pageName) {
  const page = await context.newPage();
  const record = {
    url: `chrome-extension://${evidence.extensionId}/${pageName}.html`,
    console: [],
    pageErrors: [],
    title: '',
    rootChildren: 0,
    bodyPreview: '',
    ok: false
  };

  page.on('console', (message) => {
    const entry = { type: message.type(), text: message.text(), location: message.location() };
    record.console.push(entry);
  });
  page.on('pageerror', (error) => {
    record.pageErrors.push({ message: error.message, stack: error.stack });
  });

  try {
    await page.goto(record.url, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1_500);
    record.title = await page.title();
    record.rootChildren = await page.evaluate(() => document.getElementById('root')?.children.length ?? -1);
    record.bodyPreview = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);

    const errors = record.console.filter((item) => isSevereConsoleEntry(item));
    if (record.pageErrors.length || errors.length) throw new Error(`${pageName}.html emitted extension page errors`);
    if (record.rootChildren < 1) throw new Error(`${pageName}.html did not render into #root`);
    record.ok = true;
    return record;
  } catch (error) {
    record.failure = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    return record;
  } finally {
    await page.close().catch(() => undefined);
  }
}

function isSevereConsoleEntry(entry) {
  if (!['error', 'warning'].includes(entry.type)) return false;
  if (/React DevTools/i.test(entry.text)) return false;
  return true;
}
