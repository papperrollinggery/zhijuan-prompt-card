import http from 'node:http';
import { rm, mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const tempDistDir = '/tmp/zhijuan-dist-test';
const artifactsDir = path.join(rootDir, 'tmp/browser-tests');
const userDataDir = path.join(rootDir, 'tmp/pw-chromium-zhijuan-profile');
const bilibiliUrl = process.env.ZHIJUAN_E2E_URL || 'https://www.bilibili.com/';

const analysisPayload = {
  zh: {
    prompt: 'B站首页截图测试提示词：视频卡片、中文导航、网页封面组成的产品截图。',
    analysis: '本地 stub 已识别到图片输入，端到端流程可解析。'
  },
  en: {
    prompt:
      'A sharp desktop browser screenshot of the Bilibili homepage with Chinese navigation, video thumbnail cards, and a compact floating image-to-prompt tool panel, clean readable UI, realistic software product capture.',
    analysis: 'The local stub received an image input and returned a valid schema.'
  },
  zh_style_tags: ['网页截图', '视频封面', '中文界面'],
  en_style_tags: ['web screenshot', 'video thumbnails', 'Chinese UI'],
  json_prompt: {
    schema_version: 'reconstruction_v2',
    summary: 'Bilibili homepage screenshot with Chinese navigation, thumbnail grid, and floating prompt extension panel',
    generation_prompt:
      'A sharp desktop browser screenshot of the Bilibili homepage with Chinese navigation, video thumbnail cards, and a compact floating image-to-prompt tool panel, preserving the browser viewport crop, UI text hierarchy, thumbnail grid, and extension overlay z-order as a clean readable software screenshot.',
    generation_negative_prompt: 'blur, unreadable text, broken layout, missing UI, distorted screenshot',
    spatial_dynamics:
      'Static browser screenshot; top navigation leads into the video thumbnail grid; floating prompt panel sits above the page content with clear z-order.',
    subject: 'Bilibili homepage capture test',
    action_pose: 'Static webpage screenshot selected by a user region capture or image picker',
    details_appearance: 'Navigation links, video cards, thumbnail images, compact Chinese text, floating Zhijuan panel',
    environment_background: 'Desktop browser on bilibili.com',
    lighting_atmosphere: 'Neutral screen capture lighting with web UI contrast',
    composition_framing: 'Cropped browser viewport with selected content centered',
    style_camera: 'Direct digital screenshot, no camera lens distortion',
    colors: ['white', 'pink', 'blue', 'dark text'],
    materials: ['pixels', 'web UI', 'thumbnail imagery'],
    aspect_ratio: 'browser dependent',
    quality_modifiers: ['sharp UI text', 'clean screenshot', 'usable prompt structure'],
    fidelity_priorities: ['UI layout priority 88 of 100 - preserve screenshot geometry and Chinese navigation', 'text readability priority 80 of 100 - keep interface labels legible without redesigning the page'],
    global_fingerprint: {
      style_index: 18,
      density: 'dense web UI',
      spatial_flow: 'browser viewport hierarchy with navigation first, thumbnails below, floating tool panel above page content',
      optical_finish: ['direct screen capture', 'crisp UI text'],
      render_finish: ['software screenshot', 'web thumbnail grid'],
      palette: ['#FFFFFF white - page background', '#FB7299 pink - Bilibili accent', '#18191C dark text - UI labels']
    },
    observation_units: [
      {
        id: 'ui_layout',
        kind: 'layout_flow',
        priority: 88,
        prompt: 'preserve the browser screenshot geometry, Chinese navigation hierarchy, video thumbnail grid, and floating prompt panel z-order',
        evidence: 'visible webpage layout and extension overlay',
        location: 'full browser viewport',
        must_preserve: ['Chinese navigation', 'thumbnail grid', 'floating panel'],
        avoid_drift: ['redesigned landing page', 'translated navigation', 'missing extension overlay']
      }
    ],
    text_elements: [
      {
        content: 'Chinese navigation and interface labels',
        language: 'Chinese',
        role: 'web UI text',
        location: 'top navigation and page cards',
        typography: 'compact screen UI text',
        legibility: 'clear to partial',
        priority: 80
      }
    ],
    reconstruction_priorities: [
      {
        cue: 'preserve screenshot layout and original Chinese UI text',
        priority: 88,
        tradeoff: 'layout fidelity outranks polished app redesign',
        compile_to_en_prompt: true,
        risk_if_missing: 'the page becomes a generic redesigned video website'
      }
    ],
    likely_generation_intent: 'Validate image-to-prompt extension pipeline'
  },
  prompt_core: 'Bilibili homepage screenshot, Chinese web UI, video thumbnails, floating prompt tool',
  negative_prompt: 'blur, unreadable text, broken layout, missing UI, distorted screenshot'
};

let requestCount = 0;
const requestSummaries = [];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  let body = '';
  req.setEncoding('utf8');
  for await (const chunk of req) body += chunk;
  requestCount += 1;

  let parsed = {};
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = {};
  }
  const imagePartObject = parsed?.messages?.[0]?.content?.find?.((part) => part?.image_url?.url)?.image_url || {};
  const imagePart = imagePartObject.url || '';
  requestSummaries.push({
    index: requestCount,
    model: parsed?.model,
    hasAuthorization: Boolean(req.headers.authorization),
    imagePrefix: imagePart.slice(0, 30),
    imageMime: imagePart.match(/^data:([^;,]+)/)?.[1] || '',
    imageDetail: imagePartObject.detail || '',
    hasTopLevelImageDetail: Object.prototype.hasOwnProperty.call(parsed, 'image_detail'),
    imageChars: imagePart.length
  });

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(analysisPayload) } }] }));
});

const listen = () =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });

async function panelText(page) {
  return page.evaluate(() => {
    const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
    return (root?.querySelector('.zpc-panel')?.textContent || '').replace(/\s+/g, ' ').trim();
  });
}

async function shadowRect(page, spec) {
  return page.evaluate((spec) => {
    const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
    if (!root) throw new Error('missing shadow root');

    let element;
    if (spec.selector) {
      element = root.querySelector(spec.selector);
    } else {
      element = [...root.querySelectorAll('button')].find((button) => {
        const text = (button.textContent || '').trim().replace(/\s+/g, ' ');
        const aria = button.getAttribute('aria-label') || '';
        const title = button.getAttribute('title') || '';
        return spec.exact
          ? text === spec.text || aria === spec.text || title === spec.text
          : text.includes(spec.text) || aria.includes(spec.text) || title.includes(spec.text);
      });
    }

    if (!element) throw new Error(`missing shadow element ${JSON.stringify(spec)}`);
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '').trim().replace(/\s+/g, ' ')
    };
  }, spec);
}

async function clickShadow(page, spec) {
  const rect = await shadowRect(page, spec);
  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
  return rect;
}

async function collapsedActionState(page) {
  return page.evaluate(() => {
    const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
    const actions = [...(root?.querySelectorAll('.zpc-collapsed-actions') || [])].map((element) => {
      const style = getComputedStyle(element);
      return { opacity: Number(style.opacity), pointerEvents: style.pointerEvents };
    });
    const buttons = [...(root?.querySelectorAll('.zpc-collapsed-action') || [])].map((element) => {
      const style = getComputedStyle(element);
      return { opacity: Number(style.opacity), pointerEvents: style.pointerEvents };
    });
    return { actions, buttons };
  });
}

async function scrollPanel(page, deltaY) {
  const rect = await shadowRect(page, { selector: '.zpc-panel__body' });
  await page.mouse.move(rect.x + rect.w / 2, rect.y + Math.min(rect.h - 20, Math.max(20, rect.h / 2)));
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(300);
}

async function saveTargetPreview(page, label) {
  const dataUrl = await page.waitForFunction(
    () => {
      const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
      const src = root?.querySelector('.zpc-target-thumb img')?.getAttribute('src') || '';
      return src.startsWith('data:image/') ? src : false;
    },
    null,
    { timeout: 15_000 }
  );
  const src = await dataUrl.jsonValue();
  const stats = await page.evaluate(
    (src) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('canvas unavailable'));
            return;
          }
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const step = Math.max(1, Math.floor(Math.sqrt((canvas.width * canvas.height) / 5000)));
          let sampled = 0;
          let black = 0;
          let bright = 0;
          let lumaTotal = 0;
          for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
              const offset = (y * canvas.width + x) * 4;
              const r = pixels[offset];
              const g = pixels[offset + 1];
              const b = pixels[offset + 2];
              const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              sampled += 1;
              lumaTotal += luma;
              if (r < 8 && g < 8 && b < 8) black += 1;
              if (luma > 40) bright += 1;
            }
          }
          resolve({
            width: canvas.width,
            height: canvas.height,
            sampled,
            blackRatio: black / sampled,
            brightRatio: bright / sampled,
            averageLuma: lumaTotal / sampled
          });
        };
        image.onerror = () => reject(new Error('failed to load target preview'));
        image.src = src;
      }),
    src
  );
  const previewPath = path.join(artifactsDir, `pw-${label}-target-preview-${Date.now()}.png`);
  await writeFile(previewPath, Buffer.from(src.split(',')[1], 'base64'));
  return { path: previewPath, imageChars: src.length, stats };
}

async function waitForVisibleMedia(page, label) {
  const mediaState = await page.waitForFunction(
    () => {
      const visibleImages = [...document.images].filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 48 && rect.height > 48 && rect.bottom > 0 && rect.top < innerHeight;
      });
      const visibleSkeletons = [...document.querySelectorAll('[class*="skeleton"], [class*="loading"], [class*="placeholder"]')].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 48 && rect.height > 48 && rect.bottom > 0 && rect.top < innerHeight;
      });
      const loadedImages = visibleImages.filter((image) => image.complete && image.naturalWidth > 0);
      return {
        ready: visibleImages.length >= 6 && loadedImages.length === visibleImages.length,
        visibleImages: visibleImages.length,
        loadedImages: loadedImages.length,
        visibleSkeletons: visibleSkeletons.length
      };
    },
    null,
    { timeout: 20_000 }
  );
  const state = await mediaState.jsonValue();
  if (!state.ready) throw new Error(`${label}: visible media not loaded ${JSON.stringify(state)}`);
  return state;
}

async function scrollPageForLoadedMedia(page) {
  await page.mouse.move(720, 680);
  for (let index = 0; index < 3; index += 1) {
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => {
      const visibleImages = [...document.images].filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 48 && rect.height > 48 && rect.bottom > 0 && rect.top < innerHeight;
      });
      const visibleSkeletons = [...document.querySelectorAll('[class*="skeleton"], [class*="loading"], [class*="placeholder"]')].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 48 && rect.height > 48 && rect.bottom > 0 && rect.top < innerHeight;
      });
      return {
        visibleImages: visibleImages.length,
        loadedImages: visibleImages.filter((image) => image.complete && image.naturalWidth > 0).length,
        visibleSkeletons: visibleSkeletons.length
      };
    });
    if (state.visibleImages >= 6 && state.visibleImages === state.loadedImages) return state;
  }
  return waitForVisibleMedia(page, 'bilibili loaded viewport');
}

async function waitForResult(page, label) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
      if (!root) return false;
      const error = (root.querySelector('.zpc-error')?.textContent || '').trim();
      if (error) throw new Error(error);
      const result = (root.querySelector('.zpc-result')?.textContent || '').trim();
      return result.includes('Bilibili') || result.includes('B站首页截图测试提示词');
    },
    null,
    { timeout: 45_000 }
  );

  const text = await panelText(page);
  if (/tainted canvases|toDataURL/i.test(text)) throw new Error(`${label}: tainted canvas error remained`);
}

async function run() {
  await mkdir(artifactsDir, { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });
  await rm(tempDistDir, { recursive: true, force: true });
  await cp(distDir, tempDistDir, { recursive: true });

  const address = await listen();
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  const evidence = { browser: 'playwright-chromium-temp-profile', baseUrl, extensionId: null, screenshots: {}, checks: [], requestSummaries };
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${tempDistDir}`, `--load-extension=${tempDistDir}`, '--no-first-run', '--no-default-browser-check']
  });

  try {
    const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 15_000 }));
    const extensionId = new URL(worker.url()).host;
    evidence.extensionId = extensionId;

    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForSelector('input');
    await optionsPage.locator('input').nth(0).fill(baseUrl);
    await optionsPage.locator('input').nth(1).fill('local-test-key');
    await optionsPage.locator('input').nth(2).fill('local-stub-vision');
    await optionsPage.getByRole('button', { name: '保存并测试' }).click();
    await optionsPage.waitForFunction(() => document.body.innerText.includes('Connection ok. Schema ok.'), null, { timeout: 20_000 });
    evidence.checks.push('options_save_and_test_ok');

    const page = await context.newPage();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.bilibili.com' });
    await page.goto(bilibiliUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForFunction(() => Boolean(document.getElementById('zhijuan-prompt-root')?.shadowRoot), null, { timeout: 20_000 });
    await page.waitForTimeout(2500);
    evidence.checks.push('bilibili_content_script_injected');

    const initialMediaState = await waitForVisibleMedia(page, 'bilibili initial viewport');
    evidence.initialMediaState = initialMediaState;
    const fullPagePath = path.join(artifactsDir, `pw-bilibili-full-page-${Date.now()}.png`);
    await page.screenshot({ path: fullPagePath, fullPage: true });
    evidence.screenshots.fullPage = fullPagePath;
    evidence.checks.push('bilibili_full_page_screenshot_ok');

    const loadedMediaState = await scrollPageForLoadedMedia(page);
    evidence.loadedMediaState = loadedMediaState;
    const loadedViewportPath = path.join(artifactsDir, `pw-bilibili-loaded-media-viewport-${Date.now()}.png`);
    await page.screenshot({ path: loadedViewportPath, fullPage: false });
    evidence.screenshots.loadedMediaViewport = loadedViewportPath;
    evidence.checks.push('bilibili_loaded_media_viewport_ok');

    await clickShadow(page, { selector: '.zpc-collapsed-handle' });
    await page.waitForTimeout(400);
    evidence.checks.push('floating_button_open_ok');

    await clickShadow(page, { text: '截取区域', exact: true });
    await page.waitForSelector('.zpc-selection-overlay');
    await page.mouse.move(520, 300);
    await page.mouse.down();
    await page.mouse.move(880, 470, { steps: 8 });
    await page.mouse.up();
    await waitForResult(page, 'capture_region');
    const captureTargetPreview = await saveTargetPreview(page, 'capture-region');
    evidence.screenshots.captureTargetPreview = captureTargetPreview.path;
    evidence.captureTargetPreview = captureTargetPreview;
    if (captureTargetPreview.stats.width < 100 || captureTargetPreview.stats.height < 100 || captureTargetPreview.stats.brightRatio < 0.02) {
      throw new Error(`capture region preview looked invalid ${JSON.stringify(captureTargetPreview.stats)}`);
    }
    evidence.checks.push('capture_region_target_preview_data_url_ok');
    evidence.checks.push('capture_region_analysis_ok');

    const captureResultPath = path.join(artifactsDir, `pw-capture-result-${Date.now()}.png`);
    await page.screenshot({ path: captureResultPath, fullPage: false });
    evidence.screenshots.captureResult = captureResultPath;

    await clickShadow(page, { text: '英文', exact: true });
    await clickShadow(page, { selector: '.zpc-prompt-output .zpc-copy-chip' });
    await page.waitForTimeout(300);
    const promptClipboard = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (!promptClipboard.includes('Bilibili homepage')) throw new Error('copy did not write English prompt to clipboard');
    evidence.checks.push('copy_english_prompt_ok');

    await clickShadow(page, { text: 'JSON', exact: true });
    await clickShadow(page, { selector: '.zpc-prompt-output .zpc-copy-chip' });
    await page.waitForTimeout(300);
    const jsonClipboard = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (!jsonClipboard.includes('Bilibili homepage capture test')) throw new Error('copy JSON did not write JSON prompt');
    const jsonPrompt = JSON.parse(jsonClipboard);
    if (Object.keys(jsonPrompt)[0] !== 'prompt') throw new Error('copy JSON did not put prompt first');
    if (/schema_version|reconstruction_v2/.test(jsonClipboard)) throw new Error('copy JSON leaked internal schema metadata');
    evidence.checks.push('copy_json_ok');

    await clickShadow(page, { text: '英文', exact: true });
    await scrollPanel(page, 700);
    await clickShadow(page, { selector: '.zpc-actions button:last-child' });
    await page.waitForFunction(() => {
      const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
      const actionText = root?.querySelector('.zpc-actions button:last-child')?.textContent || '';
      const panelText = root?.querySelector('.zpc-panel')?.textContent || '';
      return actionText.includes('已保存') || actionText.includes('Saved') || panelText.includes('已保存') || panelText.includes('Saved');
    });
    evidence.checks.push('favorite_toggle_ok');

    await clickShadow(page, { text: '重新识别', exact: true });
    await waitForResult(page, 'regenerate');
    evidence.checks.push('regenerate_ok');

    await scrollPanel(page, -1000);
    await clickShadow(page, { text: '选择图片', exact: true });
    await page.waitForSelector('.zpc-image-pick-overlay');
    await page.mouse.move(640, 360);
    await page.waitForTimeout(250);
    await page.mouse.click(640, 360);
    await waitForResult(page, 'image_pick');
    evidence.checks.push('image_pick_analysis_ok');

    await scrollPanel(page, -1000);
    const chooserPromise = page.waitForEvent('filechooser');
    await clickShadow(page, { text: '本地文件', exact: true });
    const chooser = await chooserPromise;
    await chooser.setFiles(path.join(rootDir, 'public/icons/icon-128.png'));
    await waitForResult(page, 'local_file');
    evidence.checks.push('local_file_analysis_ok');

    await clickShadow(page, { text: '折叠', exact: true });
    await page.waitForTimeout(300);
    evidence.checks.push('collapse_ok');

    await page.mouse.move(1220, 780);
    await page.waitForTimeout(350);
    const hiddenActions = await collapsedActionState(page);
    if (!hiddenActions.actions.length || hiddenActions.actions.some((action) => action.opacity > 0.05 || action.pointerEvents !== 'none')) {
      throw new Error(`collapsed actions did not hide on mouse leave ${JSON.stringify(hiddenActions)}`);
    }
    evidence.checks.push('collapsed_actions_hide_on_mouse_leave_ok');

    const handleRect = await shadowRect(page, { selector: '.zpc-collapsed-handle' });
    await page.mouse.move(handleRect.x + handleRect.w / 2, handleRect.y + handleRect.h / 2);
    await page.waitForTimeout(400);
    const shownActions = await collapsedActionState(page);
    if (!shownActions.actions.length || shownActions.actions.some((action) => action.opacity < 0.9 || action.pointerEvents !== 'auto')) {
      throw new Error(`collapsed actions did not show on hover ${JSON.stringify(shownActions)}`);
    }
    evidence.checks.push('collapsed_actions_show_on_hover_ok');

    await clickShadow(page, { text: '历史记录', exact: true });
    await page.waitForFunction(
      () => {
        const root = document.getElementById('zhijuan-prompt-root')?.shadowRoot;
        return (root?.textContent || '').includes('历史记录') && (root?.textContent || '').includes('条记录');
      },
      null,
      { timeout: 10_000 }
    );
    evidence.checks.push('history_view_ok');

    await clickShadow(page, { text: '返回', exact: true });
    await clickShadow(page, { text: 'EN', exact: true });
    if (!(await panelText(page)).includes('Prompt output')) throw new Error('language toggle to EN did not update UI');
    evidence.checks.push('language_toggle_ok');

    const finalPath = path.join(artifactsDir, `pw-final-panel-${Date.now()}.png`);
    await page.screenshot({ path: finalPath, fullPage: false });
    evidence.screenshots.finalPanel = finalPath;
    evidence.requestCount = requestCount;
    if (!requestSummaries.length || requestSummaries.some((summary) => summary.imageDetail !== 'high' || summary.hasTopLevelImageDetail)) {
      throw new Error(`image detail was not sent as nested high detail ${JSON.stringify(requestSummaries)}`);
    }
    evidence.summaryPath = path.join(artifactsDir, `pw-e2e-summary-${Date.now()}.json`);
    await writeFile(evidence.summaryPath, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await context.close().catch(() => undefined);
    server.close();
  }
}

run().catch((error) => {
  server.close();
  console.error(error?.stack || error);
  process.exit(1);
});
