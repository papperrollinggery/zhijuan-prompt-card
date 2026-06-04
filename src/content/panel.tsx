import { type ChangeEvent as ReactChangeEvent, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisPhase, GeneratorSite, HistoryEntry, ImageTarget, InterfaceLanguage, PanelTab, PromptAnalysis } from '../shared/types';
import { GENERATOR_SITES } from '../shared/generators';

export interface PanelState {
  open: boolean;
  loading: boolean;
  view?: 'main' | 'history';
  error?: string;
  entry?: HistoryEntry;
  target?: ImageTarget;
  notice?: string;
  picking?: 'image' | 'selection';
  phase?: AnalysisPhase;
  startedAt?: number;
}

export interface PanelProps {
  state: PanelState;
  historyEntries: HistoryEntry[];
  language: InterfaceLanguage;
  onOpen: () => void;
  onClose: () => void;
  onHide: () => void;
  onLanguageChange: (language: InterfaceLanguage) => void;
  onStartAreaSelect: () => void;
  onStartImagePick: () => void;
  onAnalyzeFile: (file: File) => void;
  onOpenHistory: () => void;
  onCloseHistory: () => void;
  onRefreshHistory: () => void;
  onSelectHistoryEntry: (entry: HistoryEntry) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onOpenSettings: () => void;
  onCopy: (text: string, label: string) => void;
  onRegenerate: () => void;
  onCancelAnalysis: () => void;
  onOpenGenerator: (siteId: GeneratorSite, prompt: string) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
}

type UiLanguage = 'zh' | 'en';

const copy = {
  en: {
    lens: 'Result lens',
    ready: 'Ready',
    analyzing: 'Analyzing image',
    analysis: 'Prompt analysis',
    pickImage: 'Pick image',
    captureArea: 'Capture area',
    localFile: 'Local file',
    pickingImage: 'Click a page image',
    pickingSelection: 'Drag a region',
    pickingBody: 'The selected source and prompt will appear in this panel.',
    sourceImage: 'Selected source',
    sourceLocal: 'Local image',
    sourceArea: 'Captured region',
    sourcePage: 'Page source',
    sourceReady: 'Source ready',
    outputCompleteness: 'Output completeness',
    processing: 'Processing',
    complete: 'Complete',
    needsReview: 'Needs review',
    structureIssue: 'Structure issue',
    missingPrefix: 'Missing',
    elapsed: 'Elapsed',
    slowHint: 'The model is still processing. You can keep waiting or stop this run.',
    chooseTitle: 'Choose an image source',
    chooseBody: 'Pick a page image, capture a region, or drop a local image file here.',
    dropTitle: 'Drop image file',
    dropBody: 'Drag PNG, JPG, WebP, GIF, AVIF, or BMP from Finder.',
    dropActive: 'Release to analyze',
    loadingSteps: ['Reading image', 'Preparing image', 'Waiting for model', 'Parsing result'],
    phaseLabels: {
      reading_image: 'Reading image',
      capturing_region: 'Capturing region',
      preparing_image: 'Preparing image',
      requesting_model: 'Waiting for model',
      parsing_result: 'Parsing result'
    },
    failed: 'Analysis failed',
    output: 'Prompt output',
    recreation: 'Recreation prompt',
    copy: 'Copy',
    copyJson: 'Copy JSON',
    copyNegative: 'Copy Negative',
    regenerate: 'Regenerate',
    cancel: 'Stop',
    saved: 'Saved',
    save: 'Save',
    openIn: 'Open in',
    collapse: 'Collapse',
    expand: 'Expand',
    openPanel: 'Open image prompt panel',
    floatingLabel: 'Prompt lens',
    quickActions: 'Floating actions',
    promptHistory: 'Prompt history',
    historyCount: 'records',
    backToPanel: 'Back',
    refreshHistory: 'Refresh',
    viewRecord: 'View',
    deleteRecord: 'Delete',
    emptyHistory: 'No local records',
    createdAt: 'Created',
    close: 'Collapse to button',
    hide: 'Hide',
    settings: 'Settings',
    language: 'Language',
    promptCopied: 'Prompt copied',
    jsonCopied: 'JSON copied',
    negativeCopied: 'Negative copied'
  },
  zh: {
    lens: '结果镜头',
    ready: '准备就绪',
    analyzing: '正在识别图片',
    analysis: '提示词分析',
    pickImage: '选择图片',
    captureArea: '截取区域',
    localFile: '本地文件',
    pickingImage: '点击网页图片',
    pickingSelection: '拖拽截取区域',
    pickingBody: '选中的图片和生成的提示词会显示在这个面板里。',
    sourceImage: '已选图片',
    sourceLocal: '本地图片',
    sourceArea: '截取区域',
    sourcePage: '页面来源',
    sourceReady: '来源就绪',
    outputCompleteness: '输出完整度',
    processing: '处理中',
    complete: '完整',
    needsReview: '需检查',
    structureIssue: '结构异常',
    missingPrefix: '缺少',
    elapsed: '已等待',
    slowHint: '模型仍在处理，可以继续等待或终止本次任务。',
    chooseTitle: '选择图片源',
    chooseBody: '点网页图片、截取区域，或把本地图片文件拖到这里。',
    dropTitle: '拖入图片文件',
    dropBody: '支持从 Finder 拖入 PNG、JPG、WebP、GIF、AVIF、BMP。',
    dropActive: '松手开始识别',
    loadingSteps: ['读取图片', '准备图片', '等待模型', '解析结果'],
    phaseLabels: {
      reading_image: '读取图片',
      capturing_region: '截取区域',
      preparing_image: '准备图片',
      requesting_model: '等待模型',
      parsing_result: '解析结果'
    },
    failed: '识别失败',
    output: '提示词输出',
    recreation: '复刻提示词',
    copy: '复制',
    copyJson: '复制 JSON',
    copyNegative: '复制反向词',
    regenerate: '重新识别',
    cancel: '终止',
    saved: '已保存',
    save: '保存',
    openIn: '打开',
    collapse: '折叠',
    expand: '展开',
    openPanel: '打开识图面板',
    floatingLabel: '识图',
    quickActions: '悬浮快捷操作',
    promptHistory: '历史提示词',
    historyCount: '条记录',
    backToPanel: '返回',
    refreshHistory: '刷新',
    viewRecord: '查看',
    deleteRecord: '删除',
    emptyHistory: '暂无本地记录',
    createdAt: '时间',
    close: '收起到浮标',
    hide: '隐藏',
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
  const elapsedSeconds = useElapsedSeconds(state.loading, state.startedAt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const autoExpandToken = getAutoExpandToken(state, fileDragActive);
  const lastAutoExpandToken = useRef('');

  useEffect(() => {
    if (!autoExpandToken) {
      lastAutoExpandToken.current = '';
      return;
    }
    if (autoExpandToken === lastAutoExpandToken.current) return;
    lastAutoExpandToken.current = autoExpandToken;
    if (chrome.collapsed) chrome.setCollapsed(false);
  }, [autoExpandToken, chrome.collapsed]);

  function analyzeFile(file: File | undefined) {
    if (!file) return;
    setFileDragActive(false);
    props.onAnalyzeFile(file);
  }

  function handleFileChange(event: ReactChangeEvent<HTMLInputElement>) {
    analyzeFile(firstImageFile(event.currentTarget.files) ?? firstFile(event.currentTarget.files));
    event.currentTarget.value = '';
  }

  function handleFileDrag(event: ReactDragEvent<HTMLElement>) {
    if (!hasFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setFileDragActive(true);
  }

  function handleFileDragLeave(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const stillInside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (stillInside || event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setFileDragActive(false);
  }

  function handleFileDrop(event: ReactDragEvent<HTMLElement>) {
    if (!hasFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    analyzeFile(firstImageFile(event.dataTransfer.files) ?? firstFile(event.dataTransfer.files));
  }

  if (!state.open) {
    return null;
  }

  const collapsedEdge = chrome.position.x < window.innerWidth / 2 ? 'left' : 'right';
  const collapsedStack = chrome.position.y < 118 ? 'below' : chrome.position.y > window.innerHeight - 178 ? 'above' : 'split';

  return (
    <section
      className={chrome.collapsed ? 'zpc-panel zpc-panel--collapsed' : 'zpc-panel'}
      aria-live="polite"
      data-state={state.loading ? 'loading' : analysis ? 'result' : state.error ? 'error' : 'ready'}
      data-edge={collapsedEdge}
      data-stack={collapsedStack}
      style={{ left: chrome.position.x, top: chrome.position.y }}
    >
      <div className="zpc-panel__edge" />
      <header
        className="zpc-panel__header"
        onPointerDown={chrome.onPointerDown}
        onPointerMove={chrome.onPointerMove}
        onPointerUp={chrome.onPointerUp}
        onPointerCancel={chrome.onPointerUp}
      >
        {chrome.collapsed ? (
          <>
            <div className="zpc-collapsed-actions zpc-collapsed-actions--top" aria-label={labels.quickActions}>
              <CollapsedActionButton label={labels.pickImage} onClick={props.onStartImagePick}>
                <IconImage />
              </CollapsedActionButton>
              <CollapsedActionButton label={labels.captureArea} onClick={props.onStartAreaSelect}>
                <IconCrop />
              </CollapsedActionButton>
            </div>
            <button
              className="zpc-collapsed-handle"
              type="button"
              onClick={(event) => {
                if (chrome.consumeClickAfterDrag()) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                chrome.setCollapsed(false);
              }}
              aria-label={labels.openPanel}
              title={labels.openPanel}
            >
              <span className="zpc-collapsed-glyph" aria-hidden="true">
                <IconImage />
              </span>
              <span className="zpc-collapsed-badge" aria-hidden="true" />
            </button>
            <div className="zpc-collapsed-actions zpc-collapsed-actions--bottom" aria-label={labels.quickActions}>
              <CollapsedActionButton label={labels.promptHistory} onClick={() => {
                chrome.setCollapsed(false);
                props.onOpenHistory();
              }}>
                <IconHistory />
              </CollapsedActionButton>
              <CollapsedActionButton label={labels.settings} onClick={props.onOpenSettings}>
                <IconSettings />
              </CollapsedActionButton>
            </div>
          </>
        ) : (
          <>
            <div className="zpc-drag-orb" aria-hidden="true" />
          <div className="zpc-title-stack">
              <div className="zpc-kicker">Zhijuan Prompt</div>
              <h2>{state.view === 'history' ? labels.promptHistory : state.loading ? labels.analyzing : analysis ? labels.output : state.picking === 'image' ? labels.pickingImage : state.picking === 'selection' ? labels.pickingSelection : labels.ready}</h2>
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
                onClick={() => chrome.setCollapsed(true)}
                aria-label={labels.collapse}
                title={labels.collapse}
              >
                <IconCollapse />
              </button>
              <button
                className="zpc-icon-button"
                type="button"
                onClick={() => {
                  chrome.setCollapsed(true);
                  props.onClose();
                }}
                aria-label={labels.close}
                title={labels.close}
              >
                <IconClose />
              </button>
              <button className="zpc-icon-button" type="button" onClick={props.onHide} aria-label={labels.hide} title={labels.hide}>
                <IconHide />
              </button>
            </div>
          </>
        )}
      </header>

      {!chrome.collapsed ? (
        <div className="zpc-panel__body">
          <input ref={fileInputRef} className="zpc-file-input" type="file" accept="image/*" onChange={handleFileChange} />
          {state.view === 'history' ? (
            <HistoryBlock
              entries={props.historyEntries}
              labels={labels}
              uiLanguage={language}
              onBack={props.onCloseHistory}
              onRefresh={props.onRefreshHistory}
              onCopy={props.onCopy}
              onSelect={props.onSelectHistoryEntry}
              onDelete={props.onDeleteHistoryEntry}
            />
          ) : (
          <div className="zpc-workspace">
            <div className="zpc-command-row">
              <button className="zpc-command zpc-command--primary" type="button" onClick={props.onStartImagePick}>
                <IconImage />
                <span>{labels.pickImage}</span>
              </button>
              <button className="zpc-command" type="button" onClick={props.onStartAreaSelect}>
                <IconCrop />
                <span>{labels.captureArea}</span>
              </button>
              <button className="zpc-command" type="button" onClick={() => fileInputRef.current?.click()}>
                <IconUpload />
                <span>{labels.localFile}</span>
              </button>
            </div>
            <button
              type="button"
              className={fileDragActive ? 'zpc-file-drop is-active' : 'zpc-file-drop'}
              aria-label={labels.dropBody}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleFileDrag}
              onDragOver={handleFileDrag}
              onDragLeave={handleFileDragLeave}
              onDragEnd={() => setFileDragActive(false)}
              onDrop={handleFileDrop}
            >
              <IconUpload />
              <span>{fileDragActive ? labels.dropActive : labels.dropTitle}</span>
              <strong>{labels.dropBody}</strong>
            </button>

            {state.picking ? <PickingBlock mode={state.picking} labels={labels} onCancel={props.onCancelAnalysis} /> : null}
            {state.target ? <TargetPreview target={state.target} analysis={analysis} loading={state.loading} phase={state.phase} labels={labels} uiLanguage={language} /> : null}
            {state.loading ? <LoadingBlock labels={labels} phase={state.phase} elapsedSeconds={elapsedSeconds} onCancel={props.onCancelAnalysis} /> : null}
            {state.error ? <ErrorBlock error={state.error} labels={labels} /> : null}
            {!state.picking && !state.loading && !state.error && !analysis ? <ReadyBlock labels={labels} onClick={() => fileInputRef.current?.click()} /> : null}
            {analysis ? <ResultBlock {...props} analysis={analysis} activeTab={activeTab} labels={labels} uiLanguage={language} /> : null}
            {state.notice ? <div className="zpc-toast-inline">{state.notice}</div> : null}
          </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function PickingBlock({ mode, labels, onCancel }: { mode: 'image' | 'selection'; labels: (typeof copy)[UiLanguage]; onCancel: () => void }) {
  return (
    <div className="zpc-surface zpc-picking">
      <div className="zpc-picking__mark">{mode === 'image' ? <IconImage /> : <IconCrop />}</div>
      <div className="zpc-picking__body">
        <strong>{mode === 'image' ? labels.pickingImage : labels.pickingSelection}</strong>
        <p>{labels.pickingBody}</p>
      </div>
      <button className="zpc-cancel-button" type="button" onClick={onCancel}>
        <IconStop />
        <span>{labels.cancel}</span>
      </button>
    </div>
  );
}

function TargetPreview(props: {
  target: ImageTarget;
  analysis?: PromptAnalysis;
  loading: boolean;
  phase?: AnalysisPhase;
  labels: (typeof copy)[UiLanguage];
  uiLanguage: UiLanguage;
}) {
  const previewSrc = props.target.dataUrl || props.target.srcUrl;
  const completeness = useMemo(() => (props.analysis ? getOutputCompleteness(props.analysis, props.uiLanguage) : undefined), [props.analysis, props.uiLanguage]);
  const phaseLabel = props.labels.phaseLabels[props.phase || 'preparing_image'];
  const statusTitle = props.loading ? props.labels.processing : props.analysis ? props.labels.outputCompleteness : props.labels.ready;
  const statusValue = props.loading ? phaseLabel : completeness ? completeness.label : props.labels.ready;
  const sourceLabel =
    props.target.kind === 'selection'
      ? props.labels.sourceArea
      : props.target.kind === 'local'
        ? props.labels.sourceLocal
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
      <div className="zpc-source-status" aria-label={statusTitle}>
        <span>{statusTitle}</span>
        <strong>{statusValue}</strong>
      </div>
    </div>
  );
}

function HistoryBlock(props: {
  entries: HistoryEntry[];
  labels: (typeof copy)[UiLanguage];
  uiLanguage: UiLanguage;
  onBack: () => void;
  onRefresh: () => void;
  onCopy: (text: string, label: string) => void;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="zpc-workspace zpc-history-panel">
      <div className="zpc-history-head">
        <div>
          <span>{props.labels.promptHistory}</span>
          <strong>{props.entries.length} {props.labels.historyCount}</strong>
        </div>
        <div className="zpc-history-head__actions">
          <button type="button" onClick={props.onRefresh}>{props.labels.refreshHistory}</button>
          <button type="button" onClick={props.onBack}>{props.labels.backToPanel}</button>
        </div>
      </div>
      <div className="zpc-history-list">
        {props.entries.map((entry) => {
          const prompt = getHistoryPrompt(entry);
          return (
            <article className="zpc-history-item" key={entry.id}>
              <div className="zpc-history-item__top">
                <strong>{entry.title}</strong>
                <span className={entry.status}>{getHistoryStatusLabel(entry.status, props.uiLanguage)}</span>
              </div>
              <p className="zpc-history-date">{props.labels.createdAt}: {formatHistoryDate(entry.createdAt)}</p>
              {prompt ? <p className="zpc-history-prompt">{prompt}</p> : entry.error ? <p className="zpc-history-error">{entry.error}</p> : null}
              <div className="zpc-history-actions">
                <button type="button" disabled={!entry.analysis} onClick={() => props.onSelect(entry)}>
                  {props.labels.viewRecord}
                </button>
                <button type="button" disabled={!prompt} onClick={() => prompt && props.onCopy(prompt, props.labels.promptCopied)}>
                  {props.labels.copy}
                </button>
                <button type="button" onClick={() => props.onDelete(entry.id)}>
                  {props.labels.deleteRecord}
                </button>
              </div>
            </article>
          );
        })}
        {!props.entries.length ? <div className="zpc-history-empty">{props.labels.emptyHistory}</div> : null}
      </div>
    </div>
  );
}

function CollapsedActionButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="zpc-collapsed-action"
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
      aria-label={props.label}
      title={props.label}
    >
      {props.children}
      <span>{props.label}</span>
    </button>
  );
}

function getHistoryPrompt(entry: HistoryEntry): string {
  return entry.analysis?.recreation_prompt || entry.analysis?.zh.prompt || entry.analysis?.en.prompt || '';
}

function getHistoryStatusLabel(status: HistoryEntry['status'], language: UiLanguage): string {
  if (language !== 'zh') return status;
  if (status === 'success') return '成功';
  if (status === 'failed') return '失败';
  if (status === 'running') return '运行中';
  return '已取消';
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function firstImageFile(files: FileList | null): File | undefined {
  if (!files) return undefined;
  return [...files].find((file) => file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name));
}

function firstFile(files: FileList | null): File | undefined {
  return files?.[0];
}

function hasFileDrag(dataTransfer: DataTransfer): boolean {
  return [...dataTransfer.types].includes('Files');
}

function getAutoExpandToken(state: PanelState, fileDragActive: boolean): string {
  if (fileDragActive) return 'drag';
  if (state.picking) return `picking:${state.picking}`;
  if (state.loading) return `loading:${state.target?.title || state.target?.pageUrl || 'target'}`;
  if (state.error) return `error:${state.error}`;
  if (state.entry?.analysis) return `result:${state.entry.id}`;
  return '';
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

function ReadyBlock({ labels, onClick }: { labels: (typeof copy)[UiLanguage]; onClick: () => void }) {
  return (
    <button type="button" className="zpc-surface zpc-ready zpc-ready-button" onClick={onClick}>
      <div className="zpc-ready__tile" />
      <div>
        <strong>{labels.chooseTitle}</strong>
        <p>{labels.chooseBody}</p>
      </div>
    </button>
  );
}

function LoadingBlock({ labels, phase, elapsedSeconds, onCancel }: { labels: (typeof copy)[UiLanguage]; phase?: AnalysisPhase; elapsedSeconds: number; onCancel: () => void }) {
  const steps: AnalysisPhase[] = ['capturing_region', 'reading_image', 'preparing_image', 'requesting_model', 'parsing_result'];
  const activePhase = phase || 'preparing_image';

  return (
    <div className="zpc-surface zpc-loading">
      <div className="zpc-loading__meter">
        <span>{labels.phaseLabels[activePhase]}</span>
        <strong>{labels.elapsed} {elapsedSeconds}s</strong>
        <i />
      </div>
      {steps.map((step) => (
        <div className="zpc-loading__row" key={step}>
          <span className={step === activePhase ? 'zpc-dot zpc-dot--active' : 'zpc-dot'} />
          <span>{labels.phaseLabels[step]}</span>
        </div>
      ))}
      {elapsedSeconds >= 30 ? <p className="zpc-loading__hint">{labels.slowHint}</p> : null}
      <button className="zpc-cancel-button zpc-cancel-button--wide" type="button" onClick={onCancel}>
        <IconStop />
        <span>{labels.cancel}</span>
      </button>
    </div>
  );
}

function useElapsedSeconds(loading: boolean, startedAt: number | undefined): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const start = startedAt || Date.now();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const timer = window.setInterval(() => {
      update();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, startedAt]);

  return elapsed;
}

function ErrorBlock({ error, labels }: { error: string; labels: (typeof copy)[UiLanguage] }) {
  return (
    <div className="zpc-surface zpc-error">
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
  const completeness = getOutputCompleteness(analysis, props.uiLanguage);
  const tabCopyLabel = getCopyLabelForTab(tab, labels);
  const tabCopyNotice = getCopyNoticeForTab(tab, labels);

  return (
    <>
      <div className="zpc-tabs">
        {(['en', 'zh', 'json', 'negative'] as PanelTab[]).map((item) => (
          <button className={tab === item ? 'is-active' : ''} type="button" onClick={() => setTab(item)} key={item}>
            {tabLabel(item, props.uiLanguage)}
          </button>
        ))}
      </div>

      <div className="zpc-prompt-output">
        <div className="zpc-result-head">
          <div>
            <span>{props.labels.output}</span>
            <strong>{props.labels.outputCompleteness}: {completeness.label}</strong>
            {completeness.missing.length ? <small>{props.labels.missingPrefix}: {completeness.missing.join(', ')}</small> : null}
          </div>
          <button type="button" className="zpc-copy-chip" onClick={() => props.onCopy(tabText, tabCopyNotice)}>
            {tabCopyLabel}
          </button>
        </div>
        <div className="zpc-tags">{getTags(analysis, tab).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <pre className="zpc-result">{tabText}</pre>
      </div>

      <div className="zpc-core">
        <div className="zpc-core-head">
          <h3>{labels.recreation}</h3>
          <button type="button" className="zpc-copy-chip" onClick={() => props.onCopy(analysis.recreation_prompt, labels.promptCopied)}>
            {labels.copy}
          </button>
        </div>
        <p>{analysis.recreation_prompt}</p>
      </div>

      <div className="zpc-actions">
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

function getOutputCompleteness(analysis: PromptAnalysis, language: UiLanguage): { label: string; missing: string[] } {
  const missing: string[] = [];
  const addMissing = (key: string) => missing.push(completenessFieldLabel(key, language));

  if (!analysis.zh.prompt.trim()) addMissing('zh.prompt');
  if (!analysis.en.prompt.trim()) addMissing('en.prompt');
  if (!analysis.ja.prompt.trim()) addMissing('ja.prompt');
  if (!analysis.recreation_prompt.trim()) addMissing('recreation_prompt');
  if (!analysis.negative_prompt.trim()) addMissing('negative_prompt');
  if (!analysis.zh_style_tags.length && !analysis.en_style_tags.length && !analysis.ja_style_tags.length) addMissing('style_tags');

  const jsonFields = analysis.json_prompt;
  const requiredJsonFields: Array<keyof PromptAnalysis['json_prompt']> = [
    'subject',
    'action_pose',
    'details_appearance',
    'environment_background',
    'lighting_atmosphere',
    'composition_framing',
    'style_camera',
    'colors',
    'materials',
    'aspect_ratio',
    'quality_modifiers',
    'likely_generation_intent'
  ];
  for (const field of requiredJsonFields) {
    const value = jsonFields[field];
    const filled = Array.isArray(value) ? value.some((item) => item.trim()) : value.trim().length > 0;
    if (!filled) addMissing(String(field));
  }

  if (!missing.length) return { label: language === 'zh' ? copy.zh.complete : copy.en.complete, missing };
  if (missing.length <= 3) return { label: language === 'zh' ? copy.zh.needsReview : copy.en.needsReview, missing };
  return { label: language === 'zh' ? copy.zh.structureIssue : copy.en.structureIssue, missing };
}

function completenessFieldLabel(key: string, language: UiLanguage): string {
  const zh: Record<string, string> = {
    'zh.prompt': '中文提示词',
    'en.prompt': '英文提示词',
    'ja.prompt': '日文提示词',
    recreation_prompt: '复刻提示词',
    negative_prompt: '反向词',
    style_tags: '风格标签',
    subject: '主体',
    action_pose: '动作姿态',
    details_appearance: '外观细节',
    environment_background: '环境背景',
    lighting_atmosphere: '光线氛围',
    composition_framing: '构图',
    style_camera: '风格镜头',
    colors: '颜色',
    materials: '材质',
    aspect_ratio: '画幅比例',
    quality_modifiers: '质量修饰词',
    likely_generation_intent: '生成意图'
  };
  const en: Record<string, string> = {
    'zh.prompt': 'Chinese prompt',
    'en.prompt': 'English prompt',
    'ja.prompt': 'Japanese prompt',
    recreation_prompt: 'recreation prompt',
    negative_prompt: 'negative prompt',
    style_tags: 'style tags',
    subject: 'subject',
    action_pose: 'action/pose',
    details_appearance: 'appearance details',
    environment_background: 'environment',
    lighting_atmosphere: 'lighting',
    composition_framing: 'composition',
    style_camera: 'style/camera',
    colors: 'colors',
    materials: 'materials',
    aspect_ratio: 'aspect ratio',
    quality_modifiers: 'quality modifiers',
    likely_generation_intent: 'generation intent'
  };
  return (language === 'zh' ? zh : en)[key] || key;
}

function tabLabel(tab: PanelTab, language: UiLanguage): string {
  if (tab === 'zh') return '中文';
  if (tab === 'json') return 'JSON';
  if (tab === 'negative') return language === 'zh' ? '反向词' : 'Negative';
  return language === 'zh' ? '英文' : 'EN';
}

function getCopyLabelForTab(tab: PanelTab, labels: (typeof copy)[UiLanguage]): string {
  if (tab === 'json') return labels.copyJson;
  if (tab === 'negative') return labels.copyNegative;
  return labels.copy;
}

function getCopyNoticeForTab(tab: PanelTab, labels: (typeof copy)[UiLanguage]): string {
  if (tab === 'json') return labels.jsonCopied;
  if (tab === 'negative') return labels.negativeCopied;
  return labels.promptCopied;
}

function normalizeLanguage(language: InterfaceLanguage): UiLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

interface PanelChromeState {
  x: number;
  y: number;
  collapsed: boolean;
}

const PANEL_UI_STORAGE_KEY = 'zhijuan_prompt_panel_ui_v2';
const PANEL_EXPANDED_WIDTH = 376;
const PANEL_COLLAPSED_WIDTH = 46;
const PANEL_COLLAPSED_HEIGHT = 46;
const PANEL_MARGIN = 10;
const DRAG_CLICK_TOLERANCE = 14;

function usePanelChrome() {
  const [ui, setUi] = useState<PanelChromeState>(() => clampPanelUi(defaultPanelUi()));
  const uiRef = useRef(ui);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number } | undefined>(undefined);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);

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
    const next = clampPanelUi(collapsed ? snapCollapsedToNearestEdge({ ...uiRef.current, collapsed }) : { ...uiRef.current, collapsed });
    uiRef.current = next;
    setUi(next);
    void writePanelUi(next);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button') && !uiRef.current.collapsed) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic and interrupted pointer streams may not have an active pointer.
    }
    dragMovedRef.current = false;
    suppressClickRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - uiRef.current.x,
      offsetY: event.clientY - uiRef.current.y,
      startX: event.clientX,
      startY: event.clientY
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (distance > DRAG_CLICK_TOLERANCE) {
      dragMovedRef.current = true;
      suppressClickRef.current = true;
    }
    const next = clampPanelUi({
      ...uiRef.current,
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY
    });
    uiRef.current = next;
    setUi(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;
    if (dragState?.pointerId === event.pointerId) {
      const shouldOpen = uiRef.current.collapsed && !dragMovedRef.current;
      const next = shouldOpen ? clampPanelUi({ ...uiRef.current, collapsed: false }) : uiRef.current.collapsed ? clampPanelUi(snapCollapsedToNearestEdge(uiRef.current)) : uiRef.current;
      uiRef.current = next;
      setUi(next);
      dragStateRef.current = undefined;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
      void writePanelUi(next);
      if (suppressClickRef.current) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 180);
      }
    }
  }

  function consumeClickAfterDrag(): boolean {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
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

  return { position: { x: ui.x, y: ui.y }, collapsed: ui.collapsed, setCollapsed, onPointerDown, onPointerMove, onPointerUp, consumeClickAfterDrag };
}

function defaultPanelUi(): PanelChromeState {
  return {
    x: Math.max(PANEL_MARGIN, window.innerWidth - PANEL_COLLAPSED_WIDTH - PANEL_MARGIN),
    y: Math.max(80, Math.round(window.innerHeight * 0.32)),
    collapsed: true
  };
}

function clampPanelUi(input: PanelChromeState): PanelChromeState {
  const width = input.collapsed ? PANEL_COLLAPSED_WIDTH : Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const height = input.collapsed ? PANEL_COLLAPSED_HEIGHT : 86;
  const minX = PANEL_MARGIN;
  const minY = PANEL_MARGIN;
  const maxX = Math.max(minX, window.innerWidth - width - PANEL_MARGIN);
  const maxY = Math.max(minY, window.innerHeight - height - PANEL_MARGIN);
  return {
    x: Math.round(Math.min(Math.max(minX, input.x), maxX)),
    y: Math.round(Math.min(Math.max(minY, input.y), maxY)),
    collapsed: input.collapsed
  };
}

function snapCollapsedToNearestEdge(input: PanelChromeState): PanelChromeState {
  const leftX = PANEL_MARGIN;
  const rightX = Math.max(leftX, window.innerWidth - PANEL_COLLAPSED_WIDTH - PANEL_MARGIN);
  const panelCenter = input.x + PANEL_COLLAPSED_WIDTH / 2;
  return {
    ...input,
    x: panelCenter < window.innerWidth / 2 ? leftX : rightX
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

function IconHide() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 12s3-5.2 8.2-5.2S20.2 12 20.2 12s-3 5.2-8.2 5.2S3.8 12 3.8 12Z" />
      <path d="M5 5l14 14" />
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

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5.4" y="6.2" width="13.2" height="11.6" rx="2.4" />
      <path d="m7.4 15.8 3.3-3.2 2.1 2 1.5-1.7 2.4 2.9" />
      <path d="M15.4 9.3h.1" />
    </svg>
  );
}

function IconCrop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.4v10.1c0 1.6.9 2.5 2.5 2.5h10.1" />
      <path d="M4.4 7h10.1c1.6 0 2.5.9 2.5 2.5v10.1" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
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

function IconStop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8v8H8z" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5.2" y="4.8" width="13.6" height="14.4" rx="2.6" />
      <path d="M8.5 9h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15h4.6" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
      <path d="M9 5.3v3.4" />
      <path d="M15 10.3v3.4" />
      <path d="M11 15.3v3.4" />
    </svg>
  );
}
