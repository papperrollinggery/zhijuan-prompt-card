import { analyzeImageWithApi, isAbortError } from '../shared/apiClient';
import { GENERATOR_SITES, getGeneratorSite } from '../shared/generators';
import { createThumbnailDataUrl, resizeDataUrl, urlToDataUrl } from '../shared/imageData';
import { REVERSE_PROMPT_SYSTEM } from '../shared/reversePrompt';
import {
  addHistoryEntry,
  buildHistoryTitle,
  compactHistoryStorage,
  createRunningHistoryEntry,
  failRunningHistoryEntries,
  getSettings,
  saveSettings,
  updateHistoryEntry
} from '../shared/storage';
import type { AnalysisPhase, AppSettings, GeneratorSite, HistoryEntry, ImageTarget, RuntimeResponse } from '../shared/types';

type RuntimeMessage =
  | { type: 'RUN_ANALYSIS'; payload: { target: ImageTarget } }
  | { type: 'CANCEL_ANALYSIS'; payload?: { id?: string } }
  | { type: 'OPEN_PANEL'; payload: { srcUrl?: string; pageUrl?: string } }
  | { type: 'DISPATCH_TAB_COMMAND'; payload: { command: TabCommand; tabId?: number; allPageTabs?: boolean } }
  | { type: 'CAPTURE_VISIBLE_TAB' }
  | { type: 'OPEN_GENERATOR_SITE'; payload: { siteId: GeneratorSite; prompt: string } }
  | { type: 'OPEN_OPTIONS_PAGE'; payload?: { hash?: string } }
  | { type: 'TEST_CONNECTION'; payload: AppSettings }
  | { type: 'TOGGLE_FAVORITE'; payload: { id: string; favorite: boolean } };

const MENU_ANALYZE_IMAGE = 'zhijuan-analyze-image';
const MENU_PICK_IMAGE = 'zhijuan-pick-image';
const MENU_CAPTURE_AREA = 'zhijuan-capture-area';
const ANALYSIS_CANCELED_MESSAGE = '已取消识别。';
const RED_TEST_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGP4z8DwHxkzkC4AADxAH+HggXe0AAAAAElFTkSuQmCC';
type TabCommand = 'START_SELECTION' | 'START_IMAGE_PICK' | 'SHOW_FLOATING_BUTTON' | 'HIDE_FLOATING_BUTTON';
type ActiveAnalysis = {
  controller: AbortController;
  entry: HistoryEntry;
  tabId?: number;
  target: ImageTarget;
};

const activeAnalyses = new Map<string, ActiveAnalysis>();

chrome.runtime.onInstalled.addListener(() => {
  runBackgroundTask(compactHistoryStorage);
  runBackgroundTask(failRunningHistoryEntries);
  runBackgroundTask(installContextMenus);
  runBackgroundTask(refreshOpenPageTabs);
});

chrome.runtime.onStartup.addListener(() => {
  runBackgroundTask(compactHistoryStorage);
  runBackgroundTask(failRunningHistoryEntries);
  runBackgroundTask(installContextMenus);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const tabId = tab.id;

  if (info.menuItemId === MENU_ANALYZE_IMAGE && info.mediaType === 'image' && info.srcUrl) {
    const target: ImageTarget = {
      kind: 'image',
      srcUrl: info.srcUrl,
      pageUrl: tab.url,
      title: tab.title || 'Image analysis'
    };
    runBackgroundTask(() => runAnalysisForTab(tabId, target));
    return;
  }

  if (info.menuItemId === MENU_PICK_IMAGE) {
    runBackgroundTask(() => sendToTab(tabId, { type: 'START_IMAGE_PICK' }, { forceInject: true }));
    return;
  }

  if (info.menuItemId === MENU_CAPTURE_AREA) {
    runBackgroundTask(() => sendToTab(tabId, { type: 'START_SELECTION' }, { forceInject: true }));
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch((error: unknown) => sendResponse({ ok: false, error: errorToMessage(error) } satisfies RuntimeResponse));
  return true;
});

async function installContextMenus(): Promise<void> {
  await removeAllContextMenus();
  await createContextMenu({
    id: MENU_ANALYZE_IMAGE,
    title: 'Analyze this image',
    contexts: ['image']
  });
  await createContextMenu({
    id: MENU_PICK_IMAGE,
    title: 'Pick image on page',
    contexts: ['page']
  });
  await createContextMenu({
    id: MENU_CAPTURE_AREA,
    title: 'Capture area for prompt',
    contexts: ['page']
  });
}

function removeAllContextMenus(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      const error = chrome.runtime.lastError;
      error?.message ? reject(new Error(error.message)) : resolve();
    });
  });
}

function createContextMenu(properties: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(properties, () => {
      const error = chrome.runtime.lastError;
      error?.message ? reject(new Error(error.message)) : resolve();
    });
  });
}

async function handleRuntimeMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'RUN_ANALYSIS': {
      const tabId = (await resolveTargetTabId(sender)) || (await getActiveTabId());
      if (!tabId && !message.payload.target.dataUrl) throw new Error('No active tab found.');
      return runAnalysisForTab(tabId, message.payload.target);
    }
    case 'CANCEL_ANALYSIS':
      return cancelAnalysis(message.payload?.id);
    case 'OPEN_PANEL': {
      const tabId = sender.tab?.id || (await getActiveTabId());
      if (!tabId) throw new Error('No active tab found.');
      await sendToTab(tabId, { type: 'SHOW_PANEL', payload: message.payload }, { forceInject: true });
      return true;
    }
    case 'DISPATCH_TAB_COMMAND': {
      if (isFloatingButtonCommand(message.payload.command)) {
        await saveFloatingButtonPreference(message.payload.command === 'SHOW_FLOATING_BUTTON');
      }
      if (message.payload.allPageTabs) return dispatchCommandToPageTabs(message.payload.command);
      const tabId = message.payload.tabId || (await getActiveTabId());
      if (!tabId) throw new Error('No active tab found.');
      await sendToTab(tabId, { type: message.payload.command }, { forceInject: true });
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
      if (message.payload?.hash) await chrome.tabs.create({ url: chrome.runtime.getURL(`options.html#${message.payload.hash}`) });
      else await chrome.runtime.openOptionsPage();
      return true;
    case 'TEST_CONNECTION':
      return testConnection(message.payload);
    case 'TOGGLE_FAVORITE':
      return updateHistoryEntry(message.payload.id, { favorite: message.payload.favorite });
    default:
      throw new Error('Unknown runtime message.');
  }
}

async function runAnalysisForTab(tabId: number | undefined, target: ImageTarget): Promise<HistoryEntry> {
  const runningEntry = createRunningHistoryEntry({
    imageUrl: target.srcUrl,
    pageUrl: target.pageUrl,
    title: target.title || 'Image analysis'
  });
  await addHistoryEntry(runningEntry);
  const controller = new AbortController();
  activeAnalyses.set(runningEntry.id, { controller, entry: runningEntry, tabId, target });
  if (tabId) await notifyTab(tabId, { type: 'ANALYSIS_STARTED', payload: { entry: runningEntry, target } });

  try {
    const settings = await getSettings();
    if (!settings.enabled) throw new Error('Extension is disabled in settings.');
    throwIfAborted(controller.signal);
    if (tabId) await notifyAnalysisPhase(tabId, runningEntry.id, 'preparing_image', target);
    const imageDataUrl = await prepareImageDataUrl(target, tabId, controller.signal);
    const thumbnailUrl = await createHistoryThumbnail(imageDataUrl, controller.signal);
    throwIfAborted(controller.signal);
    if (thumbnailUrl) {
      await updateHistoryEntry(runningEntry.id, { thumbnailUrl });
      throwIfAborted(controller.signal);
      const active = activeAnalyses.get(runningEntry.id);
      if (active) active.entry = { ...active.entry, thumbnailUrl };
      if (tabId) await notifyTab(tabId, { type: 'ANALYSIS_STARTED', payload: { entry: { ...runningEntry, thumbnailUrl }, target } });
    }
    throwIfAborted(controller.signal);
    if (tabId) await notifyAnalysisPhase(tabId, runningEntry.id, 'requesting_model', target);
    const analysis = await analyzeImageWithApi({
      settings,
      imageDataUrl,
      promptText: REVERSE_PROMPT_SYSTEM,
      signal: controller.signal
    });
    if (tabId) await notifyAnalysisPhase(tabId, runningEntry.id, 'parsing_result', target);
    const updated = await updateHistoryEntry(runningEntry.id, {
      analysis,
      status: 'success',
      title: buildHistoryTitle(analysis, target.title || 'Image analysis'),
      error: undefined
    });
    const entry = updated || { ...runningEntry, analysis, status: 'success' as const };
    if (tabId) await notifyTab(tabId, { type: 'ANALYSIS_RESULT', payload: { entry, target } });
    return entry;
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      const entry = await finalizeCanceledAnalysis(runningEntry.id);
      if (tabId) await notifyTab(tabId, { type: 'ANALYSIS_CANCELED', payload: { entry, target } });
      return entry;
    }
    const message = errorToMessage(error);
    const updated = await updateHistoryEntry(runningEntry.id, { status: 'failed', error: message });
    const entry = updated || { ...runningEntry, status: 'failed' as const, error: message };
    if (tabId) await notifyTab(tabId, { type: 'ANALYSIS_ERROR', payload: { entry, error: message, target } });
    throw error;
  } finally {
    activeAnalyses.delete(runningEntry.id);
  }
}

async function createHistoryThumbnail(imageDataUrl: string, signal?: AbortSignal): Promise<string | undefined> {
  try {
    return await createThumbnailDataUrl(imageDataUrl, 520, 0.84, signal);
  } catch {
    return undefined;
  }
}

async function cancelAnalysis(id?: string): Promise<{ canceled: number }> {
  const active = id ? [activeAnalyses.get(id)].filter((item): item is ActiveAnalysis => Boolean(item)) : [...activeAnalyses.values()];
  for (const item of active) item.controller.abort(new DOMException(ANALYSIS_CANCELED_MESSAGE, 'AbortError'));
  return { canceled: active.length };
}

async function finalizeCanceledAnalysis(id: string): Promise<HistoryEntry> {
  const active = activeAnalyses.get(id);
  const updated = await updateHistoryEntry(id, { status: 'canceled', error: ANALYSIS_CANCELED_MESSAGE });
  return updated || {
    ...(active?.entry || createRunningHistoryEntry({ title: 'Canceled analysis' })),
    id,
    status: 'canceled' as const,
    error: ANALYSIS_CANCELED_MESSAGE
  };
}

async function prepareImageDataUrl(target: ImageTarget, tabId: number | undefined, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  if (target.dataUrl) return resizeDataUrl(target.dataUrl, undefined, undefined, signal);
  if (!target.srcUrl) throw new Error('No image source provided.');
  try {
    return await resizeDataUrl(await urlToDataUrl(target.srcUrl, signal), undefined, undefined, signal);
  } catch (error) {
    throwIfAborted(signal);
    const fallback = tabId ? await requestContentCanvasDataUrl(tabId, target.srcUrl) : undefined;
    throwIfAborted(signal);
    if (fallback) return resizeDataUrl(fallback, undefined, undefined, signal);
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
  return getActivePageTabId();
}

async function resolveTargetTabId(sender: chrome.runtime.MessageSender): Promise<number | undefined> {
  if (sender.tab?.id && !sender.tab.url?.startsWith(chrome.runtime.getURL(''))) return sender.tab.id;
  return getActivePageTabId();
}

async function sendToTab(tabId: number, message: unknown, options: { forceInject?: boolean } = {}): Promise<void> {
  if (options.forceInject) await injectContentScript(tabId);
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await injectContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
  }
}

async function notifyTab(tabId: number, message: unknown): Promise<void> {
  await sendToTab(tabId, message).catch(() => undefined);
}

async function notifyAnalysisPhase(tabId: number, id: string, phase: AnalysisPhase, target: ImageTarget): Promise<void> {
  await notifyTab(tabId, { type: 'ANALYSIS_PHASE', payload: { id, phase, target } });
}

async function dispatchCommandToPageTabs(command: TabCommand): Promise<{ sent: number }> {
  const tabs = await chrome.tabs.query({});
  const tabIds = tabs.filter(isPageTab).map((tab) => tab.id).filter((tabId): tabId is number => typeof tabId === 'number');
  if (!tabIds.length) throw new Error('No webpage tab found.');
  await Promise.allSettled(tabIds.map((tabId) => sendToTab(tabId, { type: command }, { forceInject: true })));
  return { sent: tabIds.length };
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }).catch(() => undefined);
}

async function refreshOpenPageTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const tabIds = tabs.filter(isPageTab).map((tab) => tab.id).filter((tabId): tabId is number => typeof tabId === 'number');
  await Promise.allSettled(tabIds.map(injectContentScript));
}

async function getActivePageTabId(): Promise<number | undefined> {
  const queries: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { active: true }
  ];

  for (const query of queries) {
    const tab = (await chrome.tabs.query(query)).find(isPageTab);
    if (tab?.id) return tab.id;
  }

  return undefined;
}

function isPageTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  if (!tab?.id) return false;
  const url = tab.url || tab.pendingUrl || '';
  return !url.startsWith(chrome.runtime.getURL('')) && (/^https?:\/\//.test(url) || /^file:\/\//.test(url));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException(ANALYSIS_CANCELED_MESSAGE, 'AbortError');
}

function isFloatingButtonCommand(command: TabCommand): boolean {
  return command === 'SHOW_FLOATING_BUTTON' || command === 'HIDE_FLOATING_BUTTON';
}

async function saveFloatingButtonPreference(persistentFloatingButton: boolean): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ ...settings, persistentFloatingButton });
}

function runBackgroundTask(task: () => Promise<unknown>): void {
  void task().catch((error) => {
    console.warn('[Zhijuan Prompt Card]', errorToMessage(error));
  });
}

void Object.keys(GENERATOR_SITES);
