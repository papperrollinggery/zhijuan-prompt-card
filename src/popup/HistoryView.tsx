import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { canShowHistoryImage, getHistoryImageKey, getHistoryImageSrc, getHistoryPreviewText, getHistoryPrompt, getHistorySource, getHistoryStatusLabel, getVisualHistoryEntries, stringifyGeneratorJsonPrompt } from '../shared/historyDisplay';
import { clearHistory, deleteHistoryEntry, getHistory, updateHistoryEntry } from '../shared/storage';
import type { HistoryEntry, InterfaceLanguage } from '../shared/types';

const historyCopy = {
  en: {
    back: 'Back',
    history: 'History records',
    localEntries: 'records',
    refresh: 'Refresh',
    clearAll: 'Clear history',
    copyPrompt: 'Copy prompt',
    copyJson: 'Copy JSON prompt',
    copySource: 'Copy source',
    openSource: 'Open source',
    promptPreview: 'Prompt',
    source: 'Source',
    storageTitle: 'Local storage',
    storageBody: 'Saved locally in chrome.storage.local: prompts, source URL, time, status, and settings. Local image files are not copied into a folder.',
    storageUsage: 'Storage used',
    copyStoragePath: 'Copy storage path',
    storagePathCopied: 'Storage path copied',
    visualHistory: 'Visual history',
    noImage: 'No preview',
    saved: 'Saved',
    save: 'Save',
    delete: 'Delete',
    empty: 'No history yet'
  },
  zh: {
    back: '返回',
    history: '历史记录',
    localEntries: '条记录',
    refresh: '刷新',
    clearAll: '清空历史',
    copyPrompt: '复制提示词',
    copyJson: '复制 JSON 提示词',
    copySource: '复制来源',
    openSource: '打开来源',
    promptPreview: '提示词',
    source: '来源',
    storageTitle: '本地存储',
    storageBody: '保存在 chrome.storage.local：提示词、来源 URL、时间、状态和设置。本地图片不会另存成文件夹。',
    storageUsage: '存储占用',
    copyStoragePath: '复制存储路径',
    storagePathCopied: '已复制存储路径',
    visualHistory: '视觉历史',
    noImage: '无预览',
    saved: '已保存',
    save: '保存',
    delete: '删除',
    empty: '暂无历史'
  }
} as const;

export function HistoryView(props: { entries: HistoryEntry[]; language: InterfaceLanguage; onBack: () => void; onRefresh: () => void }) {
  const labels = historyCopy[props.language === 'zh' ? 'zh' : 'en'];
  const [notice, setNotice] = useState('');
  const [storageUsage, setStorageUsage] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, string>>({});
  const visualEntries = useMemo(() => getVisualHistoryEntries(props.entries), [props.entries]);

  useEffect(() => {
    void refreshStorageUsage();
  }, [props.entries.length]);

  async function copy(text: string) {
    await writeClipboardText(text);
  }

  async function remove(id: string) {
    await deleteHistoryEntry(id);
    props.onRefresh();
  }

  async function toggle(entry: HistoryEntry) {
    await updateHistoryEntry(entry.id, { favorite: !entry.favorite });
    props.onRefresh();
  }

  async function clearAll() {
    await clearHistory();
    setNotice('');
    await refreshStorageUsage();
    props.onRefresh();
  }

  async function refresh() {
    await getHistory();
    await refreshStorageUsage();
    props.onRefresh();
  }

  async function refreshStorageUsage() {
    if (!chrome.storage?.local?.getBytesInUse) {
      setStorageUsage('');
      return;
    }
    const bytes = await chrome.storage.local.getBytesInUse();
    setStorageUsage(formatBytes(bytes));
  }

  function markImageFailed(key: string) {
    setFailedImages((current) => current[key] ? current : { ...current, [key]: true });
  }

  function rememberImageAspect(imageKey: string, image: HTMLImageElement) {
    const ratio = getLoadedImageAspectRatio(image);
    if (!ratio) return;
    setImageAspectRatios((current) => current[imageKey] === ratio ? current : { ...current, [imageKey]: ratio });
  }

  return (
    <main className="app-shell">
      <header className="app-header compact">
        <button type="button" onClick={props.onBack}>
          {labels.back}
        </button>
        <div>
          <p>{labels.history}</p>
          <h1>{props.entries.length} {labels.localEntries}</h1>
        </div>
      </header>

      {visualEntries.length ? (
        <section className="history-visual-grid" aria-label={labels.visualHistory}>
          {visualEntries.map((entry) => {
            const imageUrl = getHistoryImageSrc(entry);
            const imageKey = getHistoryImageKey(entry, imageUrl);
            const imageFailed = Boolean(imageUrl && failedImages[imageKey]);
            const preview = getHistoryPreviewText(entry, props.language);
            const showImage = canShowHistoryImage(entry, imageUrl) && !imageFailed;
            return (
              <article className="history-visual-card" key={entry.id} tabIndex={0} aria-label={`${entry.title}. ${preview}`} style={getHistoryImageAspectStyle(imageKey, imageAspectRatios)}>
                <div className="history-visual-card__media">
                  {showImage ? (
                    <img src={imageUrl} alt="" loading="lazy" onLoad={(event) => rememberImageAspect(imageKey, event.currentTarget)} onError={() => markImageFailed(imageKey)} />
                  ) : (
                    <div className="history-visual-card__placeholder" aria-hidden="true">
                      <span>{labels.noImage}</span>
                    </div>
                  )}
                </div>
                <div className="history-visual-card__overlay">
                  <strong>{entry.title}</strong>
                  <p>{preview}</p>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="quick-grid two">
        <button type="button" onClick={() => void refresh()}>
          {labels.refresh}
        </button>
        <button type="button" onClick={() => void clearAll()}>
          {labels.clearAll}
        </button>
      </div>

      <section className="storage-note">
        <strong>{labels.storageTitle}</strong>
        <p>{labels.storageBody}</p>
        {storageUsage ? <p>{labels.storageUsage}: {storageUsage}</p> : null}
        <button
          type="button"
          onClick={() => {
            void copy(getStorageLocationHint());
            setNotice(labels.storagePathCopied);
          }}
        >
          {labels.copyStoragePath}
        </button>
        {notice ? <span>{notice}</span> : null}
      </section>

      <section className="history-list">
        {props.entries.map((entry) => {
          const source = getHistorySource(entry);
          const prompt = getHistoryPrompt(entry, props.language);
          const preview = getHistoryPreviewText(entry, props.language);
          const imageUrl = getHistoryImageSrc(entry);
          const imageKey = getHistoryImageKey(entry, imageUrl);
          const imageFailed = Boolean(imageUrl && failedImages[imageKey]);
          const showImage = canShowHistoryImage(entry, imageUrl) && !imageFailed;
          return (
            <article className="history-item" key={entry.id}>
              <div className={`history-item__media is-${entry.status}`} style={getHistoryImageAspectStyle(imageKey, imageAspectRatios)}>
                {showImage ? (
                  <img src={imageUrl} alt="" loading="lazy" onLoad={(event) => rememberImageAspect(imageKey, event.currentTarget)} onError={() => markImageFailed(imageKey)} />
                ) : (
                  <div className="history-item__placeholder" aria-hidden="true">
                    <span>{labels.noImage}</span>
                  </div>
                )}
              </div>
              <div className="history-item__body">
                <div className="history-item__top">
                  <strong>{entry.title}</strong>
                  <span className={entry.status}>{getHistoryStatusLabel(entry.status, props.language)}</span>
                </div>
                <p>{new Date(entry.createdAt).toLocaleString()}</p>
                <div className="history-prompt-preview">
                  <div className="history-preview-head">
                    <span>{labels.promptPreview}</span>
                    <button type="button" disabled={!prompt} onClick={() => prompt && void copy(prompt)}>
                      {labels.copyPrompt}
                    </button>
                  </div>
                  <p>{preview}</p>
                </div>
                {source ? (
                  <p className="history-source">
                    <span>{labels.source}: </span>
                    {source}
                  </p>
                ) : null}
                {entry.error && prompt ? <p className="error-text">{entry.error}</p> : null}
                <div className="history-actions">
                  <button
                    type="button"
                    disabled={!prompt}
                    onClick={() => prompt && void copy(prompt)}
                  >
                    {labels.copyPrompt}
                  </button>
                  <button type="button" disabled={!entry.analysis} onClick={() => entry.analysis && void copy(stringifyGeneratorJsonPrompt(entry.analysis))}>
                    {labels.copyJson}
                  </button>
                  <button type="button" disabled={!source} onClick={() => source && void copy(source)}>
                    {labels.copySource}
                  </button>
                  <button type="button" disabled={!isOpenableSource(source)} onClick={() => source && void chrome.tabs.create({ url: source })}>
                    {labels.openSource}
                  </button>
                  <button type="button" onClick={() => void toggle(entry)}>
                    {entry.favorite ? labels.saved : labels.save}
                  </button>
                  <button type="button" onClick={() => void remove(entry.id)}>
                    {labels.delete}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!props.entries.length ? <div className="empty-state">{labels.empty}</div> : null}
      </section>
    </main>
  );
}

function isOpenableSource(source: string | undefined): boolean {
  return Boolean(source && /^(https?:|file:|data:)/i.test(source));
}

function getLoadedImageAspectRatio(image: HTMLImageElement): string | undefined {
  if (!image.naturalWidth || !image.naturalHeight) return undefined;
  return `${image.naturalWidth} / ${image.naturalHeight}`;
}

function getHistoryImageAspectStyle(imageKey: string, ratios: Record<string, string>): CSSProperties | undefined {
  const ratio = ratios[imageKey];
  return ratio ? ({ '--zpc-history-image-ratio': ratio } as CSSProperties) : undefined;
}

function getStorageLocationHint(): string {
  const extensionId = chrome.runtime.id;
  return [
    'chrome.storage.local',
    `Extension ID: ${extensionId}`,
    `macOS Chrome default profile: ~/Library/Application Support/Google/Chrome/Default/Local Extension Settings/${extensionId}`,
    '本地记录是浏览器扩展存储，不是图片文件夹；本地图片不会被插件另存。'
  ].join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
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
