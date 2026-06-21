import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const distDir = resolve('dist');
const userDataDir = await mkdtemp(join(tmpdir(), 'zhijuan-content-script-'));
const server = createServer((_, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /><title>Zhijuan content script check</title></head>
  <body>
    <main>
      <h1>小红书页面注入回归</h1>
      <img alt="test poster" width="160" height="160" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' fill='%23f33'/%3E%3Ctext x='16' y='86' fill='white' font-size='28'%3EZPC%3C/text%3E%3C/svg%3E" />
    </main>
  </body>
</html>`);
});

const evidence = {
  browser: 'playwright-chromium-temp-profile',
  targetUrl: '',
  externalTarget: false,
  extensionId: '',
  console: [],
  pageErrors: [],
  severeConsole: [],
  severePageErrors: [],
  rootPresent: false,
  shadowChildCount: 0,
  reloadScenario: {
    skipped: false,
    clickedSettings: false,
    recoveredMessageVisible: false
  },
  ok: false
};

let context;
let failed = false;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start local content-script test server.');
  evidence.targetUrl = process.env.ZHIJUAN_CONTENT_SCRIPT_URL || `http://127.0.0.1:${address.port}/`;
  evidence.externalTarget = Boolean(process.env.ZHIJUAN_CONTENT_SCRIPT_URL);

  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`, '--no-first-run', '--no-default-browser-check']
  });

  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 15_000 }));
  evidence.extensionId = new URL(worker.url()).host;

  const page = await context.newPage();
  page.on('console', (message) => {
    evidence.console.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on('pageerror', (error) => {
    evidence.pageErrors.push({ message: error.message, stack: error.stack });
  });

  await page.goto(evidence.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => Boolean(document.getElementById('zhijuan-prompt-root')), null, { timeout: 15_000 });
  await page.waitForTimeout(1_000);
  const rootState = await page.evaluate(() => {
    const host = document.getElementById('zhijuan-prompt-root');
    return {
      rootPresent: Boolean(host),
      shadowChildCount: host?.shadowRoot?.children.length ?? 0
    };
  });
  evidence.rootPresent = rootState.rootPresent;
  evidence.shadowChildCount = rootState.shadowChildCount;
  if (evidence.externalTarget) {
    evidence.reloadScenario.skipped = true;
  } else {
    evidence.reloadScenario = await inspectReloadInvalidation(page, worker);
  }

  evidence.severeConsole = evidence.console.filter((entry) => isSevereConsoleEntry(entry));
  evidence.severePageErrors = evidence.pageErrors.filter((entry) => isSeverePageError(entry));
  if (evidence.severePageErrors.length || evidence.severeConsole.length) failed = true;
  if (!evidence.rootPresent || evidence.shadowChildCount < 1) failed = true;
  if (!evidence.externalTarget && (!evidence.reloadScenario.clickedSettings || !evidence.reloadScenario.recoveredMessageVisible)) failed = true;
  evidence.ok = !failed;
  console.log(JSON.stringify(evidence, null, 2));
  if (failed) process.exitCode = 1;
} finally {
  await context?.close().catch(() => undefined);
  await new Promise((resolve) => server.close(resolve)).catch(() => undefined);
  await rm(userDataDir, { recursive: true, force: true });
}

function isSevereConsoleEntry(entry) {
  if (!['error', 'warning'].includes(entry.type)) return false;
  if (/favicon|React DevTools/i.test(entry.text)) return false;
  if (evidence.externalTarget && !isExtensionRelated(entry.text, entry.location?.url)) return false;
  return true;
}

function isSeverePageError(entry) {
  if (!evidence.externalTarget) return true;
  return isExtensionRelated(entry.message, entry.stack);
}

function isExtensionRelated(text, location = '') {
  return location.includes(`chrome-extension://${evidence.extensionId}/`)
    || /\bcontent\.js\b|Extension context invalidated|Invalid or unexpected token|Zhijuan/i.test(`${text}\n${location}`);
}

async function inspectReloadInvalidation(page, worker) {
  const beforeConsoleCount = evidence.console.length;
  const beforePageErrorCount = evidence.pageErrors.length;
  await worker.evaluate(() => chrome.runtime.reload());
  await page.waitForTimeout(1_500);
  const result = await page.evaluate(() => {
    const host = document.getElementById('zhijuan-prompt-root');
    const root = host?.shadowRoot;
    const button = [...(root?.querySelectorAll('button') || [])].find((item) => {
      const text = `${item.textContent || ''} ${item.getAttribute('aria-label') || ''} ${item.getAttribute('title') || ''}`;
      return /设置|Settings/i.test(text);
    });
    button?.click();
    return {
      clickedSettings: Boolean(button)
    };
  });
  await page.waitForTimeout(1_000);
  const recoveredMessageVisible = await page.evaluate(() => {
    const text = document.getElementById('zhijuan-prompt-root')?.shadowRoot?.textContent || '';
    return /扩展已重新加载|Extension context invalidated/i.test(text);
  });
  return {
    skipped: false,
    clickedSettings: result.clickedSettings,
    recoveredMessageVisible,
    consoleEntriesAfterReload: evidence.console.length - beforeConsoleCount,
    pageErrorsAfterReload: evidence.pageErrors.length - beforePageErrorCount
  };
}
