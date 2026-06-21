import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, GENERATOR_SITE_IDS, MAX_API_TIMEOUT_SECONDS, MIN_API_TIMEOUT_SECONDS } from '../shared/defaults';
import { GENERATOR_SITES } from '../shared/generators';
import { getSettings, saveSettings } from '../shared/storage';
import type { AppSettings, InterfaceLanguage, RuntimeResponse } from '../shared/types';
import { RELEASES_URL, checkLatestRelease, createIdleUpdateInfo } from '../shared/updates';
import type { UpdateInfo, UpdateState } from '../shared/updates';

const optionsCopy = {
  en: {
    title: 'Zhijuan Prompt',
    settings: 'API Settings',
    subtitle: 'Connection and generator defaults live here, away from the daily popup.',
    ready: 'Ready',
    saved: 'Saved',
    testing: 'Testing',
    enabled: 'Enabled',
    persistentFloatingButton: 'Persistent floating button',
    endpointSection: 'Endpoint',
    endpointBody: 'The extension sends selected images only to this API endpoint.',
    generationSection: 'Generation',
    generationBody: 'Model and destination used after a prompt is produced.',
    interfaceSection: 'Interface',
    interfaceBody: 'Language and extension state.',
    updateSection: 'Updates',
    updateBody: 'Check the latest GitHub release and open the bilingual update notes.',
    currentVersion: 'Installed version',
    latestVersion: 'Latest version',
    checkUpdates: 'Check updates',
    openRelease: 'Open release notes',
    checkingUpdates: 'Checking',
    updateReady: 'Ready',
    updateAvailable: 'Update available',
    upToDate: 'Up to date',
    updateCheckFailed: 'Unable to check updates',
    updateInstallHint: 'Unpacked installs cannot replace themselves silently. Read the bilingual release notes, download the latest release, unzip it, then reload the extension folder.',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    apiTimeout: 'API timeout seconds',
    apiTimeoutHint: 'Long reasoning models may need 600s or more.',
    model: 'Model',
    language: 'Interface language',
    defaultGenerator: 'Default generator',
    save: 'Save',
    saveAndTest: 'Save and test',
    footer: 'Images are sent only to the configured API endpoint. API key stays in chrome.storage.local.',
    privacy: 'Privacy boundary',
    privacyBody: 'No account, no analytics, no extension cloud. Page images are analyzed only after you pick an image or capture a region.',
    permissions: 'Permission posture',
    permissionsBody:
      'Content script and scripting power the picker and floating panel. <all_urls> supports user-triggered image picking on HTTP/HTTPS pages; file:///* supports local-file workflows when enabled by the browser user. storage keeps local settings/history, clipboardWrite copies prompts.'
  },
  zh: {
    title: 'Zhijuan Prompt',
    settings: 'API 设置',
    subtitle: '连接、模型、默认生成器放在这里，日常弹窗只保留操作入口。',
    ready: '准备就绪',
    saved: '已保存',
    testing: '测试中',
    enabled: '启用',
    persistentFloatingButton: '常驻浮标',
    endpointSection: '连接端点',
    endpointBody: '插件只会把你主动选择的图片发送到这个 API 端点。',
    generationSection: '生成配置',
    generationBody: '识别完成后默认使用的模型与生成器入口。',
    interfaceSection: '界面',
    interfaceBody: '语言和扩展启用状态。',
    updateSection: '更新',
    updateBody: '检查 GitHub 最新 Release，并打开中英双语更新说明。',
    currentVersion: '当前安装版本',
    latestVersion: '最新版本',
    checkUpdates: '检查更新',
    openRelease: '打开更新说明',
    checkingUpdates: '检查中',
    updateReady: '准备就绪',
    updateAvailable: '发现新版本',
    upToDate: '已是最新',
    updateCheckFailed: '无法检查更新',
    updateInstallHint: '本地加载的 unpacked 插件不能在插件内静默替换。阅读中英双语更新说明，下载最新 release、解压后，在扩展页重新加载该文件夹。',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    apiTimeout: 'API 超时秒数',
    apiTimeoutHint: '深度思考模型建议 600 秒或更长。',
    model: 'Model',
    language: '界面语言',
    defaultGenerator: '默认生成器',
    save: '保存',
    saveAndTest: '保存并测试',
    footer: '图片只发送到你配置的 API 端点，API Key 保存在 chrome.storage.local。',
    privacy: '隐私边界',
    privacyBody: '无账号、无统计、无扩展云端。只有你主动选择图片或截取区域后才会分析页面图片。',
    permissions: '权限说明',
    permissionsBody:
      'content script 和 scripting 用于选图与浮动面板。<all_urls> 支持在用户主动触发时处理 HTTP/HTTPS 页面；file:///* 支持用户在浏览器里启用后的本地文件页面。storage 保存本地设置和历史，clipboardWrite 用于复制 Prompt。'
  }
} as const;

type SettingsSectionId = 'endpoint' | 'generation' | 'interface' | 'update' | 'privacy';
type OptionsLabels = (typeof optionsCopy)[keyof typeof optionsCopy];

export function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<string>(optionsCopy.zh.ready);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(() => (window.location.hash === '#update' ? 'update' : 'endpoint'));
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(() => createIdleUpdateInfo());
  const endpointRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef<HTMLDivElement>(null);
  const interfaceRef = useRef<HTMLDivElement>(null);
  const updateRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLElement>(null);
  const language = normalizeLanguage(settings.interfaceLanguage);
  const labels = optionsCopy[language];
  const railItems: { id: SettingsSectionId; label: string }[] = [
    { id: 'endpoint', label: `01 ${labels.endpointSection}` },
    { id: 'generation', label: `02 ${labels.generationSection}` },
    { id: 'interface', label: `03 ${labels.interfaceSection}` },
    { id: 'update', label: `04 ${labels.updateSection}` },
    { id: 'privacy', label: `05 ${labels.privacy}` }
  ];

  useEffect(() => {
    void getSettings().then((next) => {
      setSettings(next);
      setStatus(optionsCopy[normalizeLanguage(next.interfaceLanguage)].ready);
    });
  }, []);

  useEffect(() => {
    if (window.location.hash !== '#update') return;
    window.setTimeout(() => updateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' }), 0);
  }, []);

  async function save() {
    const next = await saveSettings(settings);
    setSettings(next);
    setStatus(optionsCopy[normalizeLanguage(next.interfaceLanguage)].saved);
  }

  async function test() {
    await save();
    setStatus(labels.testing);
    try {
      const result = await sendRuntimeMessage<{ schema: boolean; message: string }>({ type: 'TEST_CONNECTION', payload: settings });
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function jumpToSection(section: SettingsSectionId) {
    const target = {
      endpoint: endpointRef.current,
      generation: generationRef.current,
      interface: interfaceRef.current,
      update: updateRef.current,
      privacy: privacyRef.current
    }[section];
    setActiveSection(section);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }

  async function checkForUpdates() {
    setUpdateInfo((current) => ({ ...current, state: 'checking' }));
    try {
      setUpdateInfo(await checkLatestRelease(updateInfo.currentVersion));
    } catch {
      setUpdateInfo((current) => ({ ...current, state: 'failed', releaseUrl: RELEASES_URL }));
    }
  }

  function openReleasePage() {
    window.open(updateInfo.releaseUrl || RELEASES_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="options-shell">
      <aside className="settings-rail">
        <div className="rail-brand">
          <p>{labels.title}</p>
          <h1>{labels.settings}</h1>
        </div>
        <nav aria-label={labels.settings}>
          {railItems.map((item) => (
            <button
              className={activeSection === item.id ? 'rail-nav-item is-active' : 'rail-nav-item'}
              type="button"
              onClick={() => jumpToSection(item.id)}
              key={item.id}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="rail-status" type="button" onClick={() => void test()}>
          <span>{labels.ready}</span>
          <strong>{status}</strong>
        </button>
      </aside>

      <section className="settings-workbench">
        <header className="workbench-head">
          <div>
            <p>{labels.title}</p>
            <h1>{labels.settings}</h1>
            <small>{labels.subtitle}</small>
          </div>
          <span>{status}</span>
        </header>

        <div className="settings-section settings-section--endpoint" ref={endpointRef}>
          <div className="section-copy">
            <span>01</span>
            <h2>{labels.endpointSection}</h2>
            <p>{labels.endpointBody}</p>
          </div>
          <div className="field-grid">
            <label>
              {labels.baseUrl}
              <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} />
            </label>
            <label>
              {labels.apiKey}
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
              />
            </label>
            <label>
              {labels.apiTimeout}
              <input
                type="number"
                min={MIN_API_TIMEOUT_SECONDS}
                max={MAX_API_TIMEOUT_SECONDS}
                step={30}
                value={settings.apiTimeoutSeconds}
                onChange={(event) => setSettings({ ...settings, apiTimeoutSeconds: Number(event.target.value) })}
              />
              <small>{labels.apiTimeoutHint}</small>
            </label>
          </div>
        </div>

        <div className="settings-section" ref={generationRef}>
          <div className="section-copy">
            <span>02</span>
            <h2>{labels.generationSection}</h2>
            <p>{labels.generationBody}</p>
          </div>
          <div className="field-grid">
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
                    {GENERATOR_SITES[site].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="settings-section settings-section--compact" ref={interfaceRef}>
          <div className="section-copy">
            <span>03</span>
            <h2>{labels.interfaceSection}</h2>
            <p>{labels.interfaceBody}</p>
          </div>
          <div className="field-grid">
            <label>
              {labels.language}
              <select
                value={settings.interfaceLanguage}
                onChange={(event) => setSettings({ ...settings, interfaceLanguage: event.target.value as AppSettings['interfaceLanguage'] })}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>{labels.enabled}</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <span>{labels.persistentFloatingButton}</span>
              <input
                type="checkbox"
                checked={settings.persistentFloatingButton}
                onChange={(event) => setSettings({ ...settings, persistentFloatingButton: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-section settings-section--compact" ref={updateRef}>
          <div className="section-copy">
            <span>04</span>
            <h2>{labels.updateSection}</h2>
            <p>{labels.updateBody}</p>
          </div>
          <div className="update-panel">
            <div className="version-grid">
              <div>
                <span>{labels.currentVersion}</span>
                <strong>{updateInfo.currentVersion}</strong>
              </div>
              <div>
                <span>{labels.latestVersion}</span>
                <strong>{updateInfo.latestVersion || '-'}</strong>
              </div>
              <div className={`update-state update-state--${updateInfo.state}`}>{getUpdateStateLabel(updateInfo.state, labels)}</div>
            </div>
            <div className="button-row">
              <button type="button" onClick={() => void checkForUpdates()} disabled={updateInfo.state === 'checking'}>
                {updateInfo.state === 'checking' ? labels.checkingUpdates : labels.checkUpdates}
              </button>
              <button type="button" className="primary" onClick={openReleasePage}>
                {labels.openRelease}
              </button>
            </div>
            {updateInfo.releaseName ? <p>{updateInfo.releaseName}</p> : null}
            <p>{labels.updateInstallHint}</p>
          </div>
        </div>

        <div className="button-row">
          <button type="button" onClick={() => void save()}>
            {labels.save}
          </button>
          <button type="button" className="primary" onClick={() => void test()}>
            {labels.saveAndTest}
          </button>
        </div>

        <footer>{labels.footer}</footer>
      </section>

      <aside className="trust-panel" aria-label={labels.privacy}>
        <article ref={privacyRef}>
          <span>01</span>
          <h2>{labels.privacy}</h2>
          <p>{labels.privacyBody}</p>
        </article>
        <article>
          <span>02</span>
          <h2>{labels.permissions}</h2>
          <p>{labels.permissionsBody}</p>
        </article>
      </aside>
    </main>
  );
}

function normalizeLanguage(language: InterfaceLanguage) {
  return language === 'zh' ? 'zh' : 'en';
}

function getUpdateStateLabel(state: UpdateState, labels: OptionsLabels) {
  if (state === 'checking') return labels.checkingUpdates;
  if (state === 'available') return labels.updateAvailable;
  if (state === 'current') return labels.upToDate;
  if (state === 'failed') return labels.updateCheckFailed;
  return labels.updateReady;
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
