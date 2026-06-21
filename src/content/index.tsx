import React from 'react';
import { createRoot } from 'react-dom/client';
import { cancelActiveSelectionOverlay, cropVisibleScreenshot, startImagePicker, startSelectionOverlay } from './selectionOverlay';
import { Panel, type PanelState } from './panel';
import panelCss from './panel.css';
import { HISTORY_LIMIT, STORAGE_KEYS } from '../shared/defaults';
import { fileToDataUrl, isImageFile } from '../shared/imageData';
import { clearHistory, deleteHistoryEntry, getHistory, getSettings, saveSettings } from '../shared/storage';
import type { AnalysisPhase, GeneratorSite, HistoryEntry, ImageTarget, InterfaceLanguage, RuntimeResponse } from '../shared/types';

const INSTANCE_KEY = '__zhijuanPromptCardInstanceId__';
const instanceId = `${Date.now()}-${Math.random()}`;

let root: ReturnType<typeof createRoot> | undefined;
let panelState: PanelState = { open: false, loading: false };
let historyEntries: HistoryEntry[] = [];
let lastTarget: ImageTarget | undefined;
let activeAnalysisId: string | undefined;
let activeWorkToken = 0;
let noticeTimer: number | undefined;
let interfaceLanguage: InterfaceLanguage = 'zh';
let languageRequestId = 0;
let floatingHiddenByUser = false;
const canceledAnalysisIds = new Set<string>();

(window as unknown as Record<string, string>)[INSTANCE_KEY] = instanceId;

ensurePanelRoot();
runContentTask(loadSettingsIntoUi());
runContentTask(refreshHistory());
installSettingsListener();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isActiveInstance()) return false;
  runContentTask(
    handleMessage(message)
      .then((data) => sendResponseSafely(sendResponse, { ok: true, data } satisfies RuntimeResponse))
      .catch((error: unknown) => sendResponseSafely(sendResponse, { ok: false, error: errorToMessage(error) } satisfies RuntimeResponse))
  );
  return true;
});

function isActiveInstance(): boolean {
  return (window as unknown as Record<string, string>)[INSTANCE_KEY] === instanceId;
}

function ensurePanelRoot(): void {
  if (root) return;
  document.getElementById('zhijuan-prompt-root')?.remove();
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

async function loadSettingsIntoUi(): Promise<void> {
  const requestId = ++languageRequestId;
  const settings = await getSettings();
  if (requestId !== languageRequestId) return;
  interfaceLanguage = normalizeInterfaceLanguage(settings.interfaceLanguage);
  if (settings.persistentFloatingButton && !floatingHiddenByUser) panelState = { ...panelState, open: true };
  if (!settings.persistentFloatingButton && !hasActivePanelWork()) panelState = { ...panelState, open: false };
  render();
}

function installSettingsListener(): void {
  try {
    chrome.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes[STORAGE_KEYS.settings]) runContentTask(loadSettingsIntoUi());
      if (changes[STORAGE_KEYS.history]) {
        historyEntries = Array.isArray(changes[STORAGE_KEYS.history].newValue) ? changes[STORAGE_KEYS.history].newValue as HistoryEntry[] : [];
        recoverSuccessfulHistory(historyEntries);
        if (panelState.open) render();
      }
    });
  } catch (error) {
    handleContentTaskError(error);
  }
}

function hasActivePanelWork(): boolean {
  return Boolean(panelState.loading || panelState.picking || panelState.error || panelState.entry?.analysis);
}

async function handleMessage(message: any): Promise<unknown> {
  switch (message.type) {
    case 'SHOW_PANEL':
    case 'SHOW_FLOATING_BUTTON':
      floatingHiddenByUser = false;
      void saveFloatingButtonPreference(true);
      setPanelState({ open: true, view: 'main', loading: false, error: undefined, phase: undefined, startedAt: undefined });
      return true;
    case 'HIDE_FLOATING_BUTTON':
      floatingHiddenByUser = true;
      void saveFloatingButtonPreference(false);
      setPanelState({ open: false, loading: false, error: undefined, notice: undefined, picking: undefined, phase: undefined, startedAt: undefined });
      return true;
    case 'ANALYSIS_STARTED':
      if (shouldIgnoreAnalysisMessage(message.payload.entry?.id)) return true;
      lastTarget = message.payload.target;
      activeAnalysisId = message.payload.entry?.id;
      if (activeAnalysisId) canceledAnalysisIds.delete(activeAnalysisId);
      floatingHiddenByUser = false;
      rememberHistoryEntry(message.payload.entry);
      setPanelState({ open: true, view: 'main', loading: true, error: undefined, entry: message.payload.entry, target: lastTarget, phase: 'preparing_image', startedAt: panelState.startedAt || Date.now() });
      return true;
    case 'ANALYSIS_PHASE':
      if (shouldIgnoreAnalysisMessage(message.payload.id)) return true;
      lastTarget = message.payload.target || lastTarget;
      setAnalysisPhase(message.payload.phase, lastTarget);
      return true;
    case 'ANALYSIS_RESULT':
      if (shouldIgnoreAnalysisMessage(message.payload.entry?.id)) return true;
      lastTarget = message.payload.target;
      activeAnalysisId = undefined;
      rememberHistoryEntry(message.payload.entry);
      applySuccessfulEntry(message.payload.entry, lastTarget);
      return true;
    case 'ANALYSIS_ERROR':
      if (shouldIgnoreAnalysisMessage(message.payload.entry?.id)) return true;
      lastTarget = message.payload.target;
      if (message.payload.entry?.id === activeAnalysisId) activeAnalysisId = undefined;
      if (isCurrentSuccessfulEntry(message.payload.entry?.id)) return true;
      rememberHistoryEntry(message.payload.entry);
      setPanelState({ open: !floatingHiddenByUser, loading: false, error: message.payload.error, entry: panelState.entry?.analysis ? panelState.entry : message.payload.entry, target: lastTarget, phase: undefined, startedAt: undefined });
      return true;
    case 'ANALYSIS_CANCELED':
      if (message.payload.entry?.id && canceledAnalysisIds.has(message.payload.entry.id) && activeAnalysisId !== message.payload.entry.id) return true;
      lastTarget = message.payload.target;
      rememberHistoryEntry(message.payload.entry);
      applyCanceledEntry(message.payload.entry, lastTarget);
      return true;
    case 'START_SELECTION':
      floatingHiddenByUser = false;
      await runSelectionAnalysis();
      return true;
    case 'START_IMAGE_PICK':
      floatingHiddenByUser = false;
      await runImagePickAnalysis();
      return true;
    case 'CANVAS_IMAGE_TO_DATA_URL':
      return imageElementToDataUrl(message.payload.srcUrl);
    default:
      return undefined;
  }
}

async function runSelectionAnalysis(): Promise<void> {
  const workToken = beginWork();
  setPanelState({ open: true, view: 'main', loading: false, error: undefined, notice: undefined, picking: 'selection', phase: undefined, startedAt: undefined });
  await waitForNextFrame();
  if (!isCurrentWork(workToken)) return;
  const selection = await startSelectionOverlay(getSelectionCopy());
  if (!isCurrentWork(workToken)) return;
  if (!selection) {
    setPanelState({ open: true, loading: false, picking: undefined, phase: undefined, startedAt: undefined });
    return;
  }
  try {
    startAnalysisPhase('capturing_region');
    const dataUrl = await captureSelectionDataUrl(selection.rect);
    if (!isCurrentWork(workToken)) return;
    lastTarget = {
      kind: 'selection',
      dataUrl,
      pageUrl: location.href,
      title: document.title || 'Page selection'
    };
    setPanelState({ open: true, view: 'main', loading: true, error: undefined, entry: undefined, target: lastTarget, picking: undefined, phase: 'preparing_image' });
    const entry = await sendRuntimeMessage<HistoryEntry>({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
    if (isCurrentWork(workToken)) applyCompletedEntry(entry, lastTarget);
  } catch (error) {
    if (isCurrentWork(workToken) && !panelState.entry?.analysis) setPanelState({ open: true, loading: false, error: errorToMessage(error), picking: undefined, phase: undefined, startedAt: undefined });
  }
}

async function runImagePickAnalysis(): Promise<void> {
  const workToken = beginWork();
  setPanelState({ open: true, view: 'main', loading: false, error: undefined, notice: undefined, picking: 'image', phase: undefined, startedAt: undefined });
  await waitForNextFrame();
  if (!isCurrentWork(workToken)) return;
  const picked = await startImagePicker(getImagePickerCopy());
  if (!isCurrentWork(workToken)) return;
  if (!picked) {
    setPanelState({ open: true, loading: false, notice: undefined, picking: undefined, phase: undefined, startedAt: undefined });
    return;
  }
  lastTarget = {
    kind: 'image',
    srcUrl: picked.srcUrl,
    pageUrl: location.href,
    title: picked.title || document.title || 'Selected image'
  };
  startAnalysisPhase('preparing_image', lastTarget);
  try {
    const entry = await sendRuntimeMessage<HistoryEntry>({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
    if (isCurrentWork(workToken)) applyCompletedEntry(entry, lastTarget);
  } catch (error) {
    if (isCurrentWork(workToken) && !panelState.entry?.analysis) setPanelState({ open: true, loading: false, error: errorToMessage(error), picking: undefined, phase: undefined, startedAt: undefined });
  }
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function captureSelectionDataUrl(rect: DOMRect): Promise<string> {
  const capture = await sendRuntimeMessage<string>({ type: 'CAPTURE_VISIBLE_TAB' });
  return cropVisibleScreenshot(capture, rect);
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
      historyEntries={historyEntries}
      language={interfaceLanguage}
      onClose={() => setPanelState({ open: true, notice: undefined, picking: undefined })}
      onHide={() => {
        floatingHiddenByUser = true;
        runContentTask(saveFloatingButtonPreference(false));
        setPanelState({ open: false, loading: false, error: undefined, notice: undefined, picking: undefined });
      }}
      onOpen={() => setPanelState({ open: true, loading: false, error: undefined })}
      onLanguageChange={(language) => runContentTask(changeInterfaceLanguage(language))}
      onStartAreaSelect={() => runContentTask(runSelectionAnalysis())}
      onStartImagePick={() => runContentTask(runImagePickAnalysis())}
      onAnalyzeFile={(file) => runContentTask(runLocalFileAnalysis(file))}
      onOpenHistory={() => runContentTask(openHistory())}
      onCloseHistory={() => setPanelState({ view: 'main' })}
      onRefreshHistory={() => runContentTask(refreshHistory())}
      onSelectHistoryEntry={(entry) => selectHistoryEntry(entry)}
      onDeleteHistoryEntry={(id) => runContentTask(deleteHistory(id))}
      onClearHistory={() => runContentTask(clearAllHistory())}
      onOpenSettings={() => runContentTask(openSettings())}
      onOpenUpdateSettings={() => runContentTask(openSettings('update'))}
      onCopy={(text, label) => runContentTask(copyText(text, label))}
      onRegenerate={() => runContentTask(regenerate())}
      onCancelAnalysis={() => cancelCurrentWork()}
      onOpenGenerator={(siteId, prompt) => runContentTask(openGenerator(siteId, prompt))}
      onToggleFavorite={(id, favorite) => runContentTask(toggleFavorite(id, favorite))}
    />
  );
}

async function runLocalFileAnalysis(file: File): Promise<void> {
  if (!isImageFile(file)) {
    setPanelState({ open: true, loading: false, error: 'Only image files are supported.', picking: undefined, phase: undefined, startedAt: undefined });
    return;
  }
  floatingHiddenByUser = false;
  const workToken = beginWork();
  startAnalysisPhase('reading_image');
  try {
    const dataUrl = await fileToDataUrl(file);
    if (!isCurrentWork(workToken)) return;
    lastTarget = {
      kind: 'local',
      dataUrl,
      pageUrl: `local-file:${file.name}`,
      title: file.name || 'Local image'
    };
    setAnalysisPhase('preparing_image', lastTarget);
    const entry = await sendRuntimeMessage<HistoryEntry>({ type: 'RUN_ANALYSIS', payload: { target: lastTarget } });
    if (isCurrentWork(workToken)) applyCompletedEntry(entry, lastTarget);
  } catch (error) {
    if (isCurrentWork(workToken) && !panelState.entry?.analysis) setPanelState({ open: true, loading: false, error: errorToMessage(error), picking: undefined, phase: undefined, startedAt: undefined });
  }
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

async function saveFloatingButtonPreference(persistentFloatingButton: boolean): Promise<void> {
  try {
    const settings = await getSettings();
    await saveSettings({ ...settings, persistentFloatingButton });
  } catch {
    // The direct message still updates this page; preference persistence is best effort.
  }
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
  const target = panelState.target || lastTarget;
  if (!canRetryTarget(target)) {
    showNotice(interfaceLanguage === 'zh' ? '无法重试：原始图片数据已不可用。' : 'Cannot retry: source image data is no longer available.');
    return;
  }
  lastTarget = target;
  const workToken = beginWork();
  startAnalysisPhase('preparing_image', target);
  try {
    const entry = await sendRuntimeMessage<HistoryEntry>({ type: 'RUN_ANALYSIS', payload: { target } });
    if (isCurrentWork(workToken)) applyCompletedEntry(entry, target);
  } catch (error) {
    if (isCurrentWork(workToken) && !panelState.entry?.analysis) {
      setPanelState({ open: true, loading: false, error: errorToMessage(error), target, picking: undefined, phase: undefined, startedAt: undefined });
    }
  }
}

function beginWork(): number {
  cancelActiveSelectionOverlay();
  if (activeAnalysisId) {
    canceledAnalysisIds.add(activeAnalysisId);
    runContentTask(sendRuntimeMessage({ type: 'CANCEL_ANALYSIS', payload: { id: activeAnalysisId } }));
    activeAnalysisId = undefined;
  }
  activeWorkToken += 1;
  return activeWorkToken;
}

function isCurrentWork(token: number): boolean {
  return token === activeWorkToken;
}

function startAnalysisPhase(phase: AnalysisPhase, target?: ImageTarget): void {
  setPanelState({ open: true, view: 'main', loading: true, error: undefined, entry: undefined, notice: undefined, picking: undefined, target, phase, startedAt: Date.now() });
}

function setAnalysisPhase(phase: AnalysisPhase, target?: ImageTarget): void {
  setPanelState({ open: true, view: 'main', loading: true, error: undefined, notice: undefined, picking: undefined, target: target || panelState.target, phase, startedAt: panelState.startedAt || Date.now() });
}

function cancelCurrentWork(): void {
  const id = activeAnalysisId || (panelState.entry?.status === 'running' ? panelState.entry.id : undefined);
  activeWorkToken += 1;
  cancelActiveSelectionOverlay();
  if (id) {
    canceledAnalysisIds.add(id);
    activeAnalysisId = undefined;
    runContentTask(sendRuntimeMessage({ type: 'CANCEL_ANALYSIS', payload: { id } }));
  }
  const entry = panelState.entry?.status === 'running' ? { ...panelState.entry, status: 'canceled' as const, error: getCanceledText() } : panelState.entry;
  setPanelState({ open: true, view: 'main', loading: false, error: undefined, entry, target: lastTarget || panelState.target, picking: undefined, notice: getCanceledText(), phase: undefined, startedAt: undefined });
}

function applyCompletedEntry(entry: HistoryEntry | undefined, target: ImageTarget | undefined): void {
  if (entry?.status === 'canceled') {
    applyCanceledEntry(entry, target);
    return;
  }
  applySuccessfulEntry(entry, target);
}

function applyCanceledEntry(entry: HistoryEntry | undefined, target: ImageTarget | undefined): void {
  if (entry?.id) canceledAnalysisIds.add(entry.id);
  if (entry?.id === activeAnalysisId) activeAnalysisId = undefined;
  setPanelState({ open: true, view: 'main', loading: false, error: undefined, entry: panelState.entry?.analysis ? panelState.entry : entry, target, picking: undefined, notice: getCanceledText(), phase: undefined, startedAt: undefined });
}

function shouldIgnoreAnalysisMessage(entryId: string | undefined): boolean {
  if (!entryId) return false;
  if (canceledAnalysisIds.has(entryId)) return true;
  return Boolean(activeAnalysisId && activeAnalysisId !== entryId && panelState.loading);
}

function applySuccessfulEntry(entry: HistoryEntry | undefined, target: ImageTarget | undefined): void {
  if (!entry?.analysis || entry.status !== 'success') return;
  activeAnalysisId = undefined;
  canceledAnalysisIds.delete(entry.id);
  setPanelState({ open: !floatingHiddenByUser, view: 'main', loading: false, error: undefined, entry, target, picking: undefined, phase: undefined, startedAt: undefined });
}

function isCurrentSuccessfulEntry(entryId: string | undefined): boolean {
  return Boolean(entryId && panelState.entry?.id === entryId && panelState.entry.analysis && panelState.entry.status === 'success');
}

function recoverSuccessfulHistory(history: HistoryEntry[] | undefined): void {
  if (!Array.isArray(history) || (!panelState.loading && !panelState.error)) return;
  const currentEntryId = panelState.entry?.id;
  const entry = history.find((item) => item.status === 'success' && item.analysis && (currentEntryId ? item.id === currentEntryId : historyEntryMatchesTarget(item, lastTarget)));
  if (entry) applySuccessfulEntry(entry, lastTarget);
}

function historyEntryMatchesTarget(entry: HistoryEntry, target: ImageTarget | undefined): boolean {
  if (!target) return false;
  if (target.srcUrl && entry.imageUrl === target.srcUrl) return true;
  if (target.pageUrl && entry.pageUrl === target.pageUrl) return true;
  return Boolean(target.title && entry.title === target.title);
}

async function openGenerator(siteId: GeneratorSite, prompt: string): Promise<void> {
  await copyText(prompt, 'Prompt copied');
  await sendRuntimeMessage({ type: 'OPEN_GENERATOR_SITE', payload: { siteId, prompt } });
}

async function openSettings(hash?: 'update'): Promise<void> {
  await sendRuntimeMessage({ type: 'OPEN_OPTIONS_PAGE', payload: hash ? { hash } : undefined });
}

async function openHistory(): Promise<void> {
  if (panelState.loading) {
    showNotice(interfaceLanguage === 'zh' ? '正在识别，先保留当前任务。' : 'Analysis is running. Keeping the current task visible.');
    return;
  }
  historyEntries = await getHistory();
  setPanelState({ open: true, view: 'history', notice: undefined, picking: undefined });
}

async function refreshHistory(): Promise<void> {
  historyEntries = await getHistory();
  render();
}

function rememberHistoryEntry(entry: HistoryEntry | undefined): void {
  if (!entry?.id) return;
  historyEntries = [entry, ...historyEntries.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
}

async function deleteHistory(id: string): Promise<void> {
  historyEntries = await deleteHistoryEntry(id);
  render();
}

async function clearAllHistory(): Promise<void> {
  await clearHistory();
  historyEntries = [];
  showNotice(interfaceLanguage === 'zh' ? '历史已清空。' : 'History cleared.');
  render();
}

function selectHistoryEntry(entry: HistoryEntry): void {
  if (panelState.loading) {
    showNotice(interfaceLanguage === 'zh' ? '正在识别，先保留当前任务。' : 'Analysis is running. Keeping the current task visible.');
    return;
  }
  lastTarget = historyEntryToTarget(entry);
  setPanelState({ open: true, view: 'main', loading: false, error: entry.status === 'failed' ? entry.error : undefined, entry, target: lastTarget, picking: undefined, phase: undefined, startedAt: undefined });
}

function historyEntryToTarget(entry: HistoryEntry): ImageTarget | undefined {
  const source = entry.imageUrl || entry.pageUrl;
  if (!source) return undefined;
  if (entry.imageUrl) return { kind: 'image', srcUrl: entry.imageUrl, pageUrl: entry.pageUrl, title: entry.title };
  return { kind: entry.pageUrl?.startsWith('local-file:') ? 'local' : 'page', pageUrl: entry.pageUrl, title: entry.title };
}

function canRetryTarget(target: ImageTarget | undefined): target is ImageTarget {
  return Boolean(target?.dataUrl || target?.srcUrl);
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

function getCanceledText(): string {
  return interfaceLanguage === 'zh' ? '已取消识别。' : 'Analysis canceled.';
}

function normalizeInterfaceLanguage(language: InterfaceLanguage): InterfaceLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

function getImagePickerCopy() {
  if (interfaceLanguage === 'zh') {
    return {
      prompt: '点击任意图片开始识别。按 Esc 取消。',
      hover: '当前图片，点击识别',
      selected: '已选择，右侧生成中'
    };
  }
  return {
    prompt: 'Click any image to analyze. Press Esc to cancel.',
    hover: 'Current image, click to analyze',
    selected: 'Selected. Building in panel'
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
    if (!isRuntimeAvailable()) {
      reject(new Error('Extension context invalidated.'));
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) reject(new Error(response?.error || 'Runtime request failed.'));
        else resolve(response.data as T);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function runContentTask(task: Promise<unknown>): void {
  task.catch(handleContentTaskError);
}

function handleContentTaskError(error: unknown): void {
  if (isExtensionContextInvalidated(error)) {
    activeWorkToken += 1;
    activeAnalysisId = undefined;
    if (root) {
      setPanelState({ open: true, loading: false, error: errorToMessage(error), picking: undefined, phase: undefined, startedAt: undefined });
    }
    return;
  }
  console.error(error);
}

function sendResponseSafely<T>(sendResponse: (response?: RuntimeResponse<T>) => void, response: RuntimeResponse<T>): void {
  try {
    sendResponse(response);
  } catch (error) {
    handleContentTaskError(error);
  }
}

function isRuntimeAvailable(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && typeof chrome.runtime.sendMessage === 'function';
  } catch {
    return false;
  }
}

async function writeClipboardText(text: string): Promise<void> {
  let clipboardError: unknown;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      clipboardError = error;
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
  document.documentElement.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw (clipboardError instanceof Error ? clipboardError : new Error('Clipboard write failed.'));
}

function errorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/extension context invalidated/i.test(message)) return '扩展已重新加载，请从工具栏重新打开面板。';
  return message;
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return /extension context invalidated/i.test(error instanceof Error ? error.message : String(error));
}
