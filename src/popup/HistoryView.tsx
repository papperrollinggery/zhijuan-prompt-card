import { clearHistory, deleteHistoryEntry, getHistory, updateHistoryEntry } from '../shared/storage';
import type { HistoryEntry, InterfaceLanguage } from '../shared/types';

const historyCopy = {
  en: {
    back: 'Back',
    history: 'History',
    localEntries: 'local entries',
    refresh: 'Refresh',
    clearAll: 'Clear all',
    copyPrompt: 'Copy prompt',
    copyJson: 'Copy JSON',
    saved: 'Saved',
    save: 'Save',
    delete: 'Delete',
    empty: 'No history yet'
  },
  zh: {
    back: '返回',
    history: '历史',
    localEntries: '条本地记录',
    refresh: '刷新',
    clearAll: '清空',
    copyPrompt: '复制提示词',
    copyJson: '复制 JSON',
    saved: '已保存',
    save: '保存',
    delete: '删除',
    empty: '暂无历史'
  }
} as const;

export function HistoryView(props: { entries: HistoryEntry[]; language: InterfaceLanguage; onBack: () => void; onRefresh: () => void }) {
  const labels = historyCopy[props.language === 'zh' ? 'zh' : 'en'];
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
    props.onRefresh();
  }

  async function refresh() {
    await getHistory();
    props.onRefresh();
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

      <div className="quick-grid two">
        <button type="button" onClick={() => void refresh()}>
          {labels.refresh}
        </button>
        <button type="button" onClick={() => void clearAll()}>
          {labels.clearAll}
        </button>
      </div>

      <section className="history-list">
        {props.entries.map((entry) => (
          <article className="history-item" key={entry.id}>
            <div className="history-item__top">
              <strong>{entry.title}</strong>
              <span className={entry.status}>{entry.status}</span>
            </div>
            <p>{new Date(entry.createdAt).toLocaleString()}</p>
            {entry.error ? <p className="error-text">{entry.error}</p> : null}
            <div className="history-actions">
              <button
                type="button"
                disabled={!entry.analysis}
                onClick={() => entry.analysis && void copy(entry.analysis.recreation_prompt)}
              >
                {labels.copyPrompt}
              </button>
              <button type="button" disabled={!entry.analysis} onClick={() => entry.analysis && void copy(JSON.stringify(entry.analysis, null, 2))}>
                {labels.copyJson}
              </button>
              <button type="button" onClick={() => void toggle(entry)}>
                {entry.favorite ? labels.saved : labels.save}
              </button>
              <button type="button" onClick={() => void remove(entry.id)}>
                {labels.delete}
              </button>
            </div>
          </article>
        ))}
        {!props.entries.length ? <div className="empty-state">{labels.empty}</div> : null}
      </section>
    </main>
  );
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
