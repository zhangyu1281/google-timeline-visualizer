import './style.css';
import { initAnalytics } from './analytics';
import {
  clearPaymentReturnParams,
  clearPaymentSession,
  createCheckoutSession,
  createExportId,
  isDownloadUnlocked,
  isPaymentEnabled,
  markDownloadUnlocked,
  loadCheckoutInPopup,
  openCheckoutPopup,
  paymentPriceLabel,
  paymentReturnExportId,
  pollPaymentStatus,
  readStoredPaymentSession,
} from './payment';
import { SITE_LOCALE, HIDE_LANGUAGE_PICKER } from './site-config';
import { resolveInitialLanguagePreference } from './site-locale';
import { frameAtElapsedSeconds, totalDurationSeconds } from './animation';
import { AppError } from './errors';
import { cumulativeDistances } from './geo';
import {
  isDistanceUnitPreference,
  readDistanceUnitPreference,
  resolveDistanceUnit,
  writeDistanceUnitPreference,
} from './distance-unit';
import {
  activeLocale,
  createI18n,
  formattingLocale,
  isLanguagePreference,
  writeLanguagePreference,
} from './i18n';
import { applyStrings, syncDocumentLang } from './i18n-dom';
import { filterLocationOutliers } from './outlier';
import { parsePresetToken, presetIntentUrl } from './preset-link';
import { formatRawDateRange } from './raw-range';
import { drawFrame, prepareJourney, previewCanvasSize } from './renderer';
import {
  type RenderAppearance,
  isMapTheme,
  isMarkerPreset,
  isRouteColorPreset,
} from './render-theme';
import { selectTimelineModePoints } from './selection';
import {
  availableMonths,
  localDateKey,
  parseRawSignalsJson,
  parseTimelineJson,
  pointDateKey,
  processRawSignals,
  TimelineParseError,
} from './timeline';
import type { I18n, LanguagePreference, TextKey } from './i18n';
import type { DistanceUnit, DistanceUnitPreference } from './distance-unit';
import type { LocationFilterMode } from './outlier';
import type { OverlayText } from './renderer';
import type { RawSignalPoint, RawSignalProcessingResult, TimelineParseReason } from './timeline';
import type {
  CameraMovement,
  GeoPoint,
  MonthOption,
  PreparedJourney,
  RenderSize,
  TimelineFrame,
} from './types';
import type { VideoFormat, VideoFormatSupport, VideoFrameRate, AspectRatioPreset, VideoFormatKey } from './video';
import {
  ALL_VIDEO_FORMATS,
  aspectRatioOfFormatKey,
  createJourneyMp4,
  formatKeyForAspect,
  hasVideoEncoder,
  probeVideoFormats,
  resolveVideoFormat,
  VIDEO_FRAME_RATES,
  VIDEO_FORMATS,
  videoFormatAtFrameRate,
  videoFormatByKey,
  videoFormatSupportKey,
} from './video';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

const fileInput = element<HTMLInputElement>('timeline-file');
const sampleButton = element<HTMLButtonElement>('sample-button');
const introCard = element<HTMLElement>('intro-card');
const fileStatus = element<HTMLParagraphElement>('file-status');
const compatibilityStatus = element<HTMLParagraphElement>('compatibility-status');
const languageSelect = element<HTMLSelectElement>('app-language');
const languageField = element<HTMLElement>('language-field');
const languageWarning = element<HTMLParagraphElement>('language-warning');
const distanceUnitSelect = element<HTMLSelectElement>('distance-unit');
const settingsCard = element<HTMLElement>('settings-card');
const timelineSummaryCard = element<HTMLElement>('timeline-summary-card');
const timelineSummarySource = element<HTMLParagraphElement>('timeline-summary-source');
const timelineSummaryMeta = element<HTMLParagraphElement>('timeline-summary-meta');
const timelineSummarySelection = element<HTMLParagraphElement>('timeline-summary-selection');
const timelineSummaryWarnings = element<HTMLParagraphElement>('timeline-summary-warnings');
const changeTimelineButton = element<HTMLButtonElement>('change-timeline-button');
const showLandingButton = element<HTMLButtonElement>('show-landing-button');
const exactDateToggle = element<HTMLInputElement>('exact-date-toggle');
const periodControls = element<HTMLElement>('period-controls');
const rawSignalsRow = element<HTMLElement>('raw-signals-row');
const rawSignalsToggle = element<HTMLInputElement>('raw-signals-toggle');
const rawSignalsDescription = element<HTMLElement>('raw-signals-description');
const rawDateRange = element<HTMLParagraphElement>('raw-date-range');
const rawAccuracyField = element<HTMLElement>('raw-accuracy-field');
const rawAccuracyLimit = element<HTMLInputElement>('raw-accuracy-limit');
const locationFilterField = element<HTMLElement>('location-filter-field');
const locationFilterSelect = element<HTMLSelectElement>('location-filter');
const monthRangeFields = element<HTMLElement>('month-range-fields');
const exactDateFields = element<HTMLElement>('exact-date-fields');
const startSelect = element<HTMLSelectElement>('start-month');
const endSelect = element<HTMLSelectElement>('end-month');
const startDateInput = element<HTMLInputElement>('start-date');
const endDateInput = element<HTMLInputElement>('end-date');
const titleInput = element<HTMLInputElement>('video-title');
const durationSelect = element<HTMLSelectElement>('duration');
const cameraMovementSelect = element<HTMLSelectElement>('camera-movement');
const mapThemeSelect = element<HTMLSelectElement>('map-theme');
const routeColorSelect = element<HTMLSelectElement>('route-color');
const markerStyleSelect = element<HTMLSelectElement>('marker-style');
const formatSelect = element<HTMLSelectElement>('video-format');
const squareResolutionSelect = element<HTMLSelectElement>('square-resolution');
const squareResolutionField = element<HTMLElement>('square-resolution-field');
const aspectChipButtons = () => Array.from(
  document.querySelectorAll<HTMLButtonElement>('.aspect-chip[data-aspect]'),
);
const frameRateSelect = element<HTMLSelectElement>('frame-rate');
const formatWarning = element<HTMLParagraphElement>('format-warning');
const selectionSummary = element<HTMLParagraphElement>('selection-summary');
const mapConsent = element<HTMLInputElement>('map-consent');
const settingsError = element<HTMLParagraphElement>('settings-error');
const previewCard = element<HTMLElement>('preview-card');
const previewStage = element<HTMLElement>('preview-stage');
const previewDemoVideo = element<HTMLVideoElement>('preview-demo-video');
const canvas = element<HTMLCanvasElement>('journey-canvas');
const previewEmptyState = element<HTMLElement>('preview-empty-state');
const previewPlaceholder = element<HTMLParagraphElement>('preview-placeholder');
const previewPlaceholderCta = element<HTMLButtonElement>('preview-placeholder-cta');
const previewBusyOverlay = element<HTMLElement>('preview-busy-overlay');
const previewBusyLabel = element<HTMLParagraphElement>('preview-busy-label');
const previewControls = element<HTMLElement>('preview-controls');
const previewHeading = element<HTMLHeadingElement>('preview-heading');
const previewPlayButton = element<HTMLButtonElement>('preview-play-button');
const previewPauseButton = element<HTMLButtonElement>('preview-pause-button');
const previewReplayButton = element<HTMLButtonElement>('preview-replay-button');
const previewScrubber = element<HTMLInputElement>('preview-scrubber');
const stickyPreviewButton = element<HTMLButtonElement>('sticky-preview-button');
const stickyCreateButton = element<HTMLButtonElement>('sticky-create-button');
const previewButton = element<HTMLButtonElement>('preview-button');
const createButton = element<HTMLButtonElement>('create-button');
const actionHint = element<HTMLParagraphElement>('action-hint');
const cancelButton = element<HTMLButtonElement>('cancel-button');
const progress = element<HTMLProgressElement>('export-progress');
const progressLabel = element<HTMLSpanElement>('progress-label');
const errorMessage = element<HTMLParagraphElement>('error-message');
const resultVideo = element<HTMLVideoElement>('result-video');
const resultActions = element<HTMLElement>('result-actions');
const shareButton = element<HTMLButtonElement>('share-button');
const downloadButton = element<HTMLButtonElement>('download-button');
const paymentStatus = element<HTMLParagraphElement>('payment-status');
const backToPreviewButton = element<HTMLButtonElement>('back-to-preview-button');
const rawOnlyDialog = element<HTMLDialogElement>('raw-only-dialog');
const openGoogleMapsButton = element<HTMLButtonElement>('open-google-maps');
const continueRawDataButton = element<HTMLButtonElement>('continue-raw-data');
const presetLinkCard = element<HTMLElement>('preset-link-card');
const openPresetLink = element<HTMLAnchorElement>('open-preset-link');
const toolActionBar = element<HTMLElement>('tool-action-bar');

const presetToken = parsePresetToken(window.location.search);
if (presetToken !== null) {
  presetLinkCard.classList.remove('hidden');
  openPresetLink.href = presetIntentUrl(presetToken, window.location.href);
}

if (import.meta.env.VITE_PREVIEW === 'true') {
  element<HTMLElement>('preview-banner').classList.remove('hidden');
}

function browserLanguages(): readonly string[] {
  return navigator.languages ?? [navigator.language];
}

/** Resolves the catalog and the Intl formatting tag together, so the two can never drift. */
function buildI18n(preference: LanguagePreference): I18n {
  const tags = browserLanguages();
  const locale = activeLocale(preference, tags);
  return createI18n(locale, formattingLocale(preference, tags, locale));
}

let languagePreference: LanguagePreference = SITE_LOCALE;
let i18n: I18n = buildI18n(SITE_LOCALE);
let distanceUnitPreference: DistanceUnitPreference = readDistanceUnitPreference();

function currentDistanceUnit(): DistanceUnit {
  return resolveDistanceUnit(distanceUnitPreference, browserLanguages());
}

/** Where the loaded points came from. The sample has no filename, so it carries a catalog key. */
interface TimelineSource {
  readonly sample: boolean;
  readonly name: string;
}

/**
 * Every message the app shows is kept as the state it was derived from, never as the finished
 * string, so a language switch can re-render it instead of leaving stale text behind. The
 * `text` variant carries a message that was never in the catalog, such as the message of an
 * unrecognised Error.
 */
type MessageState =
  | { readonly kind: 'key'; readonly key: TextKey }
  | { readonly kind: 'text'; readonly text: string };

type FileStatusState =
  | { readonly kind: 'key'; readonly key: TextKey }
  | { readonly kind: 'reading'; readonly name: string }
  | {
    readonly kind: 'loaded';
    readonly source: TimelineSource;
    readonly count: number;
    readonly firstMonthKey: string;
    readonly lastMonthKey: string;
    readonly rawFallback: boolean;
    readonly timezoneMissing: boolean;
  };

type ProgressState =
  | { readonly kind: 'key'; readonly key: TextKey }
  | { readonly kind: 'preparing'; readonly completed: number; readonly total: number }
  | { readonly kind: 'creating'; readonly fraction: number }
  | { readonly kind: 'ready'; readonly bytes: number };

const PARSE_ERROR_KEYS: Readonly<Record<TimelineParseReason, TextKey>> = {
  'malformed-json': 'errorMalformedJson',
  'legacy-format': 'errorLegacyFormat',
  'raw-signals-only': 'errorRawSignalsOnly',
  'unsupported-format': 'errorUnsupportedFormat',
  'no-usable-locations': 'errorNoUsableLocations',
};

let allPoints: GeoPoint[] = [];
let semanticPoints: GeoPoint[] = [];
let filteredPoints: GeoPoint[] = [];
let rawSignalPoints: RawSignalPoint[] = [];
let rawSignalProcessing: RawSignalProcessingResult | null = null;
let pendingRawOnlyImport: { data: unknown; source: TimelineSource } | null = null;
let months: MonthOption[] = [];
let prepared: PreparedJourney | null = null;
let selectedSignature = '';
let resultUrl: string | null = null;
let resultFile: File | null = null;
let currentExportId: string | null = null;
let paymentPollController: AbortController | null = null;
let isPaymentPending = false;
let previewAnimation = 0;
let previewLoopActive = false;
let previewElapsedSeconds = 0;
let previewScrubbing = false;
const PREVIEW_SCRUBBER_STEPS = 1000;
let previewSessionJourney: PreparedJourney | null = null;
let previewJourneyDuration = 8;
let hasEncoder = false;
let formatSupport: VideoFormatSupport | null = null;
let compatibilityChecked = false;
let isExporting = false;
let isPreparing = false;
let exportController: AbortController | null = null;
let lastPreviewFrame: TimelineFrame | null = null;
let previewSizeDirty = false;
let resizeTimer = 0;
let pixelRatioQuery: MediaQueryList | null = null;
let errorState: MessageState | null = null;
let settingsErrorKey: TextKey | null = null;
let compatibilityKey: TextKey = 'compatibilityChecking';
let fileStatusState: FileStatusState = { kind: 'key', key: 'fileStatusEmpty' };
let progressState: ProgressState = { kind: 'key', key: 'progressReady' };

/** Dragging a desktop window fires resize continuously, and every applied size clears the bitmap. */
const PREVIEW_RESIZE_DEBOUNCE_MS = 150;

function messageText(state: MessageState): string {
  return state.kind === 'key' ? i18n.t(state.key) : state.text;
}

/**
 * Errors that carry a catalog code are translated; a TimelineParseError is mapped by its
 * reason so timeline.ts can keep its English developer message; anything else falls back to
 * the Error message, which is what the app showed before the catalog existed.
 */
function describeError(error: unknown, fallback: TextKey): MessageState {
  if (error instanceof TimelineParseError) return { kind: 'key', key: PARSE_ERROR_KEYS[error.reason] };
  if (error instanceof AppError) return { kind: 'key', key: error.code };
  if (error instanceof Error) return { kind: 'text', text: error.message };
  return { kind: 'key', key: fallback };
}

function renderErrorMessage(): void {
  errorMessage.textContent = errorState === null ? '' : messageText(errorState);
  errorMessage.classList.toggle('hidden', errorState === null);
}

function setError(state: MessageState | null): void {
  errorState = state;
  renderErrorMessage();
}

function renderSettingsError(): void {
  settingsError.textContent = settingsErrorKey === null ? '' : i18n.t(settingsErrorKey);
  settingsError.classList.toggle('hidden', settingsErrorKey === null);
}

function setSettingsError(key: TextKey | null): void {
  settingsErrorKey = key;
  renderSettingsError();
}

function renderCompatibilityStatus(): void {
  compatibilityStatus.textContent = i18n.t(compatibilityKey);
}

function monthLabel(key: string): string {
  return months.find((month) => month.key === key)?.label ?? key;
}

function sourceLabel(source: TimelineSource): string {
  return source.sample ? i18n.t('sampleSourceName') : source.name;
}

function renderFileStatus(): void {
  const state = fileStatusState;
  if (state.kind === 'loaded') {
    fileStatus.classList.add('hidden');
    renderTimelineSummary();
    return;
  }
  fileStatus.classList.remove('hidden');
  timelineSummaryCard.classList.add('hidden');
  if (state.kind === 'key') {
    fileStatus.textContent = i18n.t(state.key);
    return;
  }
  if (state.kind === 'reading') {
    fileStatus.textContent = i18n.t('fileStatusReading', { name: state.name });
    return;
  }
}

function renderTimelineSummary(): void {
  const state = fileStatusState;
  if (state.kind !== 'loaded') {
    timelineSummaryCard.classList.add('hidden');
    return;
  }
  timelineSummaryCard.classList.remove('hidden');
  timelineSummarySource.textContent = sourceLabel(state.source);
  timelineSummaryMeta.textContent = i18n.t('timelineSummaryMeta', {
    count: state.count,
    start: monthLabel(state.firstMonthKey),
    end: monthLabel(state.lastMonthKey),
  });
  const selectionText = selectionSummary.textContent.trim();
  if (selectionText) {
    timelineSummarySelection.textContent = selectionText;
    timelineSummarySelection.classList.remove('hidden');
  } else {
    timelineSummarySelection.classList.add('hidden');
  }
  const warnings = i18n.join(
    state.rawFallback ? i18n.t('fileStatusRawFallback') : '',
    state.timezoneMissing ? i18n.t('fileStatusTimezoneMissing') : '',
  );
  if (warnings) {
    timelineSummaryWarnings.textContent = warnings;
    timelineSummaryWarnings.classList.remove('hidden');
  } else {
    timelineSummaryWarnings.classList.add('hidden');
  }
}

function isTimelineLoaded(): boolean {
  return fileStatusState.kind === 'loaded';
}

function updateToolWorkflow(): void {
  const loaded = isTimelineLoaded();
  document.body.classList.toggle('timeline-loaded', loaded);
  introCard.classList.toggle('hidden', loaded);
  showLandingButton.classList.toggle('hidden', !loaded);
  toolActionBar.classList.toggle('hidden', !loaded || settingsCard.classList.contains('hidden'));
  if (!loaded) {
    document.body.classList.remove('landing-expanded');
  }
  renderPreviewPlaceholder();
  syncStickyActionButtons();
}

type ViewportState = 'demo' | 'ready' | 'live' | 'busy' | 'result';

function hasPreviewFrame(): boolean {
  return previewSessionJourney !== null || (prepared !== null && lastPreviewFrame !== null);
}

function currentViewportState(): ViewportState {
  if (!resultVideo.classList.contains('hidden')) return 'result';
  if (isExporting || isPreparing) return 'busy';
  if (hasPreviewFrame()) return 'live';
  if (isTimelineLoaded()) return 'ready';
  return 'demo';
}

function syncDemoVideoPlayback(state: ViewportState): void {
  if (state !== 'demo') {
    previewDemoVideo.pause();
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    previewDemoVideo.pause();
    return;
  }
  void previewDemoVideo.play().catch(() => undefined);
}

function renderPreviewHeading(state: ViewportState): void {
  previewHeading.textContent = state === 'result' ? i18n.t('resultTitle') : i18n.t('previewTitle');
  previewHeading.dataset.i18n = state === 'result' ? 'resultTitle' : 'previewTitle';
}

function renderBusyOverlay(state: ViewportState): void {
  if (state !== 'busy') return;
  const prog = progressState;
  if (prog.kind === 'preparing') {
    previewBusyLabel.textContent = i18n.t('progressPreparingMapCount', {
      completed: prog.completed,
      total: prog.total,
    });
    progress.classList.add('hidden');
  } else if (prog.kind === 'creating') {
    previewBusyLabel.textContent = i18n.t('progressCreatingPercent', {
      percent: i18n.formatPercent(prog.fraction),
    });
    progress.classList.remove('hidden');
    progress.value = prog.fraction;
  } else if (prog.kind === 'key' && prog.key === 'progressCancelling') {
    previewBusyLabel.textContent = i18n.t('progressCancelling');
    progress.classList.add('hidden');
  } else if (isExporting) {
    previewBusyLabel.textContent = i18n.t('progressCreating');
    progress.classList.remove('hidden');
  } else {
    previewBusyLabel.textContent = i18n.t('progressPreparingMap');
    progress.classList.add('hidden');
  }
  cancelButton.classList.toggle('hidden', !isExporting);
}

function renderPreviewPlaceholder(): void {
  const state = currentViewportState();
  if (state !== 'ready') return;
  previewPlaceholder.textContent = mapConsent.checked
    ? i18n.t('previewPlaceholderLoaded')
    : i18n.t('previewPlaceholderConsent');
  previewPlaceholderCta.classList.remove('hidden');
  previewPlaceholderCta.disabled = isExporting || isPreparing;
}

function syncStickyActionButtons(): void {
  stickyPreviewButton.disabled = previewButton.disabled;
  stickyCreateButton.disabled = createButton.disabled;
  if (createButton.title) {
    stickyCreateButton.title = createButton.title;
  } else {
    stickyCreateButton.removeAttribute('title');
  }
}

function setFileStatus(state: FileStatusState): void {
  fileStatusState = state;
  renderFileStatus();
  updateToolWorkflow();
}

function renderProgressLabel(): void {
  const state = progressState;
  switch (state.kind) {
    case 'key':
      progressLabel.textContent = i18n.t(state.key);
      break;
    case 'preparing':
      progressLabel.textContent = i18n.t('progressPreparingMapCount', {
        completed: state.completed,
        total: state.total,
      });
      break;
    case 'creating':
      progressLabel.textContent = i18n.t('progressCreatingPercent', {
        percent: i18n.formatPercent(state.fraction),
      });
      break;
    case 'ready':
      progressLabel.textContent = i18n.t('progressVideoReady', {
        size: i18n.formatNumber(state.bytes / 1_000_000, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      });
  }
  if (currentViewportState() === 'busy') renderBusyOverlay('busy');
}

function setProgress(state: ProgressState): void {
  progressState = state;
  renderProgressLabel();
}

function populateMonths(select: HTMLSelectElement, options: MonthOption[]): void {
  select.replaceChildren(...options.map(({ key, label }) => new Option(label, key)));
}

function rebuildRawSignalProcessing(): boolean {
  const trimmed = rawAccuracyLimit.value.trim();
  const limit = trimmed === '' ? null : Number(trimmed);
  if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
    rawSignalProcessing = null;
    setSettingsError('errorAccuracyLimit');
    rawAccuracyLimit.focus();
    return false;
  }
  rawSignalProcessing = processRawSignals(rawSignalPoints, limit);
  return true;
}

function currentFilterMode(): LocationFilterMode {
  return locationFilterSelect.value === 'off' ? 'off' : 'conservative';
}

function rebuildFilteredPoints(): void {
  filteredPoints = filterLocationOutliers(semanticPoints, currentFilterMode()).points;
}

function selectSemanticRange(source: GeoPoint[]): GeoPoint[] {
  return selectTimelineModePoints(false, [], source, {
    exactDates: exactDateToggle.checked,
    startMonth: startSelect.value,
    endMonth: endSelect.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
  });
}

function currentPoints(): GeoPoint[] {
  if (rawSignalsToggle.checked) {
    if (!rebuildRawSignalProcessing()) return [];
    return selectTimelineModePoints(true, rawSignalProcessing?.points ?? [], filteredPoints, {
      exactDates: exactDateToggle.checked,
      startMonth: startSelect.value,
      endMonth: endSelect.value,
      startDate: startDateInput.value,
      endDate: endDateInput.value,
    });
  }
  return selectSemanticRange(filteredPoints);
}

function formatInputDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return i18n.formatMediumDate(new Date(year, month - 1, day));
}

function currentPeriodLabel(): string {
  if (rawSignalsToggle.checked) return i18n.t('periodRawLocationData');
  if (exactDateToggle.checked) {
    const start = formatInputDate(startDateInput.value);
    const end = formatInputDate(endDateInput.value);
    return startDateInput.value === endDateInput.value ? start : i18n.t('periodRange', { start, end });
  }
  const start = monthLabel(startSelect.value);
  const end = monthLabel(endSelect.value);
  return startSelect.value === endSelect.value ? start : i18n.t('periodRange', { start, end });
}

/** The renderer holds no copy, so the title fallback is resolved here against the catalog. */
function overlayText(): OverlayText {
  const unit = currentDistanceUnit();
  const exportI18n = i18n;
  return {
    title: titleInput.value.trim() || i18n.t('defaultVideoTitle'),
    periodLabel: currentPeriodLabel(),
    separator: i18n.strings.listSeparator,
    formatDistance: (kilometers) => exportI18n.formatDistance(kilometers, unit),
  };
}

function baseFormat(): VideoFormat {
  return videoFormatByKey(formatSelect.value) ?? VIDEO_FORMATS[0];
}

function selectedFrameRate(format = baseFormat()): VideoFrameRate {
  if (frameRateSelect.value === 'recommended') return format.frameRate as VideoFrameRate;
  const value = Number(frameRateSelect.value);
  return VIDEO_FRAME_RATES.includes(value as VideoFrameRate) ? value as VideoFrameRate : 24;
}

function currentFormat(): VideoFormat {
  const format = baseFormat();
  return videoFormatAtFrameRate(format, selectedFrameRate(format));
}

function renderFrameRateOptions(): void {
  const recommended = frameRateSelect.querySelector<HTMLOptionElement>('option[value="recommended"]');
  if (recommended) {
    recommended.textContent = i18n.t('frameRateRecommended', { fps: baseFormat().frameRate });
  }
  VIDEO_FRAME_RATES.forEach((fps) => {
    const option = frameRateSelect.querySelector<HTMLOptionElement>(`option[value="${fps}"]`);
    if (option) option.textContent = i18n.t('frameRateValue', { fps });
  });
}

function currentAppearance(): RenderAppearance {
  return {
    mapTheme: isMapTheme(mapThemeSelect.value) ? mapThemeSelect.value : 'light',
    routeColor: isRouteColorPreset(routeColorSelect.value) ? routeColorSelect.value : 'classic',
    markerStyle: isMarkerPreset(markerStyleSelect.value) ? markerStyleSelect.value : 'classic',
  };
}

function selectedAspectRatio(): AspectRatioPreset {
  const pressed = aspectChipButtons().find((button) => button.getAttribute('aria-pressed') === 'true');
  const aspect = pressed?.dataset.aspect;
  return aspect === 'square' || aspect === 'landscape' ? aspect : 'portrait';
}

function selectedSquareFormatKey(): VideoFormatKey {
  const key = squareResolutionSelect.value;
  return key === 'standard' || key === 'ultra' ? key : 'high';
}

function updateSquareResolutionVisibility(aspect = selectedAspectRatio()): void {
  squareResolutionField.classList.toggle('hidden', aspect !== 'square');
}

function syncAspectControlsFromFormat(): void {
  const key = baseFormat().key;
  const aspect = aspectRatioOfFormatKey(key);
  aspectChipButtons().forEach((button) => {
    const pressed = button.dataset.aspect === aspect;
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });
  if (aspect === 'square') squareResolutionSelect.value = key;
  updateSquareResolutionVisibility(aspect);
}

function applyAspectSelection(aspect: AspectRatioPreset): void {
  aspectChipButtons().forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.aspect === aspect ? 'true' : 'false');
  });
  updateSquareResolutionVisibility(aspect);
  const nextKey = formatKeyForAspect(aspect, selectedSquareFormatKey());
  if (formatSelect.value !== nextKey) formatSelect.value = nextKey;
}

function previewDurationSeconds(): number {
  return totalDurationSeconds(previewJourneyDuration);
}

function updatePreviewScrubber(elapsedSeconds: number, previewDuration = previewDurationSeconds()): void {
  if (previewScrubbing || previewDuration <= 0) return;
  const fraction = Math.max(0, Math.min(1, elapsedSeconds / previewDuration));
  previewScrubber.value = String(Math.round(fraction * PREVIEW_SCRUBBER_STEPS));
  previewScrubber.setAttribute('aria-valuenow', previewScrubber.value);
  previewScrubber.setAttribute('aria-valuemax', String(PREVIEW_SCRUBBER_STEPS));
}

function seekPreviewTo(elapsedSeconds: number): void {
  const journey = previewSessionJourney ?? prepared;
  if (!journey) return;
  const previewDuration = previewDurationSeconds();
  const clamped = Math.max(0, Math.min(previewDuration, elapsedSeconds));
  previewElapsedSeconds = clamped;
  const animationFrame = frameAtElapsedSeconds(clamped, previewJourneyDuration);
  lastPreviewFrame = animationFrame;
  drawPreviewFrame(journey, animationFrame);
  updatePreviewScrubber(clamped, previewDuration);
  setProgress({
    kind: 'key',
    key: clamped >= previewDuration ? 'progressPreviewComplete' : 'progressPreviewing',
  });
  updatePreviewControlButtons();
}

function drawPreviewFrame(journey: PreparedJourney, frame: TimelineFrame): void {
  drawFrame(canvas, journey, frame, overlayText(), currentAppearance());
}

function updatePreviewControlButtons(): void {
  const canControl = currentViewportState() === 'live';
  previewPlayButton.classList.toggle('hidden', !canControl || previewLoopActive);
  previewPauseButton.classList.toggle('hidden', !canControl || !previewLoopActive);
}

function updatePreviewChrome(): void {
  const state = currentViewportState();
  previewStage.dataset.viewport = state;
  renderPreviewHeading(state);

  previewDemoVideo.classList.toggle('hidden', state !== 'demo');
  previewEmptyState.classList.toggle('hidden', state !== 'ready');
  previewBusyOverlay.classList.toggle('hidden', state !== 'busy');

  const showCanvas = state === 'live' || (state === 'busy' && hasPreviewFrame());
  canvas.classList.toggle('hidden', !showCanvas);
  resultVideo.classList.toggle('hidden', state !== 'result');
  previewControls.classList.toggle('hidden', state !== 'live');
  resultActions.classList.toggle('hidden', state !== 'result');

  if (state === 'busy') renderBusyOverlay(state);
  syncDemoVideoPlayback(state);
  updatePreviewControlButtons();
  renderPreviewPlaceholder();
}

function stopPaymentPolling(): void {
  paymentPollController?.abort();
  paymentPollController = null;
  isPaymentPending = false;
}

function renderPaymentStatus(message: string | null): void {
  paymentStatus.textContent = message ?? '';
  paymentStatus.classList.toggle('hidden', message === null);
}

function triggerFileDownload(): void {
  if (!resultUrl) return;
  const link = document.createElement('a');
  link.href = resultUrl;
  link.download = 'timeline-journey.mp4';
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

function updateResultActions(): void {
  const unlocked = isDownloadUnlocked(currentExportId);
  if (isPaymentEnabled() && !unlocked) {
    downloadButton.textContent = i18n.t('payToDownloadButton', { price: paymentPriceLabel() });
    downloadButton.dataset.i18n = 'payToDownloadButton';
    shareButton.disabled = true;
  } else {
    downloadButton.textContent = i18n.t('downloadButton');
    downloadButton.dataset.i18n = 'downloadButton';
    shareButton.disabled = false;
  }
  downloadButton.disabled = isPaymentPending;
  const shareData = resultFile ? { files: [resultFile] } : null;
  const canShare = shareData !== null
    && typeof navigator.share === 'function'
    && (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));
  shareButton.hidden = !canShare;
}

async function unlockAfterPayment(sessionId: string, exportId: string): Promise<void> {
  markDownloadUnlocked(exportId, sessionId);
  stopPaymentPolling();
  renderPaymentStatus(i18n.t('paymentComplete'));
  updateResultActions();
}

type PaymentFlowOptions = {
  /** After a successful checkout, trigger file download. Default: true for the download button. */
  downloadAfterUnlock?: boolean;
};

async function startPaymentFlow(options: PaymentFlowOptions = {}): Promise<boolean> {
  const downloadAfterUnlock = options.downloadAfterUnlock ?? true;
  if (!currentExportId || !resultFile) return false;
  if (isDownloadUnlocked(currentExportId)) {
    if (downloadAfterUnlock) triggerFileDownload();
    return true;
  }
  if (!isPaymentEnabled()) {
    if (downloadAfterUnlock) triggerFileDownload();
    return true;
  }
  if (isPaymentPending) return false;

  stopPaymentPolling();
  isPaymentPending = true;
  renderPaymentStatus(i18n.t('paymentPending'));
  updateResultActions();

  // Must open the popup before any await — otherwise the browser may open checkout
  // in a new window but return null, triggering a full-page redirect as well.
  const popup = openCheckoutPopup();

  try {
    const session = await createCheckoutSession(currentExportId, activeLocale(languagePreference, browserLanguages()));
    if (!popup || popup.closed) {
      window.location.assign(session.checkoutUrl);
      return false;
    }
    loadCheckoutInPopup(popup, session.checkoutUrl);

    paymentPollController = new AbortController();
    const popupClosedTimer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(popupClosedTimer);
        paymentPollController?.abort();
      }
    }, 500);
    try {
      const paid = await pollPaymentStatus(session.sessionId, paymentPollController.signal);
      if (paid) {
        await unlockAfterPayment(session.sessionId, session.exportId);
        if (downloadAfterUnlock) triggerFileDownload();
        return true;
      }
      renderPaymentStatus(null);
      return false;
    } finally {
      window.clearInterval(popupClosedTimer);
    }
  } catch (error) {
    popup?.close();
    if (error instanceof DOMException && error.name === 'AbortError') {
      renderPaymentStatus(null);
    } else if (error instanceof Error && error.message.includes('not configured')) {
      setError({ kind: 'key', key: 'paymentNotConfigured' });
      renderPaymentStatus(null);
    } else {
      setError({ kind: 'key', key: 'paymentFailed' });
      renderPaymentStatus(null);
    }
    return false;
  } finally {
    isPaymentPending = false;
    updateResultActions();
  }
}

async function resumePaymentFromReturn(): Promise<void> {
  const exportId = paymentReturnExportId();
  if (!exportId) return;
  clearPaymentReturnParams();

  if (currentExportId && exportId !== currentExportId) return;

  const sessionId = readStoredPaymentSession();
  if (!sessionId) return;

  isPaymentPending = true;
  renderPaymentStatus(i18n.t('paymentPending'));
  updateResultActions();
  try {
    if (await pollPaymentStatus(sessionId, AbortSignal.timeout(15000))) {
      await unlockAfterPayment(sessionId, exportId);
    }
  } finally {
    isPaymentPending = false;
    updateResultActions();
  }
}

function backToPreview(): void {
  resultVideo.pause();
  resultVideo.classList.add('hidden');
  resultActions.classList.add('hidden');
  stopPaymentPolling();
  renderPaymentStatus(null);
  if (prepared && lastPreviewFrame) {
    previewSessionJourney = prepared;
    drawPreviewFrame(prepared, lastPreviewFrame);
    setProgress({
      kind: 'key',
      key: previewLoopActive ? 'progressPreviewing' : 'progressPreviewComplete',
    });
  } else {
    setProgress({ kind: 'key', key: 'progressReady' });
  }
  updatePreviewChrome();
}

function stopPreviewLoop(): void {
  cancelAnimationFrame(previewAnimation);
  previewAnimation = 0;
  previewLoopActive = false;
  updatePreviewControlButtons();
}

function stopPreview(): void {
  stopPreviewLoop();
  previewElapsedSeconds = 0;
  previewScrubbing = false;
  previewSessionJourney = null;
  previewSizeDirty = false;
  previewScrubber.value = '0';
  previewScrubber.setAttribute('aria-valuenow', '0');
  updatePreviewChrome();
}

/** Assigning canvas.width clears the bitmap, so every caller must stop the preview loop first. */
function setCanvasSize(size: RenderSize): boolean {
  if (canvas.width === size.width && canvas.height === size.height) return false;
  canvas.width = size.width;
  canvas.height = size.height;
  return true;
}

/** The CSS box follows the selected format whatever the backing store holds. */
function applyPreviewAspect(): void {
  const format = currentFormat();
  canvas.style.setProperty('--preview-aspect', String(format.width / format.height));
}

/**
 * The canvas is laid out by min(100%, --preview-max-height * --preview-aspect), so its own
 * border box is the only correct measurement: the card is much wider than a portrait preview.
 * getBoundingClientRect flushes layout, so the value is final in the same task the card is
 * shown. A hidden card measures 0, which previewCanvasSize turns into the exact format size.
 */
function applyPreviewCanvasSize(): boolean {
  const format = currentFormat();
  return setCanvasSize(previewCanvasSize(
    { width: format.width, height: format.height },
    canvas.getBoundingClientRect().width,
    window.devicePixelRatio,
  ));
}

/**
 * Idempotent. Restores the exact format size, which createJourneyMp4 requires and CanvasSource
 * captures. Called at startup, on a format change, and immediately before every export.
 */
function applyVideoFormat(): void {
  const format = currentFormat();
  applyPreviewAspect();
  if (setCanvasSize({ width: format.width, height: format.height })) {
    setProgress({ kind: 'key', key: 'progressReady' });
    progress.classList.add('hidden');
    progress.value = 0;
  }
}

function onViewportChange(): void {
  if (isExporting) return;
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(applyPreviewResize, PREVIEW_RESIZE_DEBOUNCE_MS);
}

/**
 * The preview follows the display, so a window resize, a browser zoom or a move to another
 * screen has to be re-measured. Exports are exempt: createJourneyMp4 awaits the encoder between
 * drawing a frame and submitting it, and clearing the bitmap in that window would submit a
 * blank frame, while the encoder cannot change frame size mid sequence anyway.
 */
function applyPreviewResize(): void {
  resizeTimer = 0;
  if (isExporting || isPreparing) return; // preparing re-measures after its own await
  if (previewLoopActive) {
    previewSizeDirty = true; // the next tick resizes and redraws in one rAF callback
    return;
  }
  if (!prepared || !lastPreviewFrame) return;
  if (!applyPreviewCanvasSize()) return;
  drawPreviewFrame(prepared, lastPreviewFrame);
}

/** devicePixelRatio changes silently when the window moves to another monitor. */
function watchPixelRatio(): void {
  pixelRatioQuery?.removeEventListener('change', onPixelRatioChange);
  pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  pixelRatioQuery.addEventListener('change', onPixelRatioChange, { once: true });
}

function onPixelRatioChange(): void {
  watchPixelRatio(); // re-arm against the new ratio
  onViewportChange();
}

function isFormatSupported(format: VideoFormat): boolean {
  return formatSupport !== null && resolveVideoFormat(format, formatSupport) !== null;
}

/**
 * The select is disabled while the map is prepared or a video is encoded, so the reason has
 * to be visible text rather than a title attribute, which VoiceOver skips on disabled controls.
 */
function updateFormatWarning(format: VideoFormat, supported: boolean): void {
  const locked = isExporting || isPreparing;
  const unsupported = !locked && formatSupport !== null && !supported;
  let message: string | null = null;
  if (isExporting) message = i18n.t('warnFormatLockedExporting');
  else if (isPreparing) message = i18n.t('warnFormatLockedPreparing');
  else if (unsupported) {
    message = i18n.t('errorFormatUnsupported', {
      width: format.width,
      height: format.height,
      fps: format.frameRate,
    });
  }
  formatWarning.textContent = message ?? '';
  formatWarning.classList.toggle('hidden', message === null);
  formatWarning.classList.toggle('error', unsupported);
  formatSelect.setAttribute('aria-invalid', unsupported ? 'true' : 'false');
  frameRateSelect.setAttribute('aria-invalid', unsupported ? 'true' : 'false');
}

/**
 * Switching language while the map is being prepared or a video is being encoded would relabel
 * a run already in progress, and the overlay of that video was frozen when it started, so the
 * two would disagree. Same reasoning as the format select: the reason is visible text rather
 * than a title attribute, which VoiceOver skips on a disabled control.
 */
function updateLanguageAvailability(): void {
  languageSelect.disabled = isExporting || isPreparing;
  let message: string | null = null;
  if (isExporting) message = i18n.t('languageLockedExporting');
  else if (isPreparing) message = i18n.t('languageLockedPreparing');
  languageWarning.textContent = message ?? '';
  languageWarning.classList.toggle('hidden', message === null);
}

// The format is baked into the prepared journey: camera aspect, per-frame tile zoom,
// the overview safe area and the downloaded tiles all depend on it, so it has to be part
// of the cache key rather than of a single call path that a later change could drop.
// Since drawFrame checks only the aspect ratio, this is the sole guarantee that an export
// receives a journey prepared at the format size. Dropping the format from the key, or adding
// the preview size to it, would silently encode a video from too low a tile zoom.
// The language is deliberately absent: it changes no pixel of the map, and including it would
// throw away every downloaded tile and re-request them from CARTO on every switch.
function currentRangeSignature(): string {
  const format = `:format:${currentFormat().key}`;
  if (rawSignalsToggle.checked) return `raw:${rawAccuracyLimit.value.trim()}${format}`;
  const filter = `:filter:${currentFilterMode()}`;
  return exactDateToggle.checked
    ? `dates:${startDateInput.value}:${endDateInput.value}${filter}${format}`
    : `months:${startSelect.value}:${endSelect.value}${filter}${format}`;
}

function selectedDistanceKm(points: GeoPoint[]): number {
  return cumulativeDistances(points).at(-1) ?? 0;
}

function renderActionHint(hasJourney: boolean, formatSupported: boolean): void {
  if (isExporting || isPreparing) {
    actionHint.classList.add('hidden');
    return;
  }
  const format = currentFormat();
  let message: string | null = null;
  if (!compatibilityChecked) {
    message = i18n.t('hintCheckingSupport');
  } else if (!hasEncoder) {
    message = i18n.t('hintNoEncoder');
  } else if (!formatSupported) {
    message = i18n.t('hintFormatUnsupported', {
      width: format.width,
      height: format.height,
      fps: format.frameRate,
    });
  } else if (!hasJourney) {
    message = i18n.t('hintSelectWiderPeriod');
  } else if (isTimelineLoaded() && !mapConsent.checked) {
    message = i18n.t('hintMapConsentRequired');
  }
  actionHint.textContent = message ?? '';
  actionHint.classList.toggle('hidden', message === null);
}

function refreshActionAvailability(points = currentPoints()): void {
  const hasJourney = points.length >= 2 && selectedDistanceKm(points) > 0;
  const format = currentFormat();
  const formatSupported = isFormatSupported(format);
  const needsConsent = isTimelineLoaded() && !mapConsent.checked;
  // Preview never depends on encoder support: an unencodable format is still previewable.
  previewButton.disabled = isExporting || isPreparing || !hasJourney || needsConsent;
  createButton.disabled = isExporting || isPreparing || !hasJourney || !formatSupported
    || !compatibilityChecked || !hasEncoder || needsConsent;
  formatSelect.disabled = isExporting || isPreparing;
  frameRateSelect.disabled = isExporting || isPreparing;
  squareResolutionSelect.disabled = isExporting || isPreparing;
  aspectChipButtons().forEach((button) => {
    button.disabled = isExporting || isPreparing;
  });
  if (!compatibilityChecked) {
    createButton.title = i18n.t('hintCheckingSupport');
  } else if (!hasEncoder) {
    createButton.title = i18n.t('hintNoEncoder');
  } else if (!formatSupported) {
    createButton.title = i18n.t('hintFormatUnsupported', {
      width: format.width,
      height: format.height,
      fps: format.frameRate,
    });
  } else if (!hasJourney) {
    createButton.title = i18n.t('hintSelectWiderPeriod');
  } else if (needsConsent) {
    createButton.title = i18n.t('hintMapConsentRequired');
  } else {
    createButton.removeAttribute('title');
  }
  updateFormatWarning(format, formatSupported);
  updateLanguageAvailability();
  syncStickyActionButtons();
  renderActionHint(hasJourney, formatSupported);
  if (isTimelineLoaded()) renderPreviewPlaceholder();
}

/**
 * Rebuilds every derived line of the settings card from the current state. Kept apart from
 * updateSelection because a language switch has to redraw this text without discarding the
 * prepared journey and the map tiles that came with it.
 */
function renderSelection(): void {
  const points = currentPoints();
  const showRawRange = rawSignalsToggle.checked && rawSignalProcessing !== null;
  rawDateRange.textContent = showRawRange ? formatRawDateRange(points, i18n) : '';
  rawDateRange.classList.toggle('hidden', !showRawRange);
  const distanceKm = selectedDistanceKm(points);
  const outliersIgnored = rawSignalsToggle.checked
    ? 0
    : Math.max(0, selectSemanticRange(semanticPoints).length - points.length);
  const outlierNote = outliersIgnored > 0
    ? i18n.t('summaryOutliersIgnored', { count: outliersIgnored })
    : '';
  if (points.length === 0) {
    selectionSummary.textContent = i18n.join(i18n.t('summaryNoLocations'), outlierNote);
  } else if (points.length === 1) {
    selectionSummary.textContent = i18n.join(i18n.t('summaryOneLocation'), outlierNote);
  } else if (distanceKm <= 0) {
    selectionSummary.textContent = i18n.join(
      i18n.t('summaryNoMovement', { count: points.length }),
      outlierNote,
    );
  } else {
    // Two whole messages rather than an 'About ' / 'Estimated ' prefix glued to a number: the
    // hedge moves or inflects in several of the nine locales and cannot survive as a fragment.
    const rejected = rawSignalsToggle.checked && rawSignalProcessing?.rejectedCount
      ? i18n.t('summaryRawRejected', { count: rawSignalProcessing.rejectedCount })
      : '';
    selectionSummary.textContent = i18n.join(
      i18n.t(rawSignalsToggle.checked ? 'summaryDistanceEstimated' : 'summaryDistanceAbout', {
        count: points.length,
        distance: i18n.formatDistance(distanceKm, currentDistanceUnit()),
      }),
      rejected,
      outlierNote,
    );
  }
  refreshActionAvailability(points);
  if (isTimelineLoaded()) renderTimelineSummary();
}

function updateSelection(): void {
  stopPreview();
  setSettingsError(null);
  if (!rawSignalsToggle.checked && exactDateToggle.checked) {
    if (startDateInput.value > endDateInput.value) endDateInput.value = startDateInput.value;
  } else if (!rawSignalsToggle.checked && startSelect.value > endSelect.value) {
    endSelect.value = startSelect.value;
  }
  prepared = null;
  lastPreviewFrame = null;
  selectedSignature = '';
  renderSelection();
}

async function getPreparedJourney(signal?: AbortSignal): Promise<PreparedJourney> {
  const cameraMovement = cameraMovementSelect.value as CameraMovement;
  const durationSeconds = Number(durationSelect.value);
  const format = currentFormat();
  const mapTheme = currentAppearance().mapTheme;
  const signature = `${currentRangeSignature()}:camera:${cameraMovement}:duration:${durationSeconds}:map:${mapTheme}`;
  if (prepared && signature === selectedSignature) return prepared;
  if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');
  setProgress({ kind: 'key', key: 'progressPreparingMap' });
  const nextJourney = await prepareJourney(
    currentPoints(),
    { width: format.width, height: format.height },
    cameraMovement,
    durationSeconds,
    mapTheme,
    signal,
    (completed, total) => {
      setProgress({ kind: 'preparing', completed, total });
    },
  );
  if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');
  prepared = nextJourney;
  selectedSignature = signature;
  return nextJourney;
}

function requireMapConsent(): boolean {
  if (mapConsent.checked) return true;
  setSettingsError('errorMapConsent');
  mapConsent.focus();
  return false;
}

function syncHeaderLanguageButtons(): void {
  const active = i18n.locale;
  for (const button of document.querySelectorAll<HTMLButtonElement>('.site-lang-btn[data-lang-pref]')) {
    const pref = button.dataset.langPref;
    const isActive = pref === active;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.classList.toggle('site-lang-btn--active', isActive);
  }
}

function initHeaderLanguageSwitch(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.site-lang-btn[data-lang-pref]')) {
    button.addEventListener('click', () => {
      const pref = button.dataset.langPref;
      if (pref === undefined || !isLanguagePreference(pref)) return;
      languageSelect.value = pref;
      onLanguageChange();
    });
  }
}

/**
 * Re-applies the whole catalog to the document and repaints every message that was derived
 * rather than authored in the HTML. applyStrings resets those nodes to their catalog defaults,
 * so the state-backed lines have to be rendered after it, not before.
 */
function renderLocalizedText(): void {
  applyStrings(document, i18n);
  syncDocumentLang(i18n);
  syncHeaderLanguageButtons();
  renderDistanceUnitOptions();
  renderFrameRateOptions();
  renderCompatibilityStatus();
  renderFileStatus();
  renderProgressLabel();
  renderErrorMessage();
  renderSettingsError();
  updateLanguageAvailability();
  renderTimelineSummary();
  renderPreviewHeading(currentViewportState());
  updatePreviewChrome();
}

function renderDistanceUnitOptions(): void {
  const automaticOption = distanceUnitSelect.querySelector<HTMLOptionElement>('option[value="automatic"]');
  if (!automaticOption) throw new Error('Missing automatic distance unit option');
  const resolvedKey = currentDistanceUnit() === 'miles' ? 'distanceUnitMiles' : 'distanceUnitKilometers';
  automaticOption.textContent = i18n.t('distanceUnitAutomaticResolved', {
    automatic: i18n.t('distanceUnitAutomatic'),
    resolved: i18n.t(resolvedKey),
  });
}

function onDistanceUnitChange(): void {
  const value = distanceUnitSelect.value;
  if (!isDistanceUnitPreference(value)) return;
  distanceUnitPreference = value;
  writeDistanceUnitPreference(distanceUnitPreference);
  stopPreviewLoop();
  if (!settingsCard.classList.contains('hidden')) renderSelection();
  if (prepared && lastPreviewFrame) {
    drawPreviewFrame(prepared, lastPreviewFrame);
  }
}

/**
 * Re-renders in place rather than reloading. A reload would lose the picked File, which cannot
 * be restored without a second trip through the Files app, revoke the object URL of a finished
 * but not yet downloaded MP4, and throw away the prepared journey along with every map tile it
 * downloaded, which means another round of requests to CARTO.
 */
function onLanguageChange(): void {
  const value = languageSelect.value;
  if (!isLanguagePreference(value)) return;
  languagePreference = value;
  writeLanguagePreference(languagePreference); // a failed write never blocks the switch
  i18n = buildI18n(languagePreference);
  renderLocalizedText();
  // A running preview would draw consecutive frames in two languages. The last frame is
  // repainted once in the new language instead; restarting the animation was never asked for.
  stopPreviewLoop();
  if (months.length > 0) {
    // Month keys are locale independent 'YYYY-MM', so restoring the selection is exact.
    const start = startSelect.value;
    const end = endSelect.value;
    months = availableMonths(allPoints, i18n.formatLocale);
    populateMonths(startSelect, months);
    populateMonths(endSelect, months);
    startSelect.value = start;
    endSelect.value = end;
    renderFileStatus(); // the month labels inside it have just changed
  }
  if (!settingsCard.classList.contains('hidden')) renderSelection();
  if (prepared && lastPreviewFrame) {
    drawPreviewFrame(prepared, lastPreviewFrame);
  }
}

function parseTimelineText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TimelineParseError('malformed-json', 'This is not a valid or complete JSON file.');
  }
}

function applyTimeline(data: unknown, source: TimelineSource, useRawOnly = false): void {
  rawSignalPoints = parseRawSignalsJson(data);
  rawSignalProcessing = processRawSignals(rawSignalPoints, Number(rawAccuracyLimit.value));
  semanticPoints = useRawOnly ? [] : parseTimelineJson(data);
  rebuildFilteredPoints();
  allPoints = useRawOnly ? rawSignalProcessing.points : semanticPoints;
  if (allPoints.length === 0) {
    throw new TimelineParseError('no-usable-locations', 'This Timeline export contains no usable location points.');
  }
  months = availableMonths(allPoints, i18n.formatLocale);
  populateMonths(startSelect, months);
  populateMonths(endSelect, months);
  startSelect.value = months[0].key;
  endSelect.value = months.at(-1)?.key ?? months[0].key;
  const dateKeys = allPoints.map(pointDateKey).sort();
  const firstDate = dateKeys[0] ?? localDateKey(allPoints[0].instant);
  const lastDate = dateKeys.at(-1) ?? firstDate;
  startDateInput.min = firstDate;
  startDateInput.max = lastDate;
  endDateInput.min = firstDate;
  endDateInput.max = lastDate;
  startDateInput.value = firstDate;
  endDateInput.value = lastDate;
  exactDateToggle.checked = false;
  rawSignalsToggle.checked = useRawOnly;
  rawSignalsRow.classList.toggle('hidden', useRawOnly || rawSignalPoints.length === 0);
  rawSignalsDescription.classList.toggle('hidden', !useRawOnly);
  rawAccuracyField.classList.toggle('hidden', !useRawOnly);
  locationFilterField.classList.toggle('hidden', useRawOnly);
  periodControls.classList.toggle('hidden', useRawOnly);
  monthRangeFields.classList.remove('hidden');
  exactDateFields.classList.add('hidden');
  mapConsent.checked = false;
  settingsCard.classList.remove('hidden');
  setFileStatus({
    kind: 'loaded',
    source,
    count: allPoints.length,
    firstMonthKey: months[0].key,
    lastMonthKey: months.at(-1)?.key ?? months[0].key,
    rawFallback: useRawOnly,
    timezoneMissing: allPoints.some((point) => point.timeZoneMissing),
  });
  renderTimelineSummary();
  updatePreviewChrome();
}

function resetTimeline(): void {
  stopPreview();
  fileInput.value = '';
  allPoints = [];
  semanticPoints = [];
  filteredPoints = [];
  rawSignalPoints = [];
  rawSignalProcessing = null;
  months = [];
  prepared = null;
  lastPreviewFrame = null;
  selectedSignature = '';
  pendingRawOnlyImport = null;
  settingsCard.classList.add('hidden');
  timelineSummaryCard.classList.add('hidden');
  resultActions.classList.add('hidden');
  resultVideo.classList.add('hidden');
  setError(null);
  setSettingsError(null);
  setFileStatus({ kind: 'key', key: 'fileStatusEmpty' });
  updatePreviewChrome();
  updateToolWorkflow();
}

async function loadTimeline(file: File): Promise<void> {
  setError(null);
  setSettingsError(null);
  setFileStatus({ kind: 'reading', name: file.name });
  const source: TimelineSource = { sample: false, name: file.name };
  const data = parseTimelineText(await file.text());
  try {
    applyTimeline(data, source);
  } catch (error) {
    const rawPoints = parseRawSignalsJson(data);
    if (error instanceof TimelineParseError && error.reason === 'raw-signals-only' && rawPoints.length > 0) {
      pendingRawOnlyImport = { data, source };
      setFileStatus({ kind: 'key', key: 'fileStatusRawOnly' });
      rawOnlyDialog.showModal();
      return;
    }
    throw error;
  }
}

async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    await loadTimeline(file);
  } catch (error) {
    settingsCard.classList.add('hidden');
    setFileStatus({ kind: 'key', key: 'fileStatusLoadFailed' });
    setError(describeError(error, 'errorFileUnreadable'));
    previewCard.classList.remove('hidden');
  }
});

sampleButton.addEventListener('click', async () => {
  setError(null);
  setSettingsError(null);
  setFileStatus({ kind: 'key', key: 'fileStatusLoadingSample' });
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}sample-timeline.json`);
    if (!response.ok) {
      throw new AppError('errorSampleUnavailable', 'The fictional sample could not be loaded.');
    }
    applyTimeline(parseTimelineText(await response.text()), { sample: true, name: '' });
  } catch (error) {
    settingsCard.classList.add('hidden');
    setFileStatus({ kind: 'key', key: 'fileStatusSampleFailed' });
    setError(describeError(error, 'errorSampleUnavailable'));
    previewCard.classList.remove('hidden');
  }
});

const dropZone = document.getElementById('drop-zone');
if (dropZone) {
  for (const eventName of ['dragenter', 'dragover'] as const) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('drop-zone-active');
    });
  }
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone-active'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event('change'));
  });
}

startSelect.addEventListener('change', updateSelection);
endSelect.addEventListener('change', updateSelection);
startDateInput.addEventListener('change', updateSelection);
endDateInput.addEventListener('change', updateSelection);
durationSelect.addEventListener('change', updateSelection);
cameraMovementSelect.addEventListener('change', updateSelection);
mapThemeSelect.addEventListener('change', updateSelection);
routeColorSelect.addEventListener('change', () => {
  if (prepared && lastPreviewFrame) {
    drawPreviewFrame(prepared, lastPreviewFrame);
  }
});
markerStyleSelect.addEventListener('change', () => {
  if (prepared && lastPreviewFrame) {
    drawPreviewFrame(prepared, lastPreviewFrame);
  }
});
languageSelect.addEventListener('change', onLanguageChange);
distanceUnitSelect.addEventListener('change', onDistanceUnitChange);
for (const button of aspectChipButtons()) {
  button.addEventListener('click', () => {
    const aspect = button.dataset.aspect;
    if (aspect !== 'portrait' && aspect !== 'square' && aspect !== 'landscape') return;
    if (selectedAspectRatio() === aspect) return;
    stopPreview();
    applyAspectSelection(aspect);
    renderFrameRateOptions();
    applyVideoFormat();
    updateSelection();
  });
}
squareResolutionSelect.addEventListener('change', () => {
  if (selectedAspectRatio() !== 'square') return;
  stopPreview();
  formatSelect.value = selectedSquareFormatKey();
  renderFrameRateOptions();
  applyVideoFormat();
  updateSelection();
});
formatSelect.addEventListener('change', () => {
  stopPreview();
  syncAspectControlsFromFormat();
  renderFrameRateOptions();
  applyVideoFormat();
  updateSelection();
});
frameRateSelect.addEventListener('change', () => {
  stopPreview();
  renderSelection();
});
exactDateToggle.addEventListener('change', () => {
  monthRangeFields.classList.toggle('hidden', exactDateToggle.checked);
  exactDateFields.classList.toggle('hidden', !exactDateToggle.checked);
  updateSelection();
});
rawSignalsToggle.addEventListener('change', () => {
  periodControls.classList.toggle('hidden', rawSignalsToggle.checked);
  rawSignalsDescription.classList.toggle('hidden', !rawSignalsToggle.checked);
  rawAccuracyField.classList.toggle('hidden', !rawSignalsToggle.checked);
  locationFilterField.classList.toggle('hidden', rawSignalsToggle.checked);
  updateSelection();
});
rawAccuracyLimit.addEventListener('input', updateSelection);
locationFilterSelect.addEventListener('change', () => {
  rebuildFilteredPoints();
  updateSelection();
});
mapConsent.addEventListener('change', () => {
  if (mapConsent.checked) setSettingsError(null);
  renderPreviewPlaceholder();
  refreshActionAvailability();
});

changeTimelineButton.addEventListener('click', resetTimeline);

showLandingButton.addEventListener('click', () => {
  document.body.classList.add('landing-expanded');
  document.getElementById('landing-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

stickyPreviewButton.addEventListener('click', () => previewButton.click());
stickyCreateButton.addEventListener('click', () => createButton.click());
previewPlaceholderCta.addEventListener('click', () => previewButton.click());
backToPreviewButton.addEventListener('click', backToPreview);

function runPreviewTick(
  now: number,
  startedAt: number,
  journey: PreparedJourney,
  previewDuration: number,
): void {
  if (previewSizeDirty) {
    previewSizeDirty = false;
    applyPreviewCanvasSize();
  }
  const elapsedSeconds = Math.min(previewDuration, (now - startedAt) / 1000);
  previewElapsedSeconds = elapsedSeconds;
  const fraction = elapsedSeconds / previewDuration;
  const animationFrame = frameAtElapsedSeconds(elapsedSeconds, previewJourneyDuration);
  lastPreviewFrame = animationFrame;
  drawPreviewFrame(journey, animationFrame);
  updatePreviewScrubber(elapsedSeconds, previewDuration);
  setProgress({
    kind: 'key',
    key: fraction < 1 ? 'progressPreviewing' : 'progressPreviewComplete',
  });
  if (fraction < 1 && previewLoopActive) {
    previewAnimation = requestAnimationFrame((t) => runPreviewTick(t, startedAt, journey, previewDuration));
  } else {
    previewAnimation = 0;
    previewLoopActive = false;
    updatePreviewControlButtons();
  }
}

function startPreviewLoop(journey: PreparedJourney, fromElapsed = 0): void {
  previewSessionJourney = journey;
  previewJourneyDuration = Math.min(8, Number(durationSelect.value));
  const previewDuration = totalDurationSeconds(previewJourneyDuration);
  stopPreviewLoop();
  previewSessionJourney = journey;
  previewLoopActive = true;
  previewElapsedSeconds = fromElapsed;
  const startedAt = performance.now() - fromElapsed * 1000;
  previewControls.classList.remove('hidden');
  updatePreviewControlButtons();
  updatePreviewScrubber(fromElapsed, previewDuration);
  previewAnimation = requestAnimationFrame((now) => runPreviewTick(now, startedAt, journey, previewDuration));
}

function pausePreviewLoop(): void {
  if (!previewLoopActive) return;
  stopPreviewLoop();
}

function resumePreviewLoop(): void {
  const journey = previewSessionJourney;
  if (!journey || previewLoopActive) return;
  const previewDuration = totalDurationSeconds(previewJourneyDuration);
  previewLoopActive = true;
  const startedAt = performance.now() - previewElapsedSeconds * 1000;
  updatePreviewControlButtons();
  previewAnimation = requestAnimationFrame((now) => runPreviewTick(
    now,
    startedAt,
    journey,
    previewDuration,
  ));
}

previewPlayButton.addEventListener('click', () => {
  if (!previewSessionJourney) return;
  const previewDuration = totalDurationSeconds(previewJourneyDuration);
  if (previewElapsedSeconds >= previewDuration) {
    startPreviewLoop(previewSessionJourney, 0);
    return;
  }
  resumePreviewLoop();
});

previewPauseButton.addEventListener('click', pausePreviewLoop);

previewReplayButton.addEventListener('click', () => {
  const journey = previewSessionJourney ?? prepared;
  if (!journey) return;
  startPreviewLoop(journey, 0);
});

previewScrubber.addEventListener('pointerdown', () => {
  previewScrubbing = true;
  pausePreviewLoop();
});

previewScrubber.addEventListener('input', () => {
  const previewDuration = previewDurationSeconds();
  const fraction = Number(previewScrubber.value) / PREVIEW_SCRUBBER_STEPS;
  seekPreviewTo(fraction * previewDuration);
});

previewScrubber.addEventListener('pointerup', () => {
  previewScrubbing = false;
});

previewScrubber.addEventListener('change', () => {
  previewScrubbing = false;
});

openGoogleMapsButton.addEventListener('click', () => {
  window.open('https://www.google.com/maps', '_blank', 'noopener');
  pendingRawOnlyImport = null;
  rawOnlyDialog.close();
  settingsCard.classList.add('hidden');
  setFileStatus({ kind: 'key', key: 'fileStatusExportAgain' });
});

continueRawDataButton.addEventListener('click', () => {
  const pending = pendingRawOnlyImport;
  if (!pending) return;
  pendingRawOnlyImport = null;
  rawOnlyDialog.close();
  try {
    applyTimeline(pending.data, pending.source, true);
  } catch (error) {
    settingsCard.classList.add('hidden');
    setFileStatus({ kind: 'key', key: 'fileStatusLoadFailed' });
    setError(describeError(error, 'errorFileUnreadable'));
    previewCard.classList.remove('hidden');
  }
});

rawOnlyDialog.addEventListener('cancel', () => {
  pendingRawOnlyImport = null;
  settingsCard.classList.add('hidden');
  setFileStatus({ kind: 'key', key: 'fileStatusRawImportCancelled' });
});

previewButton.addEventListener('click', async () => {
  if (!requireMapConsent()) return;
  stopPreviewLoop();
  previewSessionJourney = null;
  applyPreviewAspect();
  setError(null);
  resultActions.classList.add('hidden');
  resultVideo.classList.add('hidden');
  updatePreviewChrome();
  isPreparing = true;
  refreshActionAvailability();
  updatePreviewChrome();
  try {
    const journey = await getPreparedJourney();
    applyPreviewCanvasSize();
    previewSizeDirty = false;
    startPreviewLoop(journey, 0);
    updatePreviewChrome();
  } catch (error) {
    setError(describeError(error, 'errorPreviewFailed'));
    updatePreviewChrome();
  } finally {
    isPreparing = false;
    refreshActionAvailability();
    updatePreviewChrome();
  }
});

cancelButton.addEventListener('click', () => {
  cancelButton.disabled = true;
  setProgress({ kind: 'key', key: 'progressCancelling' });
  exportController?.abort();
});

createButton.addEventListener('click', async () => {
  if (!requireMapConsent()) return;
  const format = formatSupport === null
    ? null
    : resolveVideoFormat(currentFormat(), formatSupport);
  if (!format) {
    const unsupported = currentFormat();
    setError({
      kind: 'text',
      text: i18n.t('errorFormatUnsupported', {
        width: unsupported.width,
        height: unsupported.height,
        fps: unsupported.frameRate,
      }),
    });
    return;
  }
  // Both before the first await: a queued tick would otherwise draw over the restored size,
  // and CanvasSource captures whatever size the canvas has when the export starts.
  stopPreview();
  applyVideoFormat();
  setError(null);
  resultActions.classList.add('hidden');
  resultVideo.classList.add('hidden');
  updatePreviewChrome();
  cancelButton.disabled = false;
  progress.value = 0;
  isExporting = true;
  refreshActionAvailability();
  updatePreviewChrome();
  exportController = new AbortController();
  const exportAppearance = currentAppearance();
  const wakeLock = await requestWakeLock();
  try {
    const journey = await getPreparedJourney(exportController.signal);
    setProgress({ kind: 'key', key: 'progressCreating' });
    const blob = await createJourneyMp4(canvas, journey, {
      durationSeconds: Number(durationSelect.value),
      overlay: overlayText(),
      appearance: exportAppearance,
      format,
      signal: exportController.signal,
      onProgress: (fraction) => {
        progress.value = fraction;
        setProgress({ kind: 'creating', fraction });
      },
    });
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    resultFile = new File([blob], 'timeline-journey.mp4', { type: 'video/mp4' });
    currentExportId = createExportId();
    clearPaymentSession();
    resultVideo.src = resultUrl;
    resultVideo.style.setProperty('--preview-aspect', String(format.width / format.height));
    resultVideo.classList.remove('hidden');
    resultActions.classList.remove('hidden');
    updatePreviewChrome();
    setProgress({ kind: 'ready', bytes: blob.size });
    updateResultActions();
    renderPaymentStatus(
      isPaymentEnabled() && !isDownloadUnlocked(currentExportId)
        ? i18n.t('downloadPriceHint', { price: paymentPriceLabel() })
        : null,
    );
  } catch (error) {
    if (exportController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      setProgress({ kind: 'key', key: 'progressCancelled' });
      progress.value = 0;
    } else {
      setError(describeError(error, 'errorExportFailed'));
      setProgress({ kind: 'key', key: 'progressFailed' });
    }
  } finally {
    await wakeLock?.release().catch(() => undefined);
    exportController = null;
    isExporting = false;
    cancelButton.disabled = true;
    refreshActionAvailability();
    updatePreviewChrome();
  }
});

shareButton.addEventListener('click', async () => {
  if (!resultFile || typeof navigator.share !== 'function') return;
  if (isPaymentEnabled() && !isDownloadUnlocked(currentExportId)) {
    const unlocked = await startPaymentFlow({ downloadAfterUnlock: false });
    if (!unlocked) return;
  }
  try {
    await navigator.share({ files: [resultFile], title: overlayText().title });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    setError({ kind: 'key', key: 'errorShareUnavailable' });
  }
});

downloadButton.addEventListener('click', () => {
  void startPaymentFlow({ downloadAfterUnlock: true });
});

function applyFormatSupport(support: VideoFormatSupport): void {
  compatibilityChecked = true;
  formatSupport = support;
  const usable = ALL_VIDEO_FORMATS.filter((format) => support.get(videoFormatSupportKey(format)) != null).length;
  if (usable === ALL_VIDEO_FORMATS.length) {
    compatibilityKey = 'compatibilityFull';
  } else if (usable > 0) {
    compatibilityKey = 'compatibilityPartial';
  } else {
    compatibilityKey = 'compatibilityPreviewOnly';
  }
  renderCompatibilityStatus();
  refreshActionAvailability();
}

// Before anything else touches the DOM: the HTML ships the English source text so a failed
// script still renders a usable page, and this replaces it with the active catalog.
languagePreference = resolveInitialLanguagePreference();
i18n = buildI18n(languagePreference);
languageSelect.value = languagePreference;
languageField.classList.toggle('site-ui-hidden', HIDE_LANGUAGE_PICKER);
distanceUnitSelect.value = distanceUnitPreference;
renderLocalizedText();
void resumePaymentFromReturn();
initHeaderLanguageSwitch();
// Safari restores form control values on reload and on bfcache restore without firing
// change, so the canvas has to be synced to the selected format before anything is drawn.
syncAspectControlsFromFormat();
applyVideoFormat();
updatePreviewChrome();
updateToolWorkflow();
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  previewDemoVideo.removeAttribute('autoplay');
  previewDemoVideo.pause();
}
// Single page, no unmount: the resize listener lives as long as the document, and the pixel
// ratio query re-arms itself so at most one is ever registered.
window.addEventListener('resize', onViewportChange);
watchPixelRatio();
hasEncoder = hasVideoEncoder();
void probeVideoFormats().then(applyFormatSupport);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`);
  });
}

initAnalytics();
