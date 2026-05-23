import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratorSite, HistoryEntry, ImageTarget, InterfaceLanguage, PanelTab, PromptAnalysis } from '../shared/types';
import { GENERATOR_SITES } from '../shared/generators';

export interface PanelState {
  open: boolean;
  loading: boolean;
  error?: string;
  entry?: HistoryEntry;
  target?: ImageTarget;
  notice?: string;
  picking?: 'image' | 'selection';
}

export interface PanelProps {
  state: PanelState;
  language: InterfaceLanguage;
  onOpen: () => void;
  onClose: () => void;
  onLanguageChange: (language: InterfaceLanguage) => void;
  onStartAreaSelect: () => void;
  onStartImagePick: () => void;
  onOpenSettings: () => void;
  onCopy: (text: string, label: string) => void;
  onRegenerate: () => void;
  onOpenGenerator: (siteId: GeneratorSite, prompt: string) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
}

type UiLanguage = 'zh' | 'en';

const copy = {
  en: {
    launcher: 'Zhijuan Prompt',
    ready: 'Ready',
    analyzing: 'Analyzing image',
    analysis: 'Prompt analysis',
    pickImage: 'Pick image',
    captureArea: 'Capture area',
    sourceImage: 'Selected source',
    sourceArea: 'Captured region',
    sourcePage: 'Page source',
    sourceReady: 'Source ready',
    promptQuality: 'Prompt quality',
    qualityReady: 'ready',
    qualityBuilding: 'building',
    chooseTitle: 'Choose an image anywhere',
    chooseBody: 'Pick a page image or drag a region. The prompt opens here and is saved locally.',
    loadingSteps: ['Reading the image', 'Extracting visual style', 'Building your prompt'],
    failed: 'Analysis failed',
    recreation: 'Recreation prompt',
    copy: 'Copy',
    copyJson: 'Copy JSON',
    copyNegative: 'Copy Negative',
    regenerate: 'Regenerate',
    saved: 'Saved',
    save: 'Save',
    openIn: 'Open in',
    collapse: 'Collapse',
    expand: 'Expand',
    close: 'Close',
    settings: 'Settings',
    language: 'Language',
    promptCopied: 'Prompt copied',
    jsonCopied: 'JSON copied',
    negativeCopied: 'Negative copied'
  },
  zh: {
    launcher: 'Zhijuan Prompt',
    ready: '准备就绪',
    analyzing: '正在识别图片',
    analysis: '提示词分析',
    pickImage: '选择图片',
    captureArea: '截取区域',
    sourceImage: '已选图片',
    sourceArea: '截取区域',
    sourcePage: '页面来源',
    sourceReady: '来源就绪',
    promptQuality: '提示词质量',
    qualityReady: '就绪',
    qualityBuilding: '生成中',
    chooseTitle: '选择任意图片',
    chooseBody: '点选网页图片或拖拽区域，提示词会在这里生成并保存到本地。',
    loadingSteps: ['读取图片', '提取视觉风格', '生成提示词'],
    failed: '识别失败',
    recreation: '复刻提示词',
    copy: '复制',
    copyJson: '复制 JSON',
    copyNegative: '复制反向词',
    regenerate: '重新识别',
    saved: '已保存',
    save: '保存',
    openIn: '打开',
    collapse: '折叠',
    expand: '展开',
    close: '关闭',
    settings: '设置',
    language: '语言',
    promptCopied: '已复制提示词',
    jsonCopied: '已复制 JSON',
    negativeCopied: '已复制反向词'
  }
} as const;

export function Panel(props: PanelProps) {
  const { state } = props;
  const language = normalizeLanguage(props.language);
  const labels = copy[language];
  const analysis = state.entry?.analysis;
  const activeTab = usePreferredTab(analysis, language);
  const chrome = usePanelChrome();

  if (!state.open) {
    if (state.picking) return null;
    return (
      <button className="zpc-launcher" type="button" onClick={props.onOpen} aria-label="Open Zhijuan Prompt">
        <span className="zpc-launcher__mark">Z</span>
        <span className="zpc-launcher__text">{labels.launcher}</span>
      </button>
    );
  }

  return (
    <section
      className={chrome.collapsed ? 'zpc-panel zpc-panel--collapsed' : 'zpc-panel'}
      aria-live="polite"
      data-state={state.loading ? 'loading' : analysis ? 'result' : state.error ? 'error' : 'ready'}
      style={{ left: chrome.position.x, top: chrome.position.y }}
    >
      <div className="zpc-panel__sheen" />
      <header
        className="zpc-panel__header"
        onPointerDown={chrome.onPointerDown}
        onPointerMove={chrome.onPointerMove}
        onPointerUp={chrome.onPointerUp}
        onPointerCancel={chrome.onPointerUp}
      >
        <div>
          <div className="zpc-kicker">Zhijuan Prompt</div>
          <h2>{state.loading ? labels.analyzing : analysis ? labels.analysis : labels.ready}</h2>
        </div>
        <div className="zpc-header-controls">
          <LanguageToggle language={language} labels={labels} onChange={props.onLanguageChange} />
          <button
            className="zpc-icon-button"
            type="button"
            onClick={props.onOpenSettings}
            aria-label={labels.settings}
            title={labels.settings}
          >
            <IconSettings />
          </button>
          <button
            className="zpc-icon-button"
            type="button"
            onClick={() => chrome.setCollapsed(!chrome.collapsed)}
            aria-label={chrome.collapsed ? labels.expand : labels.collapse}
            title={chrome.collapsed ? labels.expand : labels.collapse}
          >
            {chrome.collapsed ? <IconExpand /> : <IconCollapse />}
          </button>
          <button className="zpc-icon-button" type="button" onClick={props.onClose} aria-label={labels.close} title={labels.close}>
            <IconClose />
          </button>
        </div>
      </header>

      {!chrome.collapsed ? (
        <div className="zpc-panel__body">
          <div className="zpc-command-row">
            <button className="zpc-command zpc-command--primary" type="button" onClick={props.onStartImagePick}>
              <IconImage />
              <span>{labels.pickImage}</span>
            </button>
            <button className="zpc-command" type="button" onClick={props.onStartAreaSelect}>
              <IconCrop />
              <span>{labels.captureArea}</span>
            </button>
          </div>

          {state.target ? <TargetPreview target={state.target} analysis={analysis} loading={state.loading} labels={labels} /> : null}
          {state.loading ? <LoadingBlock labels={labels} /> : null}
          {state.error ? <ErrorBlock error={state.error} labels={labels} /> : null}
          {!state.loading && !state.error && !analysis ? <ReadyBlock labels={labels} /> : null}
          {analysis ? <ResultBlock {...props} analysis={analysis} activeTab={activeTab} labels={labels} uiLanguage={language} /> : null}
          {state.notice ? <div className="zpc-toast-inline">{state.notice}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

function TargetPreview(props: {
  target: ImageTarget;
  analysis?: PromptAnalysis;
  loading: boolean;
  labels: (typeof copy)[UiLanguage];
}) {
  const previewSrc = props.target.dataUrl || props.target.srcUrl;
  const quality = useMemo(() => (props.analysis ? getPromptQuality(props.analysis) : undefined), [props.analysis]);
  const sourceLabel =
    props.target.kind === 'selection'
      ? props.labels.sourceArea
      : props.target.kind === 'image'
        ? props.labels.sourceImage
        : props.labels.sourcePage;

  return (
    <div className="zpc-target-card">
      <div className="zpc-target-thumb">
        {previewSrc ? <img src={previewSrc} alt="" /> : <IconCrop />}
      </div>
      <div className="zpc-target-meta">
        <span>{sourceLabel}</span>
        <strong>{props.target.title || props.labels.sourceReady}</strong>
      </div>
      <div className="zpc-quality" aria-label={props.labels.promptQuality}>
        <span>{props.labels.promptQuality}</span>
        <strong>{quality ? `${quality.score}` : props.loading ? props.labels.qualityBuilding : props.labels.qualityReady}</strong>
        <i style={{ ['--zpc-quality' as string]: `${quality?.score || 34}%` }} />
      </div>
    </div>
  );
}

function LanguageToggle(props: {
  language: UiLanguage;
  labels: (typeof copy)[UiLanguage];
  onChange: (language: InterfaceLanguage) => void;
}) {
  return (
    <div className="zpc-language-toggle" aria-label={props.labels.language}>
      <button className={props.language === 'zh' ? 'is-active' : ''} type="button" onClick={() => props.onChange('zh')}>
        中
      </button>
      <button className={props.language === 'en' ? 'is-active' : ''} type="button" onClick={() => props.onChange('en')}>
        EN
      </button>
    </div>
  );
}

function ReadyBlock({ labels }: { labels: (typeof copy)[UiLanguage] }) {
  return (
    <div className="zpc-card zpc-ready">
      <div className="zpc-ready__tile" />
      <div>
        <strong>{labels.chooseTitle}</strong>
        <p>{labels.chooseBody}</p>
      </div>
    </div>
  );
}

function LoadingBlock({ labels }: { labels: (typeof copy)[UiLanguage] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % labels.loadingSteps.length), 860);
    return () => window.clearInterval(timer);
  }, [labels.loadingSteps.length]);

  return (
    <div className="zpc-card zpc-loading">
      {labels.loadingSteps.map((step, index) => (
        <div className="zpc-loading__row" key={step}>
          <span className={index === active ? 'zpc-dot zpc-dot--active' : 'zpc-dot'} />
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ error, labels }: { error: string; labels: (typeof copy)[UiLanguage] }) {
  return (
    <div className="zpc-card zpc-error">
      <strong>{labels.failed}</strong>
      <p>{error}</p>
    </div>
  );
}

function ResultBlock(
  props: PanelProps & {
    analysis: PromptAnalysis;
    activeTab: [PanelTab, (tab: PanelTab) => void];
    labels: (typeof copy)[UiLanguage];
    uiLanguage: UiLanguage;
  }
) {
  const { analysis } = props;
  const { labels } = props;
  const [tab, setTab] = props.activeTab;
  const tabText = getTabText(analysis, tab);
  const entryId = props.state.entry?.id;
  const favorite = Boolean(props.state.entry?.favorite);
  const quality = getPromptQuality(analysis);

  return (
    <>
      <div className="zpc-tabs">
        {(['en', 'zh', 'json', 'negative'] as PanelTab[]).map((item) => (
          <button className={tab === item ? 'is-active' : ''} type="button" onClick={() => setTab(item)} key={item}>
            {tabLabel(item, props.uiLanguage)}
          </button>
        ))}
      </div>

      <div className="zpc-card">
        <div className="zpc-result-head">
          <span>{props.labels.promptQuality}</span>
          <strong>{quality.grade} / {quality.score}</strong>
        </div>
        <div className="zpc-tags">{getTags(analysis, tab).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <pre className="zpc-result">{tabText}</pre>
      </div>

      <div className="zpc-card zpc-core">
        <h3>{labels.recreation}</h3>
        <p>{analysis.recreation_prompt}</p>
      </div>

      <div className="zpc-actions">
        <button type="button" className="zpc-primary" onClick={() => props.onCopy(analysis.recreation_prompt, labels.promptCopied)}>
          {labels.copy}
        </button>
        <button type="button" onClick={() => props.onCopy(JSON.stringify(analysis, null, 2), labels.jsonCopied)}>
          {labels.copyJson}
        </button>
        <button type="button" onClick={() => props.onCopy(analysis.negative_prompt, labels.negativeCopied)}>
          {labels.copyNegative}
        </button>
        <button type="button" onClick={props.onRegenerate}>
          {labels.regenerate}
        </button>
        {entryId ? (
          <button type="button" onClick={() => props.onToggleFavorite(entryId, !favorite)}>
            {favorite ? labels.saved : labels.save}
          </button>
        ) : null}
      </div>

      <div className="zpc-generator-grid">
        {(Object.keys(GENERATOR_SITES) as GeneratorSite[]).map((siteId) => (
          <button type="button" key={siteId} onClick={() => props.onOpenGenerator(siteId, analysis.recreation_prompt)}>
            {labels.openIn} {GENERATOR_SITES[siteId].label}
          </button>
        ))}
      </div>
    </>
  );
}

function usePreferredTab(analysis: PromptAnalysis | undefined, language: UiLanguage): [PanelTab, (tab: PanelTab) => void] {
  const preferred = language === 'zh' ? 'zh' : 'en';
  const [tab, setTab] = useState<PanelTab>(preferred);
  useEffect(() => {
    if (analysis) setTab(preferred);
  }, [analysis, preferred]);
  return [tab, setTab];
}

function getTabText(analysis: PromptAnalysis, tab: PanelTab): string {
  if (tab === 'json') return JSON.stringify(analysis.json_prompt, null, 2);
  if (tab === 'negative') return analysis.negative_prompt;
  return `${analysis[tab].prompt}\n\n${analysis[tab].analysis}`;
}

function getTags(analysis: PromptAnalysis, tab: PanelTab): string[] {
  if (tab === 'zh') return analysis.zh_style_tags;
  if (tab === 'en') return analysis.en_style_tags;
  if (tab === 'json') return analysis.json_prompt.quality_modifiers;
  return ['artifact control', 'clean anatomy', 'no text errors', 'stable detail'];
}

function getPromptQuality(analysis: PromptAnalysis): { score: number; grade: string } {
  const fields = Object.values(analysis.json_prompt).flat();
  const filledFields = fields.filter((value) => String(value).trim().length > 2).length;
  const promptLength = analysis.recreation_prompt.trim().length;
  const tagCount = new Set([...analysis.en_style_tags, ...analysis.zh_style_tags, ...analysis.json_prompt.quality_modifiers]).size;
  const negativeReady = analysis.negative_prompt.trim().length > 20 ? 8 : 0;
  const score = Math.min(98, Math.round(54 + filledFields * 2.1 + Math.min(18, promptLength / 38) + Math.min(12, tagCount * 1.4) + negativeReady));
  const grade = score >= 92 ? 'A+' : score >= 86 ? 'A' : score >= 78 ? 'B+' : 'B';
  return { score, grade };
}

function tabLabel(tab: PanelTab, language: UiLanguage): string {
  if (tab === 'zh') return '中文';
  if (tab === 'json') return 'JSON';
  if (tab === 'negative') return language === 'zh' ? '反向词' : 'Negative';
  return language === 'zh' ? '英文' : 'EN';
}

function normalizeLanguage(language: InterfaceLanguage): UiLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

interface PanelChromeState {
  x: number;
  y: number;
  collapsed: boolean;
}

const PANEL_UI_STORAGE_KEY = 'zhijuan_prompt_panel_ui';

function usePanelChrome() {
  const [ui, setUi] = useState<PanelChromeState>(() => clampPanelUi(defaultPanelUi()));
  const uiRef = useRef(ui);
  const [dragState, setDragState] = useState<{ pointerId: number; offsetX: number; offsetY: number } | undefined>();

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  useEffect(() => {
    let mounted = true;
    void readPanelUi().then((saved) => {
      if (!mounted || !saved) return;
      const next = clampPanelUi({ ...defaultPanelUi(), ...saved });
      uiRef.current = next;
      setUi(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  function setCollapsed(collapsed: boolean) {
    const next = clampPanelUi({ ...uiRef.current, collapsed });
    uiRef.current = next;
    setUi(next);
    void writePanelUi(next);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      offsetX: event.clientX - uiRef.current.x,
      offsetY: event.clientY - uiRef.current.y
    });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const next = clampPanelUi({
      ...uiRef.current,
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY
    });
    uiRef.current = next;
    setUi(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(undefined);
      void writePanelUi(uiRef.current);
    }
  }

  useEffect(() => {
    const onResize = () => {
      const next = clampPanelUi(uiRef.current);
      uiRef.current = next;
      setUi(next);
      void writePanelUi(next);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { position: { x: ui.x, y: ui.y }, collapsed: ui.collapsed, setCollapsed, onPointerDown, onPointerMove, onPointerUp };
}

function defaultPanelUi(): PanelChromeState {
  return {
    x: Math.max(8, window.innerWidth - 368),
    y: 14,
    collapsed: false
  };
}

function clampPanelUi(input: PanelChromeState): PanelChromeState {
  const width = input.collapsed ? Math.min(284, window.innerWidth - 16) : Math.min(356, window.innerWidth - 16);
  const minX = 8;
  const minY = 8;
  const maxX = Math.max(minX, window.innerWidth - width - 8);
  const maxY = Math.max(minY, window.innerHeight - 86);
  return {
    x: Math.round(Math.min(Math.max(minX, input.x), maxX)),
    y: Math.round(Math.min(Math.max(minY, input.y), maxY)),
    collapsed: input.collapsed
  };
}

async function readPanelUi(): Promise<Partial<PanelChromeState> | undefined> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const record = await chrome.storage.local.get([PANEL_UI_STORAGE_KEY]);
      return record[PANEL_UI_STORAGE_KEY] as Partial<PanelChromeState> | undefined;
    }
    const raw = window.localStorage?.getItem(PANEL_UI_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Partial<PanelChromeState> : undefined;
  } catch {
    return undefined;
  }
}

async function writePanelUi(value: PanelChromeState): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [PANEL_UI_STORAGE_KEY]: value });
      return;
    }
    window.localStorage?.setItem(PANEL_UI_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Position persistence is a convenience; the panel remains usable without it.
  }
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12h12" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10h8M8 14h8" />
    </svg>
  );
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

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="m18.7 14 .1-2-.1-2 1.7-1.2-1.8-3.1-2 .8a7.7 7.7 0 0 0-1.7-1l-.3-2.1h-5.2l-.3 2.1a7.7 7.7 0 0 0-1.7 1l-2-.8-1.8 3.1L5.3 10a7.8 7.8 0 0 0-.1 2l.1 2-1.7 1.2 1.8 3.1 2-.8c.5.4 1.1.7 1.7 1l.3 2.1h5.2l.3-2.1c.6-.3 1.2-.6 1.7-1l2 .8 1.8-3.1L18.7 14Z" />
    </svg>
  );
}
