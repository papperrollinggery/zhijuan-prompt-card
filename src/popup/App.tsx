import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, GENERATOR_SITE_IDS } from '../shared/defaults';
import { getSettings, saveSettings, getHistory } from '../shared/storage';
import type { AppSettings, HistoryEntry, InterfaceLanguage, RuntimeResponse } from '../shared/types';
import { HistoryView } from './HistoryView';

type ViewMode = 'home' | 'history';
type UiLanguage = 'zh' | 'en';

const popupCopy = {
  en: {
    title: 'Zhijuan Prompt',
    subtitle: 'Local image prompt analysis',
    ready: 'Ready',
    saved: 'Saved',
    testing: 'Testing',
    localApi: 'Local API',
    customApi: 'Custom API',
    customApiBody: 'Endpoint, key, model, and generator handoff are editable here.',
    pickImage: 'Pick image',
    captureArea: 'Capture area',
    history: 'History',
    settings: 'Settings',
    moreSettings: 'More settings',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    model: 'Model',
    defaultGenerator: 'Default generator',
    saveAndTest: 'Save and test',
    privacyTitle: 'Local-first',
    privacyBody: 'Images go only to your configured API endpoint. History and keys stay in chrome.storage.local.',
    activeTab: 'Active tab only',
    storage: 'Local history',
    entries: 'entries'
  },
  zh: {
    title: 'Zhijuan Prompt',
    subtitle: '本地图片提示词识别',
    ready: '准备就绪',
    saved: '已保存',
    testing: '测试中',
    localApi: '本地 API',
    customApi: '自定义 API',
    customApiBody: '接口地址、密钥、模型和默认生成器都在这里直接改。',
    pickImage: '选择图片',
    captureArea: '截取区域',
    history: '历史',
    settings: '设置',
    moreSettings: '更多设置',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    model: 'Model',
    defaultGenerator: '默认生成器',
    saveAndTest: '保存并测试',
    privacyTitle: '本地优先',
    privacyBody: '图片只发送到你配置的 API 端点，历史和密钥保存在 chrome.storage.local。',
    activeTab: '仅当前标签页',
    storage: '本地历史',
    entries: '条'
  }
} as const;

export function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<string>(popupCopy.zh.ready);
  const [view, setView] = useState<ViewMode>('home');
  const language = normalizeLanguage(settings.interfaceLanguage);
  const labels = popupCopy[language];

  useEffect(() => {
    void refresh();
  }, []);

  const apiHost = useMemo(() => {
    try {
      return new URL(settings.baseUrl).host;
    } catch {
      return settings.baseUrl;
    }
  }, [settings.baseUrl]);

  async function refresh() {
    const nextSettings = await getSettings();
    setSettings(nextSettings);
    setStatus(popupCopy[normalizeLanguage(nextSettings.interfaceLanguage)].ready);
    setHistory(await getHistory());
  }

  async function saveCurrentSettings() {
    const next = await saveSettings(settings);
    setSettings(next);
    setStatus(popupCopy[normalizeLanguage(next.interfaceLanguage)].saved);
  }

  async function testConnection() {
    await saveCurrentSettings();
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

  async function sendActiveTabCommand(type: 'START_SELECTION' | 'START_IMAGE_PICK') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;
    void chrome.tabs.sendMessage(tab.id, { type }).catch(() => undefined);
    window.close();
  }

  async function changeLanguage(interfaceLanguage: InterfaceLanguage) {
    const next = await saveSettings({ ...settings, interfaceLanguage });
    setSettings(next);
    setStatus(popupCopy[normalizeLanguage(interfaceLanguage)].saved);
  }

  if (view === 'history') {
    return <HistoryView entries={history} language={language} onBack={() => setView('home')} onRefresh={() => void refresh()} />;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p>{labels.title}</p>
          <h1>{labels.subtitle}</h1>
        </div>
        <span className="status-pill">{settings.model}</span>
      </header>

      <section className="language-row" aria-label="Language">
        <button className={language === 'zh' ? 'is-active' : ''} type="button" onClick={() => void changeLanguage('zh')}>
          中文
        </button>
        <button className={language === 'en' ? 'is-active' : ''} type="button" onClick={() => void changeLanguage('en')}>
          English
        </button>
      </section>

      <section className="status-card">
        <span>{labels.localApi}</span>
        <strong>{apiHost}</strong>
        <p>{status}</p>
      </section>

      <section className="settings-card">
        <div className="card-heading">
          <div>
            <span>{labels.customApi}</span>
            <p>{labels.customApiBody}</p>
          </div>
          <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
            {labels.moreSettings}
          </button>
        </div>
        <label>
          {labels.baseUrl}
          <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} />
        </label>
        <label>
          {labels.apiKey}
          <input
            value={settings.apiKey}
            type="password"
            onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
          />
        </label>
        <div className="settings-grid">
          <label>
            {labels.model}
            <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
          </label>
          <label>
            {labels.defaultGenerator}
            <select
              value={settings.defaultGeneratorSite}
              onChange={(event) =>
                setSettings({ ...settings, defaultGeneratorSite: event.target.value as AppSettings['defaultGeneratorSite'] })
              }
            >
              {GENERATOR_SITE_IDS.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="primary wide" onClick={() => void testConnection()}>
          {labels.saveAndTest}
        </button>
      </section>

      <section className="trust-card">
        <div>
          <span>{labels.privacyTitle}</span>
          <p>{labels.privacyBody}</p>
        </div>
        <div className="trust-grid">
          <strong>{labels.activeTab}</strong>
          <strong>{history.length} {labels.entries}</strong>
          <em>{labels.storage}</em>
        </div>
      </section>

      <section className="quick-grid">
        <button type="button" className="primary" onClick={() => void sendActiveTabCommand('START_IMAGE_PICK')}>
          {labels.pickImage}
        </button>
        <button type="button" onClick={() => void sendActiveTabCommand('START_SELECTION')}>
          {labels.captureArea}
        </button>
        <button type="button" onClick={() => setView('history')}>
          {labels.history}
        </button>
        <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
          {labels.settings}
        </button>
      </section>
    </main>
  );
}

function normalizeLanguage(language: InterfaceLanguage): UiLanguage {
  return language === 'zh' ? 'zh' : 'en';
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
