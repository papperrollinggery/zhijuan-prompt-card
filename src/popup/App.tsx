import { type DragEvent as ReactDragEvent, type ChangeEvent as ReactChangeEvent, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import { fileToDataUrl, isImageFile } from '../shared/imageData';
import { getSettings, saveSettings, getHistory } from '../shared/storage';
import type { AppSettings, HistoryEntry, InterfaceLanguage, RuntimeResponse } from '../shared/types';
import { checkLatestRelease, createIdleUpdateInfo } from '../shared/updates';
import type { UpdateInfo } from '../shared/updates';
import { HistoryView } from './HistoryView';

type ViewMode = 'home' | 'history';
type UiLanguage = 'zh' | 'en';

const popupCopy = {
  en: {
    title: 'Zhijuan Prompt',
    subtitle: 'Image source',
    ready: 'Ready',
    saved: 'Saved',
    testing: 'Analyzing',
    localApi: 'Status',
    pickImage: 'Upload',
    captureArea: 'Capture',
    localFile: 'Local',
    pickHint: 'Selected image enters the lens.',
    captureHint: 'Captured region enters the result lens.',
    dropHint: 'Drop local image here',
    dropActive: 'Release to analyze',
    invalidFile: 'Only image files are supported.',
    resultPanel: 'Latest result',
    resultPanelBody: 'Open History to copy prompts',
    history: 'History',
    settings: 'Settings',
    showFloatingButton: 'Show',
    hideFloatingButton: 'Hide',
    test: 'Test',
    model: 'Model',
    generator: 'Generator',
    testConnection: 'Test API',
    apiSettings: 'API settings',
    activeTab: 'Open a webpage first.',
    storage: 'Local',
    entries: 'entries',
    actionHint: 'Choose an image, then open History.',
    dockLabel: 'Local workflow',
    updateAvailable: 'Update available',
    updateCta: 'Open update settings'
  },
  zh: {
    title: 'Zhijuan Prompt',
    subtitle: '图片源',
    ready: '准备就绪',
    saved: '已保存',
    testing: '识别中',
    localApi: '识别状态',
    pickImage: '上传图片',
    captureArea: '框选',
    localFile: '本地',
    pickHint: '选图后进入结果镜头。',
    captureHint: '截取区域会进入结果镜头。',
    dropHint: '本地图片拖到这里',
    dropActive: '松手识别',
    invalidFile: '只支持图片文件。',
    resultPanel: '最近结果',
    resultPanelBody: '去历史复制提示词',
    history: '历史',
    settings: '设置',
    showFloatingButton: '显示浮标',
    hideFloatingButton: '隐藏',
    test: '测试',
    model: 'Model',
    generator: '生成器',
    testConnection: '测试 API',
    apiSettings: 'API 设置',
    activeTab: '先打开网页再用框选。',
    storage: '本地',
    entries: '条',
    actionHint: '上传后到历史查看。',
    dockLabel: '本地流程',
    updateAvailable: '有更新',
    updateCta: '去更新设置'
  }
} as const;

export function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<string>(popupCopy.zh.ready);
  const [view, setView] = useState<ViewMode>(() => (window.location.hash === '#history' ? 'history' : 'home'));
  const [fileDragActive, setFileDragActive] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(() => createIdleUpdateInfo());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const language = normalizeLanguage(settings.interfaceLanguage);
  const labels = popupCopy[language];

  useEffect(() => {
    void refresh();
    void refreshUpdateNotice();
  }, []);

  async function refresh() {
    const nextSettings = await getSettings();
    setSettings(nextSettings);
    setStatus(popupCopy[normalizeLanguage(nextSettings.interfaceLanguage)].ready);
    setHistory(await getHistory());
  }

  async function refreshUpdateNotice() {
    try {
      const next = await checkLatestRelease(updateInfo.currentVersion);
      setUpdateInfo(next.state === 'available' ? next : createIdleUpdateInfo());
    } catch {
      setUpdateInfo(createIdleUpdateInfo());
    }
  }

  async function testConnection() {
    setStatus(labels.testing);
    try {
      const result = await sendRuntimeMessage<{ schema: boolean; message: string }>({
        type: 'TEST_CONNECTION',
        payload: settings
      });
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function sendActiveTabCommand(type: 'START_SELECTION' | 'START_IMAGE_PICK' | 'SHOW_FLOATING_BUTTON' | 'HIDE_FLOATING_BUTTON') {
    if (type === 'SHOW_FLOATING_BUTTON' || type === 'HIDE_FLOATING_BUTTON') {
      await sendFloatingButtonCommand(type);
      return;
    }
    const tab = await getActivePageTab();
    if (!tab?.id) {
      setStatus(labels.activeTab);
      return;
    }
    try {
      await sendRuntimeMessage({ type: 'DISPATCH_TAB_COMMAND', payload: { command: type, tabId: tab.id } });
      window.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function sendFloatingButtonCommand(type: 'SHOW_FLOATING_BUTTON' | 'HIDE_FLOATING_BUTTON') {
    try {
      const persistentFloatingButton = type === 'SHOW_FLOATING_BUTTON';
      const nextSettings = await saveSettings({ ...settings, persistentFloatingButton });
      setSettings(nextSettings);
      await sendRuntimeMessage({ type: 'DISPATCH_TAB_COMMAND', payload: { command: type, allPageTabs: true } });
      window.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function analyzeLocalFile(file: File | undefined) {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatus(labels.invalidFile);
      return;
    }
    setStatus(labels.testing);
    try {
      const dataUrl = await fileToDataUrl(file);
      await sendRuntimeMessage({
        type: 'RUN_ANALYSIS',
        payload: {
          target: {
            kind: 'local',
            dataUrl,
            title: file.name,
            pageUrl: `local-file:${file.name}`
          }
        }
      });
      setStatus(labels.saved);
      setHistory(await getHistory());
      window.setTimeout(() => window.close(), 250);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function handleFileChange(event: ReactChangeEvent<HTMLInputElement>) {
    void analyzeLocalFile(firstImageFile(event.currentTarget.files));
    event.currentTarget.value = '';
  }

  function handleFileDrag(event: ReactDragEvent<HTMLElement>) {
    if (!hasFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setFileDragActive(true);
  }

  function handleFileDragLeave(event: ReactDragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setFileDragActive(false);
  }

  function handleFileDrop(event: ReactDragEvent<HTMLElement>) {
    if (!hasFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    setFileDragActive(false);
    void analyzeLocalFile(firstImageFile(event.dataTransfer.files));
  }

  async function changeLanguage(interfaceLanguage: InterfaceLanguage) {
    const next = await saveSettings({ ...settings, interfaceLanguage });
    setSettings(next);
    setStatus(popupCopy[normalizeLanguage(interfaceLanguage)].saved);
  }

  function openUpdateSettings() {
    void chrome.tabs.create({ url: chrome.runtime.getURL('options.html#update') });
    window.close();
  }

  if (view === 'history') {
    return <HistoryView entries={history} language={language} onBack={() => setView('home')} onRefresh={() => void refresh()} />;
  }

  return (
    <main className="app-shell">
      <input id="zpc-local-file-input" ref={fileInputRef} className="file-input" type="file" accept="image/*" onChange={handleFileChange} />
      <header className="microbar">
        <div className="brand">
          <p>{labels.title}</p>
          <h1>{labels.subtitle}</h1>
        </div>
        <div className="language-pills" aria-label="Language">
          <button className={language === 'zh' ? 'is-active' : ''} type="button" onClick={() => void changeLanguage('zh')}>
            中
          </button>
          <button className={language === 'en' ? 'is-active' : ''} type="button" onClick={() => void changeLanguage('en')}>
            EN
          </button>
        </div>
      </header>

      {updateInfo.state === 'available' ? (
        <button className="update-notice" type="button" onClick={openUpdateSettings}>
          <span>{labels.updateAvailable}</span>
          <strong>
            {updateInfo.currentVersion}
            {' -> '}
            {updateInfo.latestVersion}
          </strong>
          <em>{labels.updateCta}</em>
        </button>
      ) : null}

      <section
        className={fileDragActive ? 'command-puck is-drop-active' : 'command-puck'}
        aria-label={labels.dockLabel}
        onDragEnter={handleFileDrag}
        onDragOver={handleFileDrag}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <button type="button" className="orbit-action orbit-action--secondary" onClick={() => void sendActiveTabCommand('START_SELECTION')}>
          <IconCrop />
          <span>{labels.captureArea}</span>
        </button>
        <label className="puck-core" htmlFor="zpc-local-file-input">
          <span>{labels.subtitle}</span>
          <strong>{fileDragActive ? labels.dropActive : labels.dropHint}</strong>
        </label>
        <label className="orbit-action orbit-action--primary" htmlFor="zpc-local-file-input">
          <IconImage />
          <span>{labels.pickImage}</span>
        </label>
      </section>

      <section className="signal-strip">
        <button className="signal-card" type="button" onClick={() => void testConnection()}>
          <span>{labels.localApi}</span>
          <strong>{status}</strong>
          <em>{labels.testConnection}</em>
        </button>
        <button className="signal-card" type="button" onClick={() => setView('history')}>
          <span>{labels.resultPanel}</span>
          <strong>{labels.resultPanelBody}</strong>
          <em>{labels.model}: {settings.model}</em>
        </button>
      </section>

      <section className="utility-dock" aria-label={labels.dockLabel}>
        <button type="button" onClick={() => setView('history')} aria-label={labels.history}>
          <IconHistory />
          <span>{history.length}</span>
        </button>
        <label className="file-trigger" htmlFor="zpc-local-file-input">
          <IconUpload />
          <span>{labels.localFile}</span>
        </label>
        <button type="button" onClick={() => void sendActiveTabCommand('SHOW_FLOATING_BUTTON')}>
          <IconEye />
          <span>{labels.showFloatingButton}</span>
        </button>
        <button type="button" onClick={() => void sendActiveTabCommand('HIDE_FLOATING_BUTTON')}>
          <IconEyeOff />
          <span>{labels.hideFloatingButton}</span>
        </button>
        <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
          <IconSettings />
          <span>{labels.settings}</span>
        </button>
      </section>
    </main>
  );
}

function firstImageFile(files: FileList | null): File | undefined {
  if (!files) return undefined;
  return [...files].find(isImageFile);
}

function hasFileDrag(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files');
}

function normalizeLanguage(language: InterfaceLanguage): UiLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

async function getActivePageTab(): Promise<chrome.tabs.Tab | undefined> {
  const [currentWindowTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isPageTab(currentWindowTab)) return currentWindowTab;

  const [lastFocusedTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (isPageTab(lastFocusedTab)) return lastFocusedTab;

  const activeTabs = await chrome.tabs.query({ active: true });
  return activeTabs.find(isPageTab);
}

function isPageTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  if (!tab?.id) return false;
  const url = tab.url || tab.pendingUrl || '';
  return /^https?:\/\//.test(url) || /^file:\/\//.test(url);
}

function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) reject(new Error(response?.error || 'Request failed.'));
      else resolve(response.data as T);
    });
  });
}

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.8 7.4c0-1 .8-1.8 1.8-1.8h8.8c1 0 1.8.8 1.8 1.8v9.2c0 1-.8 1.8-1.8 1.8H7.6c-1 0-1.8-.8-1.8-1.8V7.4Z" />
      <path d="m7.2 16 3.3-3.2 2 1.9 1.3-1.4 3 2.7" />
      <path d="M14.9 9.1h.1" />
    </svg>
  );
}

function IconCrop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.8v11.4c0 1 .8 1.8 1.8 1.8h11.4" />
      <path d="M3.8 7H15c1.1 0 2 .9 2 2v11.2" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4.8" />
      <path d="m7.6 9.2 4.4-4.4 4.4 4.4" />
      <path d="M5.2 15.2v2.6c0 .9.7 1.6 1.6 1.6h10.4c.9 0 1.6-.7 1.6-1.6v-2.6" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 5.6h13M5.5 12h13M5.5 18.4h8.8" />
      <path d="M4.8 4.4v15.2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="m18.7 14 .1-2-.1-2 1.7-1.2-1.8-3.1-2 .8a7.7 7.7 0 0 0-1.7-1l-.3-2.1h-5.2l-.3 2.1a7.7 7.7 0 0 0-1.7 1l-2-.8-1.8 3.1L5.3 10a7.8 7.8 0 0 0-.1 2l.1 2-1.7 1.2 1.8 3.1 2-.8c.5.4 1.1.7 1.7 1l.3 2.1h5.2l.3-2.1c.6-.3 1.2-.6 1.7-1l2 .8 1.8-3.1L18.7 14Z" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 12s3-5.2 8.2-5.2S20.2 12 20.2 12s-3 5.2-8.2 5.2S3.8 12 3.8 12Z" />
      <path d="M12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 12s3-5.2 8.2-5.2S20.2 12 20.2 12s-3 5.2-8.2 5.2S3.8 12 3.8 12Z" />
      <path d="M5 5l14 14" />
    </svg>
  );
}
