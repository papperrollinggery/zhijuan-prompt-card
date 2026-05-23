import React from 'react';
import { createRoot } from 'react-dom/client';
import { cropVisibleScreenshot, renderVisibleRegionFallback, startImagePicker, startSelectionOverlay } from './selectionOverlay';
import { Panel, type PanelState } from './panel';
import panelCss from './panel.css';
import { getSettings, saveSettings } from '../shared/storage';
import type { GeneratorSite, ImageTarget, InterfaceLanguage, RuntimeResponse } from '../shared/types';

let root: ReturnType<typeof createRoot> | undefined;
let panelState: PanelState = { open: false, loading: false };
let lastTarget: ImageTarget | undefined;
let noticeTimer: number | undefined;
let interfaceLanguage: InterfaceLanguage = 'zh';
let languageRequestId = 0;

ensurePanelRoot();
void loadInterfaceLanguage();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch((error: unknown) => sendResponse({ ok: false, error: errorToMessage(error) } satisfies RuntimeResponse));
  return true;
});

function ensurePanelRoot(): void {
  if (root) return;
  const host = document.createElement('div');
  host.id = 'zhijuan-prompt-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = panelCss;
  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.documentElement.appendChild(host);
  root = createRoot(mount);
  render();
}

async function loadInterfaceLanguage(): Promise<void> {
  const requestId = ++languageRequestId;
  const settings = await getSettings();
  if (requestId !== languageRequestId) return;
  interfaceLanguage = normalizeInterfaceLanguage(settings.interfaceLanguage);
  render();
}

async function handleMessage(message: any): Promise<unknown> {
  switch (message.type) {
    case 'SHOW_PANEL':
      setPanelState({ open: true, loading: false, error: undefined });
      return true;
    case 'ANALYSIS_STARTED':
      lastTarget = message.payload.target;
      setPanelState({ open: true, loading: true, error: undefined, entry: message.payload.entry, target: lastTarget });
      return true;
    case 'ANALYSIS_RESULT':
      lastTarget = message.payload.target;
      setPanelState({ open: true, loading: false, error: undefined, entry: message.payload.entry, target: lastTarget });
      return true;
    case 'ANALYSIS_ERROR':
      lastTarget = message.payload.target;
      setPanelState({
        open: true,
        loading: false,
        error: message.payload.error,
        entry: message.payload.entry,
        target: lastTarget
      });
      return true;
    case 'START_SELECTION':
      await runSelectionAnalysis();
      return true;
    case 'START_IMAGE_PICK':
      await runImagePickAnalysis();
      return true;
    case 'CANVAS_IMAGE_TO_DATA_URL':
      return imageElementToDataUrl(message.payload.srcUrl);
    default:
      return undefined;
  }
}

async function runSelectionAnalysis(): Promise<void> {
  setPanelState({ open: false, loading: false, error: undefined, notice: undefined, picking: 'selection' });
  await waitForNextFrame();
  const selection = await startSelectionOverlay(getSelectionCopy());
  if (!selection) {
    setPanelState({ open: false, loading: false, picking: undefined });
    return;
  }
  setPanelState({ open: true, loading: true, error: undefined, entry: undefined, target: undefined, picking: undefined });
  try {
    const dataUrl = await captureSelectionDataUrl(selection.rect);
    lastTarget = {
      kind: 'selection',
      dataUrl,
      pageUrl: location.href,
      title: document.title || 'Page selection'
    };
    await sendRuntimeMessage({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
  } catch (error) {
    setPanelState({ open: true, loading: false, error: errorToMessage(error), picking: undefined });
  }
}

async function runImagePickAnalysis(): Promise<void> {
  setPanelState({ open: false, loading: false, error: undefined, notice: undefined, picking: 'image' });
  await waitForNextFrame();
  const picked = await startImagePicker(getImagePickerCopy());
  if (!picked) {
    setPanelState({ loading: false, notice: undefined, picking: undefined });
    return;
  }
  lastTarget = {
    kind: 'image',
    srcUrl: picked.srcUrl,
    pageUrl: location.href,
    title: picked.title || document.title || 'Selected image'
  };
  setPanelState({ open: true, loading: true, error: undefined, entry: undefined, target: lastTarget, notice: undefined, picking: undefined });
  await sendRuntimeMessage({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function captureSelectionDataUrl(rect: DOMRect): Promise<string> {
  try {
    const capture = await sendRuntimeMessage<string>({ type: 'CAPTURE_VISIBLE_TAB' });
    return cropVisibleScreenshot(capture, rect);
  } catch {
    return renderVisibleRegionFallback(rect);
  }
}

async function imageElementToDataUrl(srcUrl: string): Promise<string> {
  const image = [...document.images].find((item) => item.currentSrc === srcUrl || item.src === srcUrl);
  if (!image) throw new Error('Image element not found on page.');
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function setPanelState(next: Partial<PanelState>): void {
  panelState = { ...panelState, ...next };
  render();
}

function render(): void {
  root?.render(
    <Panel
      state={panelState}
      language={interfaceLanguage}
      onClose={() => setPanelState({ open: false, loading: false })}
      onOpen={() => setPanelState({ open: true, loading: false, error: undefined })}
      onLanguageChange={(language) => void changeInterfaceLanguage(language)}
      onStartAreaSelect={() => void runSelectionAnalysis()}
      onStartImagePick={() => void runImagePickAnalysis()}
      onOpenSettings={() => void openSettings()}
      onCopy={(text, label) => void copyText(text, label)}
      onRegenerate={() => void regenerate()}
      onOpenGenerator={(siteId, prompt) => void openGenerator(siteId, prompt)}
      onToggleFavorite={(id, favorite) => void toggleFavorite(id, favorite)}
    />
  );
}

async function changeInterfaceLanguage(language: InterfaceLanguage): Promise<void> {
  const requestId = ++languageRequestId;
  interfaceLanguage = normalizeInterfaceLanguage(language);
  render();
  const settings = await getSettings();
  const saved = await saveSettings({ ...settings, interfaceLanguage });
  if (requestId !== languageRequestId) return;
  interfaceLanguage = normalizeInterfaceLanguage(saved.interfaceLanguage);
  render();
}

async function copyText(text: string, label: string): Promise<void> {
  try {
    await writeClipboardText(text);
    showNotice(label);
  } catch {
    showNotice('Copy failed. Select text manually.');
  }
}

async function regenerate(): Promise<void> {
  if (!lastTarget) return;
  setPanelState({ open: true, loading: true, error: undefined, entry: undefined });
  await sendRuntimeMessage({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
}

async function openGenerator(siteId: GeneratorSite, prompt: string): Promise<void> {
  await copyText(prompt, 'Prompt copied');
  await sendRuntimeMessage({ type: 'OPEN_GENERATOR_SITE', payload: { siteId, prompt } });
}

async function openSettings(): Promise<void> {
  await sendRuntimeMessage({ type: 'OPEN_OPTIONS_PAGE' });
}

async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  const entry = await sendRuntimeMessage({ type: 'TOGGLE_FAVORITE', payload: { id, favorite } });
  if (entry && typeof entry === 'object') setPanelState({ entry: entry as PanelState['entry'] });
  showNotice(favorite ? 'Saved' : 'Unsaved');
}

function showNotice(notice: string): void {
  window.clearTimeout(noticeTimer);
  setPanelState({ notice });
  noticeTimer = window.setTimeout(() => setPanelState({ notice: undefined }), 1800);
}

function normalizeInterfaceLanguage(language: InterfaceLanguage): InterfaceLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

function getImagePickerCopy() {
  if (interfaceLanguage === 'zh') {
    return {
      prompt: '点击任意图片开始识别。按 Esc 取消。',
      selected: '已选择图片'
    };
  }
  return {
    prompt: 'Click any image to analyze. Press Esc to cancel.',
    selected: 'Image selected'
  };
}

function getSelectionCopy() {
  if (interfaceLanguage === 'zh') {
    return {
      prompt: '拖拽截取区域。按 Esc 取消。',
      selected: '已选择区域'
    };
  }
  return {
    prompt: 'Drag to capture a region. Press Esc to cancel.',
    selected: 'Region selected'
  };
}

function sendRuntimeMessage<T = unknown>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) reject(new Error(response?.error || 'Runtime request failed.'));
      else resolve(response.data as T);
    });
  });
}

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
  document.documentElement.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard write failed.');
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
