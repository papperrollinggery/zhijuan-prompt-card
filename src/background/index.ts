import { analyzeImageWithApi } from '../shared/apiClient';
import { GENERATOR_SITES, getGeneratorSite } from '../shared/generators';
import { resizeDataUrl, urlToDataUrl } from '../shared/imageData';
import { REVERSE_PROMPT_SYSTEM } from '../shared/reversePrompt';
import {
  addHistoryEntry,
  buildHistoryTitle,
  createRunningHistoryEntry,
  getSettings,
  updateHistoryEntry
} from '../shared/storage';
import type { AppSettings, GeneratorSite, HistoryEntry, ImageTarget, RuntimeResponse } from '../shared/types';

type RuntimeMessage =
  | { type: 'RUN_ANALYSIS'; payload: { target: ImageTarget } }
  | { type: 'OPEN_PANEL'; payload: { srcUrl?: string; pageUrl?: string } }
  | { type: 'CAPTURE_VISIBLE_TAB' }
  | { type: 'OPEN_GENERATOR_SITE'; payload: { siteId: GeneratorSite; prompt: string } }
  | { type: 'OPEN_OPTIONS_PAGE' }
  | { type: 'TEST_CONNECTION'; payload: AppSettings }
  | { type: 'TOGGLE_FAVORITE'; payload: { id: string; favorite: boolean } };

const MENU_ANALYZE_IMAGE = 'zhijuan-analyze-image';
const MENU_PICK_IMAGE = 'zhijuan-pick-image';
const MENU_CAPTURE_AREA = 'zhijuan-capture-area';
const RED_TEST_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGP4z8DwHxkzkC4AADxAH+HggXe0AAAAAElFTkSuQmCC';

chrome.runtime.onInstalled.addListener(() => {
  void installContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void installContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === MENU_ANALYZE_IMAGE && info.mediaType === 'image' && info.srcUrl) {
    const target: ImageTarget = {
      kind: 'image',
      srcUrl: info.srcUrl,
      pageUrl: tab.url,
      title: tab.title || 'Image analysis'
    };
    void runAnalysisForTab(tab.id, target);
    return;
  }

  if (info.menuItemId === MENU_PICK_IMAGE) {
    void chrome.tabs.sendMessage(tab.id, { type: 'START_IMAGE_PICK' }).catch(() => undefined);
    return;
  }

  if (info.menuItemId === MENU_CAPTURE_AREA) {
    void chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' }).catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch((error: unknown) => sendResponse({ ok: false, error: errorToMessage(error) } satisfies RuntimeResponse));
  return true;
});

async function installContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ANALYZE_IMAGE,
    title: 'Analyze this image',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: MENU_PICK_IMAGE,
    title: 'Pick image on page',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: MENU_CAPTURE_AREA,
    title: 'Capture area for prompt',
    contexts: ['page']
  });
}

async function handleRuntimeMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'RUN_ANALYSIS': {
      const tabId = (await resolveTargetTabId(sender)) || (await getActiveTabId());
      if (!tabId) throw new Error('No active tab found.');
      return runAnalysisForTab(tabId, message.payload.target);
    }
    case 'OPEN_PANEL': {
      const tabId = sender.tab?.id || (await getActiveTabId());
      if (!tabId) throw new Error('No active tab found.');
      await chrome.tabs.sendMessage(tabId, { type: 'SHOW_PANEL', payload: message.payload });
      return true;
    }
    case 'CAPTURE_VISIBLE_TAB': {
      if (!sender.tab?.windowId) throw new Error('No active window for capture.');
      return chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    }
    case 'OPEN_GENERATOR_SITE':
      await copyPromptFromSenderTab(sender.tab?.id, message.payload.prompt);
      return openGeneratorSite(message.payload.siteId, message.payload.prompt);
    case 'OPEN_OPTIONS_PAGE':
      await chrome.runtime.openOptionsPage();
      return true;
    case 'TEST_CONNECTION':
      return testConnection(message.payload);
    case 'TOGGLE_FAVORITE':
      return updateHistoryEntry(message.payload.id, { favorite: message.payload.favorite });
    default:
      throw new Error('Unknown runtime message.');
  }
}

async function runAnalysisForTab(tabId: number, target: ImageTarget): Promise<HistoryEntry> {
  const runningEntry = createRunningHistoryEntry({
    imageUrl: target.srcUrl,
    pageUrl: target.pageUrl,
    title: target.title || 'Image analysis'
  });
  await addHistoryEntry(runningEntry);
  await sendToTab(tabId, { type: 'ANALYSIS_STARTED', payload: { entry: runningEntry, target } });

  try {
    const settings = await getSettings();
    if (!settings.enabled) throw new Error('Extension is disabled in settings.');
    const imageDataUrl = await prepareImageDataUrl(target, tabId);
    const analysis = await analyzeImageWithApi({
      settings,
      imageDataUrl,
      promptText: REVERSE_PROMPT_SYSTEM
    });
    const updated = await updateHistoryEntry(runningEntry.id, {
      analysis,
      status: 'success',
      title: buildHistoryTitle(analysis, target.title || 'Image analysis'),
      error: undefined
    });
    const entry = updated || { ...runningEntry, analysis, status: 'success' as const };
    await sendToTab(tabId, { type: 'ANALYSIS_RESULT', payload: { entry, target } });
    return entry;
  } catch (error) {
    const message = errorToMessage(error);
    const updated = await updateHistoryEntry(runningEntry.id, { status: 'failed', error: message });
    const entry = updated || { ...runningEntry, status: 'failed' as const, error: message };
    await sendToTab(tabId, { type: 'ANALYSIS_ERROR', payload: { entry, error: message, target } });
    throw error;
  }
}

async function prepareImageDataUrl(target: ImageTarget, tabId: number): Promise<string> {
  if (target.dataUrl) return resizeDataUrl(target.dataUrl);
  if (!target.srcUrl) throw new Error('No image source provided.');
  try {
    return await resizeDataUrl(await urlToDataUrl(target.srcUrl));
  } catch (error) {
    const fallback = await requestContentCanvasDataUrl(tabId, target.srcUrl);
    if (fallback) return resizeDataUrl(fallback);
    throw error;
  }
}

async function requestContentCanvasDataUrl(tabId: number, srcUrl: string): Promise<string | undefined> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: 'CANVAS_IMAGE_TO_DATA_URL',
      payload: { srcUrl }
    })) as RuntimeResponse<string>;
    return response.ok ? response.data : undefined;
  } catch {
    return undefined;
  }
}

async function openGeneratorSite(siteId: GeneratorSite, prompt: string): Promise<number> {
  const site = getGeneratorSite(siteId);
  const tab = await chrome.tabs.create({ url: site.url, active: true });
  if (!tab.id) throw new Error(`Failed to open ${site.label}.`);

  const listener = (tabId: number, changeInfo: { status?: string }) => {
    if (tabId !== tab.id || changeInfo.status !== 'complete') return;
    chrome.tabs.onUpdated.removeListener(listener);
    void chrome.scripting
      .executeScript({
        target: { tabId },
        func: fillPromptOnGeneratorPage,
        args: [site.promptSelectors, prompt]
      })
      .catch(() => undefined);
  };
  chrome.tabs.onUpdated.addListener(listener);
  return tab.id;
}

async function copyPromptFromSenderTab(tabId: number | undefined, prompt: string): Promise<void> {
  if (!tabId) return;
  await chrome.scripting
    .executeScript({
      target: { tabId },
      func: (value: string) => navigator.clipboard?.writeText(value).catch(() => undefined),
      args: [prompt]
    })
    .catch(() => undefined);
}

function fillPromptOnGeneratorPage(selectors: string[], prompt: string): boolean {
  const element = selectors.map((selector) => document.querySelector(selector)).find(Boolean) as
    | HTMLTextAreaElement
    | HTMLInputElement
    | HTMLElement
    | undefined;

  if (!element) {
    showToast('Prompt copied. Paste manually.');
    return false;
  }

  if ('value' in element) {
    element.value = prompt;
  } else {
    element.textContent = prompt;
  }
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  (element as HTMLElement).focus();
  showToast('Prompt filled. Review before generating.');
  return true;

  function showToast(text: string) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText =
      'position:fixed;z-index:2147483647;right:20px;bottom:20px;background:#11131a;color:#fff;border:1px solid #ff6f12;border-radius:10px;padding:12px 14px;font:13px system-ui;box-shadow:0 16px 40px rgba(0,0,0,.35)';
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }
}

async function testConnection(settings: AppSettings): Promise<{ schema: boolean; message: string }> {
  try {
    await analyzeImageWithApi({ settings, imageDataUrl: RED_TEST_IMAGE, promptText: REVERSE_PROMPT_SYSTEM });
    return { schema: true, message: 'Connection ok. Schema ok.' };
  } catch (error) {
    const message = errorToMessage(error);
    if (/json|schema|missing|content/i.test(message)) return { schema: false, message: 'Model sees image but schema failed.' };
    throw error;
  }
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function resolveTargetTabId(sender: chrome.runtime.MessageSender): Promise<number | undefined> {
  if (sender.tab?.id && !sender.tab.url?.startsWith(chrome.runtime.getURL(''))) return sender.tab.id;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && !tab.url?.startsWith(chrome.runtime.getURL(''))) return tab.id;
  const [fallback] = await chrome.tabs.query({ active: true });
  return fallback?.id;
}

async function sendToTab(tabId: number, message: unknown): Promise<void> {
  await chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void Object.keys(GENERATOR_SITES);
