import { type CSSProperties, type ChangeEvent as ReactChangeEvent, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisPhase, GeneratorSite, HistoryEntry, ImageTarget, InterfaceLanguage, PanelTab, PromptAnalysis } from '../shared/types';
import { GENERATOR_SITES } from '../shared/generators';
import { canShowHistoryImage, getGeneratorPrompt, getHistoryImageKey, getHistoryImageSrc, getHistoryPreviewText, getHistoryPrompt, getHistoryStatusLabel, stringifyGeneratorJsonPrompt } from '../shared/historyDisplay';
import { checkLatestRelease, createIdleUpdateInfo } from '../shared/updates';
import type { UpdateInfo } from '../shared/updates';

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
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenUpdateSettings: () => void;
  onCopy: (text: string, label: string) => void;
  onRegenerate: () => void;
  onCancelAnalysis: () => void;
  onOpenGenerator: (siteId: GeneratorSite, prompt: string) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
}

type UiLanguage = 'zh' | 'en';
type HistoryDrawerSize = 'compact' | 'large' | 'xlarge';
const HISTORY_DRAWER_MIN_WIDTH = 220;
const HISTORY_DRAWER_DEFAULT_WIDTH = 300;
const HISTORY_DRAWER_MAX_WIDTH = 430;
const QUICK_HISTORY_DRAWER_LIMIT = 12;

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
    outputJson: 'JSON prompt',
    copy: 'Copy',
    copyJson: 'Copy JSON prompt',
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
    promptHistory: 'History records',
    quickHistory: 'Recent history',
    promptPreview: 'Prompt preview',
    resizeHistory: 'Resize history',
    shrinkHistory: 'Shrink history',
    growHistory: 'Enlarge history',
    clearHistory: 'Clear history',
    allHistory: 'All',
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
    jsonCopied: 'JSON prompt copied',
    negativeCopied: 'Negative copied',
    updateAvailable: 'New version available',
    updateCta: 'View update notes'
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
    outputJson: 'JSON 提示词',
    copy: '复制',
    copyJson: '复制 JSON 提示词',
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
    promptHistory: '历史记录',
    quickHistory: '最近历史',
    promptPreview: '提示词预览',
    resizeHistory: '调整历史尺寸',
    shrinkHistory: '缩小历史',
    growHistory: '放大历史',
    clearHistory: '清空历史',
    allHistory: '全部',
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
    jsonCopied: '已复制 JSON 提示词',
    negativeCopied: '已复制反向词',
    updateAvailable: '发现新版本',
    updateCta: '查看更新说明'
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
  const historyTabHideTimer = useRef<number | undefined>(undefined);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyDrawerWidth, setHistoryDrawerWidth] = useState(HISTORY_DRAWER_DEFAULT_WIDTH);
  const [historyTabVisible, setHistoryTabVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(() => createIdleUpdateInfo());
  const autoExpandToken = getAutoExpandToken(state, fileDragActive);
  const lastAutoExpandToken = useRef('');
  const drawerHistoryEntries = props.historyEntries;
  const quickHistoryEntries = drawerHistoryEntries.slice(0, QUICK_HISTORY_DRAWER_LIMIT);

  useEffect(() => {
    if (!autoExpandToken) {
      lastAutoExpandToken.current = '';
      return;
    }
    if (autoExpandToken === lastAutoExpandToken.current) return;
    lastAutoExpandToken.current = autoExpandToken;
    if (chrome.collapsed) chrome.setCollapsed(false);
  }, [autoExpandToken, chrome.collapsed]);

  useEffect(() => {
    syncPanelHostBounds(state.open, chrome.position, chrome.collapsed);
  }, [state.open, chrome.position.x, chrome.position.y, chrome.collapsed]);

  useEffect(() => {
    void refreshUpdateNotice(updateInfo.currentVersion, setUpdateInfo);
  }, []);

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

  function showHistoryTab() {
    window.clearTimeout(historyTabHideTimer.current);
    setHistoryTabVisible(true);
  }

  function hideHistoryTabSoon() {
    window.clearTimeout(historyTabHideTimer.current);
    historyTabHideTimer.current = window.setTimeout(() => setHistoryTabVisible(false), 160);
  }

  if (!state.open) {
    return null;
  }

  const collapsedEdge = chrome.position.x < window.innerWidth / 2 ? 'left' : 'right';
  const collapsedStack = chrome.position.y < 118 ? 'below' : chrome.position.y > window.innerHeight - 178 ? 'above' : 'split';

  const showHistoryAccess = state.view !== 'history' && !chrome.collapsed && !state.loading && !state.picking && drawerHistoryEntries.length > 0 && hasHistoryDrawerRoom(chrome.position);
  const historyDrawerSize = getHistoryDrawerSizeFromWidth(historyDrawerWidth);
  const historyAccessSide = getHistoryAccessSide(chrome.position, historyDrawerWidth);
  const historyDrawerPlacement = getHistoryDrawerPlacement(chrome.position, historyDrawerOpen, historyDrawerWidth);
  const historyTabPlacement = getHistoryTabPlacement(chrome.position, historyAccessSide);

  return (
    <>
      {showHistoryAccess && historyDrawerOpen ? (
        <QuickHistoryStrip
          entries={quickHistoryEntries}
          totalCount={drawerHistoryEntries.length}
          labels={labels}
          uiLanguage={language}
          open={historyDrawerOpen}
          size={historyDrawerSize}
          width={historyDrawerWidth}
          side={historyDrawerPlacement.side}
          style={historyDrawerPlacement.style}
          onToggle={() => setHistoryDrawerOpen((open) => !open)}
          onSizeChange={(direction) => setHistoryDrawerWidth((width) => clampHistoryDrawerWidth(width + direction * 44))}
          onWidthChange={(width) => setHistoryDrawerWidth(clampHistoryDrawerWidth(width))}
          onOpenHistory={props.onOpenHistory}
          onClearHistory={props.onClearHistory}
          onCopy={props.onCopy}
          onSelect={props.onSelectHistoryEntry}
        />
      ) : null}
      {showHistoryAccess && !historyDrawerOpen ? (
        <button
          className={`zpc-history-tab is-${historyAccessSide}${historyDrawerOpen ? ' is-active' : ''}${historyTabVisible || historyDrawerOpen ? ' is-visible' : ''}`}
          type="button"
          style={historyTabPlacement}
          onMouseEnter={showHistoryTab}
          onMouseLeave={hideHistoryTabSoon}
          onFocus={showHistoryTab}
          onBlur={hideHistoryTabSoon}
          onClick={() => setHistoryDrawerOpen((open) => !open)}
          aria-label={labels.promptHistory}
          title={labels.promptHistory}
          aria-expanded={historyDrawerOpen}
        >
          <IconHistory />
          <span>{drawerHistoryEntries.length}</span>
        </button>
      ) : null}
      <section
        className={chrome.collapsed ? 'zpc-panel zpc-panel--collapsed' : 'zpc-panel'}
        aria-live="polite"
        data-state={state.loading ? 'loading' : analysis ? 'result' : state.error ? 'error' : 'ready'}
        data-edge={collapsedEdge}
        data-stack={collapsedStack}
        style={{ left: chrome.position.x, top: chrome.position.y }}
        onMouseEnter={showHistoryTab}
        onMouseLeave={hideHistoryTabSoon}
        onFocus={showHistoryTab}
        onBlur={hideHistoryTabSoon}
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
          {updateInfo.state === 'available' ? (
            <button className="zpc-update-notice" type="button" onClick={props.onOpenUpdateSettings}>
              <span>{labels.updateAvailable}</span>
              <strong>
                {updateInfo.currentVersion}
                {' -> '}
                {updateInfo.latestVersion}
              </strong>
              {updateInfo.releaseName ? <small>{updateInfo.releaseName}</small> : null}
              <em>{labels.updateCta}</em>
            </button>
          ) : null}
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
              onClear={props.onClearHistory}
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
    </>
  );
}

async function refreshUpdateNotice(currentVersion: string, setUpdateInfo: (info: UpdateInfo) => void): Promise<void> {
  try {
    const next = await checkLatestRelease(currentVersion);
    setUpdateInfo(next.state === 'available' ? next : createIdleUpdateInfo());
  } catch {
    setUpdateInfo(createIdleUpdateInfo());
  }
}

function QuickHistoryStrip(props: {
  entries: HistoryEntry[];
  totalCount: number;
  labels: (typeof copy)[UiLanguage];
  uiLanguage: UiLanguage;
  open: boolean;
  size: HistoryDrawerSize;
  width: number;
  side: 'left' | 'right';
  style: CSSProperties;
  onToggle: () => void;
  onSizeChange: (direction: -1 | 1) => void;
  onWidthChange: (width: number) => void;
  onOpenHistory: () => void;
  onClearHistory: () => void;
  onCopy: (text: string, label: string) => void;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const previewHideTimer = useRef<number | undefined>(undefined);
  const [previewEntryId, setPreviewEntryId] = useState<string>();
  const [previewTop, setPreviewTop] = useState<number>();
  const [brokenImageKeys, setBrokenImageKeys] = useState<Set<string>>(() => new Set());
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const previewEntry = props.entries.find((entry) => entry.id === previewEntryId);
  const previewText = previewEntry ? getHistoryPreviewText(previewEntry, props.uiLanguage) : '';
  const previewEntryIndex = previewEntry ? props.entries.findIndex((entry) => entry.id === previewEntry.id) : -1;

  useEffect(() => {
    if (previewEntryId && !props.entries.some((entry) => entry.id === previewEntryId)) setPreviewEntryId(undefined);
  }, [props.entries, previewEntryId]);

  useEffect(() => {
    return () => window.clearTimeout(previewHideTimer.current);
  }, []);

  function clearPreviewHideTimer() {
    window.clearTimeout(previewHideTimer.current);
    previewHideTimer.current = undefined;
  }

  function hidePreview() {
    setPreviewEntryId(undefined);
    setPreviewTop(undefined);
  }

  function showPreview(entryId: string, anchor?: HTMLElement) {
    clearPreviewHideTimer();
    if (anchor && sectionRef.current) {
      const sectionRect = sectionRef.current.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const centeredTop = anchorRect.top + anchorRect.height / 2 - sectionRect.top;
      setPreviewTop(clampPreviewTop(centeredTop, sectionRect.height));
    }
    setPreviewEntryId(entryId);
  }

  function schedulePreviewHide(delay = 1800) {
    clearPreviewHideTimer();
    previewHideTimer.current = window.setTimeout(hidePreview, delay);
  }

  function closePreview() {
    clearPreviewHideTimer();
    hidePreview();
  }

  function markImageBroken(entry: HistoryEntry, imageSrc: string) {
    setBrokenImageKeys((current) => {
      const key = getHistoryImageKey(entry, imageSrc);
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function rememberImageAspect(imageKey: string, image: HTMLImageElement) {
    const ratio = getLoadedImageAspectRatioNumber(image);
    if (!ratio) return;
    setImageAspectRatios((current) => current[imageKey] === ratio ? current : { ...current, [imageKey]: ratio });
  }

  function handleSelect(entry: HistoryEntry) {
    closePreview();
    props.onSelect(entry);
  }

  function handleClearHistory() {
    closePreview();
    props.onClearHistory();
  }

  function handleCopyPreview() {
    if (!previewText) return;
    clearPreviewHideTimer();
    props.onCopy(previewText, props.labels.promptCopied);
    schedulePreviewHide(2200);
  }

  function handleResizePointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = props.width;
    const side = props.side;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = side === 'left' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      props.onWidthChange(startWidth + delta);
    };
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  return (
    <section
      ref={sectionRef}
      className={`zpc-quick-history is-${props.side} is-${props.size}${props.open ? ' is-open' : ''}`}
      aria-label={props.labels.quickHistory}
      style={props.style}
      onMouseEnter={clearPreviewHideTimer}
      onMouseLeave={() => schedulePreviewHide()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedulePreviewHide(900);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        closePreview();
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button className="zpc-quick-history__toggle" type="button" onClick={props.onToggle} aria-expanded={props.open}>
        <IconHistory />
        <span>{props.labels.quickHistory}</span>
        {props.open ? <strong>{props.totalCount}</strong> : null}
      </button>
      {props.open ? (
        <div className="zpc-quick-history__content">
          <div className="zpc-quick-history__head">
            <span>{formatQuickHistoryCount(props.entries.length, props.totalCount)} {props.labels.historyCount}</span>
            <div className="zpc-quick-history__tools">
              <button type="button" onClick={() => props.onSizeChange(-1)} disabled={props.size === 'compact'} aria-label={props.labels.shrinkHistory} title={props.labels.shrinkHistory}>
                <IconMinus />
              </button>
              <button type="button" onClick={() => props.onSizeChange(1)} disabled={props.size === 'xlarge'} aria-label={props.labels.growHistory} title={props.labels.growHistory}>
                <IconPlus />
              </button>
              <button className="zpc-quick-history__danger" type="button" onClick={handleClearHistory} aria-label={props.labels.clearHistory} title={props.labels.clearHistory}>
                <IconTrash />
              </button>
              <button className="zpc-quick-history__full" type="button" onClick={props.onOpenHistory} aria-label={props.labels.promptHistory} title={props.labels.promptHistory}>
                {props.labels.allHistory}
              </button>
            </div>
          </div>
          <div className="zpc-quick-history__rail">
            {props.entries.map((entry) => {
              const imageSrc = getHistoryImageSrc(entry);
              const imageKey = imageSrc ? getHistoryImageKey(entry, imageSrc) : '';
              const canShowImage = canShowHistoryImage(entry, imageSrc) && !brokenImageKeys.has(imageKey);
              const active = previewEntryId === entry.id;
              const previewId = `zpc-quick-history-preview-${entry.id}`;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  className={active ? 'zpc-quick-history-card is-active' : 'zpc-quick-history-card'}
                  style={getQuickHistoryCardStyle(imageKey, imageAspectRatios, props.width)}
                  key={entry.id}
                  onMouseEnter={(event) => showPreview(entry.id, event.currentTarget)}
                  onFocus={(event) => showPreview(entry.id, event.currentTarget)}
                  onClick={() => handleSelect(entry)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    handleSelect(entry);
                  }}
                  aria-describedby={active && previewText ? previewId : undefined}
                  aria-label={`${entry.title}. ${getHistoryStatusLabel(entry.status, props.uiLanguage)}. ${getHistoryPreviewText(entry, props.uiLanguage)}`}
                >
                  <span className={`zpc-quick-history-thumb is-${entry.status}`} style={getQuickHistoryThumbStyle(imageKey, imageAspectRatios, props.width)}>
                    {canShowImage ? (
                      <img
                        className="zpc-quick-history-thumb__image"
                        src={imageSrc}
                        alt=""
                        decoding="async"
                        ref={(node) => {
                          if (node?.complete) rememberImageAspect(imageKey, node);
                        }}
                        onLoad={(event) => rememberImageAspect(imageKey, event.currentTarget)}
                        onError={() => markImageBroken(entry, imageSrc)}
                      />
                    ) : <HistoryPlaceholder status={entry.status} />}
                  </span>
                  <span className={`zpc-quick-history-status is-${entry.status}`} aria-hidden="true" />
                </div>
              );
            })}
          </div>
          {previewEntry && previewText && previewEntryIndex >= 0 ? (
            <div
              className="zpc-quick-history-preview"
              id={`zpc-quick-history-preview-${previewEntry.id}`}
              role="status"
              style={{ top: previewTop ?? getQuickHistoryPreviewTop(previewEntryIndex, props.width, getNumericCssValue(props.style.top)) }}
              onMouseEnter={clearPreviewHideTimer}
              onMouseLeave={() => schedulePreviewHide()}
              onFocus={clearPreviewHideTimer}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedulePreviewHide(900);
              }}
            >
              <div className="zpc-quick-history-preview__head">
                <span>{props.labels.promptPreview}</span>
                <div>
                  <button type="button" onClick={handleCopyPreview}>{props.labels.copy}</button>
                  <button type="button" onClick={closePreview} aria-label={props.labels.close} title={props.labels.close}>
                    <IconClose />
                  </button>
                </div>
              </div>
              <strong>{previewEntry.title}</strong>
              <p>{previewText}</p>
            </div>
          ) : null}
          <span
            className="zpc-quick-history__resize"
            role="separator"
            aria-orientation="vertical"
            aria-label={props.labels.resizeHistory}
            title={props.labels.resizeHistory}
            onPointerDown={handleResizePointerDown}
          />
        </div>
      ) : null}
    </section>
  );
}

function HistoryPlaceholder({ status }: { status: HistoryEntry['status'] }) {
  if (status === 'running') {
    return (
      <span className="zpc-history-placeholder zpc-history-placeholder--running" aria-hidden="true">
        <span />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="zpc-history-placeholder zpc-history-placeholder--failed" aria-hidden="true">
        <IconStop />
      </span>
    );
  }
  return (
    <span className="zpc-history-placeholder" aria-hidden="true">
      <IconImage />
    </span>
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
  onClear: () => void;
}) {
  const [brokenImageKeys, setBrokenImageKeys] = useState<Set<string>>(() => new Set());
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, string>>({});

  function markImageBroken(entry: HistoryEntry, imageSrc: string) {
    setBrokenImageKeys((current) => {
      const key = getHistoryImageKey(entry, imageSrc);
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function rememberImageAspect(imageKey: string, image: HTMLImageElement) {
    const ratio = getLoadedImageAspectRatio(image);
    if (!ratio) return;
    setImageAspectRatios((current) => current[imageKey] === ratio ? current : { ...current, [imageKey]: ratio });
  }

  return (
    <div className="zpc-workspace zpc-history-panel">
      <div className="zpc-history-head">
        <div>
          <span>{props.labels.promptHistory}</span>
          <strong>{props.entries.length} {props.labels.historyCount}</strong>
        </div>
        <div className="zpc-history-head__actions">
          <button type="button" onClick={props.onRefresh}>{props.labels.refreshHistory}</button>
          <button type="button" onClick={props.onClear} disabled={!props.entries.length}>{props.labels.clearHistory}</button>
          <button type="button" onClick={props.onBack}>{props.labels.backToPanel}</button>
        </div>
      </div>
      <div className="zpc-history-list">
        {props.entries.map((entry) => {
          const imageSrc = getHistoryImageSrc(entry);
          const imageKey = imageSrc ? getHistoryImageKey(entry, imageSrc) : '';
          const showImage = canShowHistoryImage(entry, imageSrc) && !brokenImageKeys.has(imageKey);
          const prompt = getHistoryPrompt(entry, props.uiLanguage);
          const preview = getHistoryPreviewText(entry, props.uiLanguage);
          return (
            <article className="zpc-history-item" key={entry.id}>
              <div className={`zpc-history-item__thumb is-${entry.status}`} style={getHistoryImageAspectStyle(imageKey, imageAspectRatios)}>
                {showImage ? <img src={imageSrc} alt="" loading="lazy" decoding="async" onLoad={(event) => rememberImageAspect(imageKey, event.currentTarget)} onError={() => markImageBroken(entry, imageSrc)} /> : <HistoryPlaceholder status={entry.status} />}
              </div>
              <div className="zpc-history-item__body">
                <div className="zpc-history-item__top">
                  <strong>{entry.title}</strong>
                  <span className={entry.status}>{getHistoryStatusLabel(entry.status, props.uiLanguage)}</span>
                </div>
                <p className="zpc-history-date">{props.labels.createdAt}: {formatHistoryDate(entry.createdAt)}</p>
                <p className={entry.error && !prompt ? 'zpc-history-error' : 'zpc-history-prompt'}>{preview}</p>
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

function formatQuickHistoryCount(visibleCount: number, totalCount: number): string {
  return visibleCount === totalCount ? String(totalCount) : `${visibleCount} / ${totalCount}`;
}

function getQuickHistoryPreviewTop(index: number, width: number, drawerTop: number): number {
  const drawerPadding = 6;
  const toggleHeight = 42;
  const contentGap = 8;
  const headHeight = 25;
  const railGap = 8;
  const cardHeight = getHistoryCardHeight(width);
  const rawTop = drawerPadding + toggleHeight + contentGap + headHeight + contentGap + index * (cardHeight + railGap) + cardHeight / 2;
  const minTop = 112;
  const maxTop = Math.max(minTop, window.innerHeight - drawerTop - 112);
  return Math.min(maxTop, Math.max(minTop, rawTop));
}

function clampPreviewTop(top: number, drawerHeight: number): number {
  const minTop = 72;
  const maxTop = Math.max(minTop, drawerHeight - 72);
  return Math.round(Math.min(maxTop, Math.max(minTop, top)));
}

function getNumericCssValue(value: CSSProperties['top']): number {
  return typeof value === 'number' ? value : Number.parseFloat(String(value || 0)) || 0;
}

function getLoadedImageAspectRatio(image: HTMLImageElement): string | undefined {
  if (!image.naturalWidth || !image.naturalHeight) return undefined;
  return `${image.naturalWidth} / ${image.naturalHeight}`;
}

function getLoadedImageAspectRatioNumber(image: HTMLImageElement): number | undefined {
  if (!image.naturalWidth || !image.naturalHeight) return undefined;
  return image.naturalWidth / image.naturalHeight;
}

function getQuickHistoryThumbStyle(imageKey: string, ratios: Record<string, number>, drawerWidth: number): CSSProperties | undefined {
  const ratio = ratios[imageKey];
  if (!ratio) return undefined;
  const thumbWidth = Math.max(1, drawerWidth - 34);
  return { height: Math.max(72, Math.round(thumbWidth / ratio)) };
}

function getQuickHistoryCardStyle(imageKey: string, ratios: Record<string, number>, drawerWidth: number): CSSProperties | undefined {
  const thumbStyle = getQuickHistoryThumbStyle(imageKey, ratios, drawerWidth);
  if (!thumbStyle?.height || typeof thumbStyle.height !== 'number') return undefined;
  return { height: thumbStyle.height + 14 };
}

function getHistoryImageAspectStyle(imageKey: string, ratios: Record<string, string>): CSSProperties | undefined {
  const ratio = ratios[imageKey];
  return ratio ? ({ '--zpc-history-image-ratio': ratio } as CSSProperties) : undefined;
}

function getHistoryDrawerPlacement(position: Pick<PanelChromeState, 'x' | 'y'>, open: boolean, width: number): { side: 'left' | 'right'; style: CSSProperties } {
  const drawerWidth = open ? clampHistoryDrawerWidth(width) : 38;
  const gap = 8;
  const top = Math.min(window.innerHeight - 220, Math.max(PANEL_MARGIN, position.y));
  const side = getHistoryAccessSide(position, drawerWidth);
  const previewWidth = getHistoryPreviewWidth(position, side, drawerWidth);
  const previewGap = 10;
  const styleBase = {
    top: Math.max(PANEL_MARGIN, top),
    width: drawerWidth,
    '--zpc-quick-history-width': `${drawerWidth}px`,
    '--zpc-quick-history-thumb-height': `${getHistoryThumbHeight(drawerWidth)}px`,
    '--zpc-quick-history-card-height': `${getHistoryCardHeight(drawerWidth)}px`,
    '--zpc-quick-history-preview-width': `${previewWidth}px`,
    '--zpc-quick-history-max-height': `${Math.max(180, window.innerHeight - Math.max(PANEL_MARGIN, top) - PANEL_MARGIN)}px`
  } as CSSProperties;
  if (side === 'left') {
    return {
      side: 'left',
      style: {
        ...styleBase,
        left: Math.max(PANEL_MARGIN, position.x - drawerWidth - gap),
        '--zpc-quick-history-preview-gap': `${previewGap}px`
      } as CSSProperties
    };
  }
  const panelWidth = Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  return {
    side: 'right',
    style: {
      ...styleBase,
      left: Math.min(window.innerWidth - drawerWidth - PANEL_MARGIN, position.x + panelWidth + gap),
      '--zpc-quick-history-preview-gap': `${previewGap}px`
    } as CSSProperties
  };
}

function hasHistoryDrawerRoom(position: Pick<PanelChromeState, 'x'>): boolean {
  const drawerWidth = HISTORY_DRAWER_MIN_WIDTH;
  const gap = 8;
  const panelWidth = Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const hasLeft = position.x >= drawerWidth + gap + PANEL_MARGIN;
  const hasRight = position.x + panelWidth + drawerWidth + gap <= window.innerWidth - PANEL_MARGIN;
  return hasLeft || hasRight;
}

function getHistoryAccessSide(position: Pick<PanelChromeState, 'x'>, width: number): 'left' | 'right' {
  const drawerWidth = clampHistoryDrawerWidth(width);
  const gap = 8;
  const minPreviewWidth = 180;
  const panelWidth = Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const leftSpace = position.x - gap - PANEL_MARGIN;
  const rightSpace = window.innerWidth - (position.x + panelWidth + gap) - PANEL_MARGIN;
  const leftFitsDrawerAndPreview = leftSpace >= drawerWidth + gap + minPreviewWidth;
  const rightFitsDrawerAndPreview = rightSpace >= drawerWidth + gap + minPreviewWidth;
  if (leftFitsDrawerAndPreview) return 'left';
  if (rightFitsDrawerAndPreview) return 'right';
  if (leftSpace >= drawerWidth && leftSpace >= rightSpace) return 'left';
  if (rightSpace >= drawerWidth) return 'right';
  return leftSpace > rightSpace ? 'left' : 'right';
}

function getHistoryTabPlacement(position: Pick<PanelChromeState, 'x' | 'y'>, side: 'left' | 'right'): CSSProperties {
  const panelWidth = Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const top = Math.max(PANEL_MARGIN, position.y + 20);
  if (side === 'left') return { left: Math.max(PANEL_MARGIN, position.x - 31), top };
  return { left: Math.min(window.innerWidth - 32 - PANEL_MARGIN, position.x + panelWidth - 1), top };
}

function getHistoryDrawerSizeFromWidth(width: number): HistoryDrawerSize {
  if (width >= 340) return 'xlarge';
  if (width >= 260) return 'large';
  return 'compact';
}

function clampHistoryDrawerWidth(width: number): number {
  return Math.round(Math.min(HISTORY_DRAWER_MAX_WIDTH, Math.max(HISTORY_DRAWER_MIN_WIDTH, width)));
}

function getHistoryThumbHeight(width: number): number {
  return Math.round(Math.min(260, Math.max(150, width * 0.72)));
}

function getHistoryCardHeight(width: number): number {
  return getHistoryThumbHeight(width) + 14;
}

function getHistoryPreviewWidth(position: Pick<PanelChromeState, 'x'>, side: 'left' | 'right', drawerWidth: number): number {
  const gap = 18;
  const panelWidth = Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const available = side === 'left'
    ? position.x - drawerWidth - gap - PANEL_MARGIN
    : window.innerWidth - (position.x + panelWidth + drawerWidth + gap) - PANEL_MARGIN;
  return Math.round(Math.min(360, Math.max(140, available)));
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
  const generatorPrompt = getGeneratorPrompt(analysis);
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
            <span>{getOutputLabelForTab(tab, props.labels)}</span>
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
          <button type="button" key={siteId} onClick={() => props.onOpenGenerator(siteId, generatorPrompt)}>
            {labels.openIn} {GENERATOR_SITES[siteId].label}
          </button>
        ))}
      </div>
    </>
  );
}

function usePreferredTab(analysis: PromptAnalysis | undefined, language: UiLanguage): [PanelTab, (tab: PanelTab) => void] {
  const preferred: PanelTab = 'en';
  const [tab, setTab] = useState<PanelTab>(preferred);
  useEffect(() => {
    if (analysis) setTab(preferred);
  }, [analysis, preferred]);
  return [tab, setTab];
}

function getTabText(analysis: PromptAnalysis, tab: PanelTab): string {
  if (tab === 'json') return stringifyGeneratorJsonPrompt(analysis);
  if (tab === 'negative') return analysis.negative_prompt;
  if (tab === 'en') return getGeneratorPrompt(analysis);
  return analysis[tab].prompt;
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
  if (!analysis.negative_prompt.trim()) addMissing('negative_prompt');
  if (!analysis.zh_style_tags.length && !analysis.en_style_tags.length) addMissing('style_tags');

  const jsonFields = analysis.json_prompt;
  const legacyJsonFields: Array<keyof PromptAnalysis['json_prompt']> = [
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
  const v2JsonFields: Array<keyof PromptAnalysis['json_prompt']> = [
    'schema_version',
    'summary',
    'generation_prompt',
    'generation_negative_prompt',
    'spatial_dynamics',
    'fidelity_priorities',
    'global_fingerprint',
    'observation_units',
    'text_elements',
    'reconstruction_priorities'
  ];
  const requiredJsonFields = jsonFields.schema_version === 'reconstruction_v2' ? [...legacyJsonFields, ...v2JsonFields] : legacyJsonFields;
  for (const field of requiredJsonFields) {
    const value = jsonFields[field];
    if (!isFilledJsonValue(value)) addMissing(String(field));
  }

  if (!missing.length) return { label: language === 'zh' ? copy.zh.complete : copy.en.complete, missing };
  if (missing.length <= 3) return { label: language === 'zh' ? copy.zh.needsReview : copy.en.needsReview, missing };
  return { label: language === 'zh' ? copy.zh.structureIssue : copy.en.structureIssue, missing };
}

function completenessFieldLabel(key: string, language: UiLanguage): string {
  const zh: Record<string, string> = {
    'zh.prompt': '中文提示词',
    'en.prompt': '英文提示词',
    negative_prompt: '反向词',
    style_tags: '风格标签',
    schema_version: 'JSON版本',
    summary: '复原摘要',
    generation_prompt: 'JSON生成提示词',
    generation_negative_prompt: 'JSON反向词',
    spatial_dynamics: '空间动势',
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
    fidelity_priorities: '复原优先级',
    global_fingerprint: '全局视觉指纹',
    observation_units: '动态观察单元',
    text_elements: '文字元素',
    reconstruction_priorities: '复原取舍',
    likely_generation_intent: '生成意图'
  };
  const en: Record<string, string> = {
    'zh.prompt': 'Chinese prompt',
    'en.prompt': 'English prompt',
    negative_prompt: 'negative prompt',
    style_tags: 'style tags',
    schema_version: 'JSON version',
    summary: 'reconstruction summary',
    generation_prompt: 'JSON generation prompt',
    generation_negative_prompt: 'JSON negative prompt',
    spatial_dynamics: 'spatial dynamics',
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
    fidelity_priorities: 'fidelity priorities',
    global_fingerprint: 'global fingerprint',
    observation_units: 'observation units',
    text_elements: 'text elements',
    reconstruction_priorities: 'reconstruction priorities',
    likely_generation_intent: 'generation intent'
  };
  return (language === 'zh' ? zh : en)[key] || key;
}

function isFilledJsonValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isFilledJsonValue);
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (value && typeof value === 'object') return Object.values(value).some(isFilledJsonValue);
  return false;
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

function getOutputLabelForTab(tab: PanelTab, labels: (typeof copy)[UiLanguage]): string {
  return tab === 'json' ? labels.outputJson : labels.output;
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
const COLLAPSED_ACTION_SPACE = 96;
const COLLAPSED_LABEL_SPACE = 112;

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
    x: PANEL_MARGIN,
    y: Math.max(80, Math.round(window.innerHeight * 0.32)),
    collapsed: true
  };
}

function syncPanelHostBounds(open: boolean, position: { x: number; y: number }, collapsed: boolean): void {
  const host = document.getElementById('zhijuan-prompt-root');
  if (!host) return;

  const bounds = open ? getPanelHostBounds(position, collapsed) : { left: 0, top: 0, width: 0, height: 0 };
  Object.assign(host.style, {
    position: 'fixed',
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    zIndex: '2147483647',
    overflow: 'visible'
  });
}

function getPanelHostBounds(position: { x: number; y: number }, collapsed: boolean): { left: number; top: number; width: number; height: number } {
  if (!collapsed) {
    return {
      left: position.x,
      top: position.y,
      width: Math.min(PANEL_EXPANDED_WIDTH, window.innerWidth - PANEL_MARGIN * 2),
      height: Math.min(Math.round(window.innerHeight * 0.74), window.innerHeight - PANEL_MARGIN * 2)
    };
  }

  const isLeftEdge = position.x < window.innerWidth / 2;
  const left = isLeftEdge ? position.x : Math.max(0, position.x - COLLAPSED_LABEL_SPACE);
  const top = Math.max(0, position.y - COLLAPSED_ACTION_SPACE);
  return {
    left,
    top,
    width: PANEL_COLLAPSED_WIDTH + COLLAPSED_LABEL_SPACE,
    height: Math.min(window.innerHeight - top, PANEL_COLLAPSED_HEIGHT + COLLAPSED_ACTION_SPACE * 2)
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

function IconMinus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 12h10" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8.5h8" />
      <path d="M10 8.5V6.8c0-.7.5-1.2 1.2-1.2h1.6c.7 0 1.2.5 1.2 1.2v1.7" />
      <path d="M9 10.5l.5 7.1c.1.8.6 1.3 1.4 1.3h2.2c.8 0 1.3-.5 1.4-1.3l.5-7.1" />
      <path d="M11.2 12.4v4" />
      <path d="M12.8 12.4v4" />
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
