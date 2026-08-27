import { easeInOutCubic, easeOutCubic } from './animation';
import {
  aspectOf,
  blendViewport,
  buildCameraTrack,
  cameraViewportAt,
  overviewViewport,
  worldPositionAtDistance,
  worldPositionAtProgress,
} from './camera';
import { cumulativeDistances, overviewRouteSegments, unwrapJourneyPoints } from './geo';
import { activeStopAtProgress, resolveJourneyStops } from './journey-stops';
import { journeyDayCount } from './journey-stats';
import {
  activeTransferAtProgress,
  buildJourneyTransfers,
  pointOnTransferArc,
  transferArcHeading,
  transferArcPoints,
} from './journey-transfers';
import type {
  CameraMovement,
  GeoPoint,
  PreparedJourney,
  RenderSize,
  TimelineFrame,
  Viewport,
  WorldPoint,
} from './types';
import { AppError } from './errors';
import { overlayCard, overlayScale } from './overlay';
import {
  DEFAULT_RENDER_APPEARANCE,
  mapFallbackBackground,
  mapTileUrl,
  routePalette,
  type MarkerPreset,
  type RenderAppearance,
  type RoutePalette,
} from './render-theme';

/**
 * The overlay text of one frame, already resolved by the caller.
 *
 * This module never sees a locale. main.ts formats the period label and falls back to the
 * translated default title, so the renderer holds no user copy and imports nothing from the
 * i18n layer. An export freezes one OverlayText for the whole video, so the text of a finished
 * MP4 can never be half in one language and half in another.
 */
export interface OverlayText {
  /** Already resolved and guaranteed non-empty by the caller. */
  readonly title: string;
  readonly periodLabel: string;
  readonly separator: string;
  readonly formatDistance: (kilometers: number) => string;
  /** Total journey stats for the outro card, already formatted by the caller. */
  readonly statsSubtitle: string;
  /** Compact stop list for the outro, already formatted by the caller. */
  readonly outroStopsLine: string;
}

/**
 * The map attribution is a licensing artifact burned into the MP4, which outlives the app
 * locale, so it is developer-owned and deliberately not translatable. Android does translate
 * its map_attribution and that has already regressed: values-pt-rBR dropped '© Esri'
 * altogether, and five other locales collapsed the double space. A viewer of an exported video
 * has no way to correct it afterwards, so the only translatable token here, 'contributors', is
 * not worth the risk. renderer.test.ts pins both names against exactly that class of loss.
 */
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors  © Esri';

// Route and marker sizes are authored on the same 720 design grid as the overlay,
// so a single scale keeps every stroke proportional at any output size.
const TRAIL_WIDTH = 7.5;           // 5 px at 480
const RECENT_TRAIL_WIDTH = 12;     // 8 px at 480
const OVERVIEW_TRAIL_WIDTH = 5.25; // 3.5 px at 480
const HEAD_RADIUS = 15;            // 10 px at 480
const HEAD_RING_RADIUS = 24;       // 16 px at 480
const HEAD_RING_WIDTH = 7.5;       // 5 px at 480
const HEAD_SHADOW_BLUR = 15;       // 10 px at 480
const MINIMAL_HEAD_RADIUS = 9;     // 6 px at 480
const PIN_LENGTH = 30;             // 20 px at 480
const PIN_WIDTH = 18;              // 12 px at 480
const FLIGHT_DASH = [11, 8];       // 7+5 px at 480
const PLANE_SIZE = 18;             // 12 px at 480

function markerHeading(journey: PreparedJourney, completedIndex: number, head: WorldPoint): number {
  const index = Math.max(0, Math.min(completedIndex, journey.worldPoints.length - 1));
  const previous = index > 0 ? journey.worldPoints[index - 1] : journey.worldPoints[index];
  const dx = head.x - previous.x;
  const dy = head.y - previous.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return -Math.PI / 2;
  return Math.atan2(dy, dx);
}

function drawRouteHead(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: RoutePalette,
  preset: MarkerPreset,
  heading: number,
): void {
  if (preset === 'pin') {
    context.save();
    context.translate(x, y);
    context.rotate(heading + Math.PI / 2);
    context.shadowColor = 'rgba(36, 25, 29, 0.35)';
    context.shadowBlur = HEAD_SHADOW_BLUR * scale;
    const length = PIN_LENGTH * scale;
    const width = PIN_WIDTH * scale;
    context.fillStyle = colors.headFill;
    context.beginPath();
    context.moveTo(0, -length * 0.55);
    context.lineTo(width * 0.45, length * 0.35);
    context.lineTo(0, length * 0.12);
    context.lineTo(-width * 0.45, length * 0.35);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = colors.main;
    context.lineWidth = HEAD_RING_WIDTH * 0.65 * scale;
    context.stroke();
    context.restore();
    return;
  }

  context.shadowColor = 'rgba(36, 25, 29, 0.35)';
  context.shadowBlur = (preset === 'minimal' ? 8 : HEAD_SHADOW_BLUR) * scale;
  const radius = (preset === 'minimal' ? MINIMAL_HEAD_RADIUS : HEAD_RADIUS) * scale;
  context.fillStyle = colors.headFill;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  if (preset !== 'minimal') {
    context.strokeStyle = colors.main;
    context.lineWidth = HEAD_RING_WIDTH * scale;
    context.beginPath();
    context.arc(x, y, HEAD_RING_RADIUS * scale, 0, Math.PI * 2);
    context.stroke();
  }
}

function worldToCanvas(point: WorldPoint, viewport: Viewport, size: RenderSize): [number, number] {
  return [
    ((point.x - viewport.minX) / (viewport.maxX - viewport.minX)) * size.width,
    ((point.y - viewport.minY) / (viewport.maxY - viewport.minY)) * size.height,
  ];
}

function stopLabelAlpha(progress: number, stopProgress: number): number {
  const lead = 0.025;
  const tail = 0.04;
  if (progress < stopProgress - lead || progress > stopProgress + tail) return 0;
  if (progress <= stopProgress) {
    return easeOutCubic((progress - (stopProgress - lead)) / lead);
  }
  return 1 - easeOutCubic((progress - stopProgress) / tail);
}

function drawStopCallout(
  context: CanvasRenderingContext2D,
  label: string,
  worldPoint: WorldPoint,
  viewport: Viewport,
  size: RenderSize,
  scale: number,
  alpha: number,
  colors: RoutePalette,
): void {
  if (alpha <= 0) return;
  const [x, y] = worldToCanvas(worldPoint, viewport, size);
  const paddingX = 14 * scale;
  const paddingY = 8 * scale;
  const fontSize = 16 * scale;
  context.save();
  context.globalAlpha = alpha;
  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  const textWidth = context.measureText(label).width;
  const pillWidth = textWidth + paddingX * 2;
  const pillHeight = fontSize + paddingY * 2;
  const pillX = x - pillWidth / 2;
  const pillY = y + 22 * scale;
  context.fillStyle = colors.overlayCardFill;
  context.beginPath();
  context.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  context.fill();
  context.fillStyle = colors.overlayTitle;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x, pillY + pillHeight / 2, pillWidth - paddingX);
  context.restore();
}

function drawPlaneIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: RoutePalette,
  heading: number,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(heading);
  context.shadowColor = 'rgba(36, 25, 29, 0.35)';
  context.shadowBlur = HEAD_SHADOW_BLUR * 0.75 * scale;
  const size = PLANE_SIZE * scale;
  context.fillStyle = colors.headFill;
  context.strokeStyle = colors.main;
  context.lineWidth = HEAD_RING_WIDTH * 0.55 * scale;
  context.beginPath();
  context.moveTo(size * 0.95, 0);
  context.lineTo(-size * 0.45, size * 0.38);
  context.lineTo(-size * 0.15, 0);
  context.lineTo(-size * 0.45, -size * 0.38);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.restore();
}

function strokeWorldPath(
  context: CanvasRenderingContext2D,
  points: WorldPoint[],
  viewport: Viewport,
  size: RenderSize,
): void {
  if (points.length === 0) return;
  context.beginPath();
  points.forEach((point, index) => {
    const [x, y] = worldToCanvas(point, viewport, size);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function strokeTransferArc(
  context: CanvasRenderingContext2D,
  start: WorldPoint,
  end: WorldPoint,
  localProgress: number,
  viewport: Viewport,
  size: RenderSize,
  scale: number,
): WorldPoint {
  const arc = transferArcPoints(start, end);
  const limit = Math.max(1, Math.ceil(localProgress * (arc.length - 1)));
  context.setLineDash(FLIGHT_DASH.map((value) => value * scale));
  strokeWorldPath(context, arc.slice(0, limit + 1), viewport, size);
  context.setLineDash([]);
  return pointOnTransferArc(start, end, localProgress);
}

interface TileCoordinate {
  zoom: number;
  x: number;
  y: number;
}

function tileKey(tile: TileCoordinate): string {
  return `${tile.zoom}/${tile.x}/${tile.y}`;
}

function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const cleanup = (): void => signal?.removeEventListener('abort', abort);
    const abort = (): void => {
      image.src = '';
      cleanup();
      reject(new DOMException('Video creation was cancelled.', 'AbortError'));
    };
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`Could not load map tile ${url}`));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    image.src = url;
  });
}

export function requiredTiles(viewport: Viewport): TileCoordinate[] {
  const tileCount = 2 ** viewport.zoom;
  const minTileX = Math.floor(viewport.minX * tileCount);
  const maxTileX = Math.floor(viewport.maxX * tileCount);
  const minTileY = Math.max(0, Math.floor(viewport.minY * tileCount));
  const maxTileY = Math.min(tileCount - 1, Math.floor(viewport.maxY * tileCount));
  const tiles: TileCoordinate[] = [];
  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      tiles.push({
        zoom: viewport.zoom,
        x: ((tileX % tileCount) + tileCount) % tileCount,
        y: tileY,
      });
    }
  }
  return tiles;
}

function drawMapBackground(
  canvas: HTMLCanvasElement,
  viewport: Viewport,
  tiles: Map<string, HTMLImageElement>,
  mapTheme: RenderAppearance['mapTheme'],
): void {
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('errorCanvasUnavailable', 'Canvas rendering is unavailable.');
  const size: RenderSize = { width: canvas.width, height: canvas.height };
  context.fillStyle = mapFallbackBackground(mapTheme);
  context.fillRect(0, 0, size.width, size.height);

  const tileCount = 2 ** viewport.zoom;
  const minTileX = Math.floor(viewport.minX * tileCount);
  const maxTileX = Math.floor(viewport.maxX * tileCount);
  const minTileY = Math.max(0, Math.floor(viewport.minY * tileCount));
  const maxTileY = Math.min(tileCount - 1, Math.floor(viewport.maxY * tileCount));

  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
      const image = tiles.get(tileKey({ zoom: viewport.zoom, x: wrappedX, y: tileY }));
      if (!image) continue;
      const worldX = tileX / tileCount;
      const worldY = tileY / tileCount;
      const [left, top] = worldToCanvas({ x: worldX, y: worldY }, viewport, size);
      const width = (1 / tileCount / (viewport.maxX - viewport.minX)) * size.width;
      const height = (1 / tileCount / (viewport.maxY - viewport.minY)) * size.height;
      context.drawImage(image, left, top, width, height);
    }
  }
}

async function loadRequiredTiles(
  coordinates: TileCoordinate[],
  mapTheme: RenderAppearance['mapTheme'],
  signal?: AbortSignal,
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, HTMLImageElement>> {
  const tiles = new Map<string, HTMLImageElement>();
  let nextIndex = 0;
  let completed = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < coordinates.length) {
      if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');
      const coordinate = coordinates[nextIndex];
      nextIndex += 1;
      const url = mapTileUrl(mapTheme, coordinate.zoom, coordinate.x, coordinate.y);
      try {
        tiles.set(tileKey(coordinate), await loadImage(url, signal));
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
      }
      completed += 1;
      onProgress?.(completed, coordinates.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, coordinates.length) }, worker));
  return tiles;
}

export async function prepareJourney(
  points: GeoPoint[],
  size: RenderSize = { width: 480, height: 480 },
  cameraMovement: CameraMovement = 'steady',
  durationSeconds = 30,
  mapTheme: RenderAppearance['mapTheme'] = DEFAULT_RENDER_APPEARANCE.mapTheme,
  signal?: AbortSignal,
  onProgress?: (completed: number, total: number) => void,
  resolveStopLabels = false,
): Promise<PreparedJourney> {
  if (points.length < 2) {
    throw new AppError('errorTooFewPoints', 'Select a period containing at least two location points.');
  }
  const worldPoints = unwrapJourneyPoints(points);
  const distances = cumulativeDistances(points);
  const journey = {
    points,
    worldPoints,
    cumulativeDistanceKm: distances,
    totalDistanceKm: distances.at(-1) ?? 0,
  };
  const cameraTrack = buildCameraTrack(journey, size, cameraMovement);
  const overviewSegments = overviewRouteSegments(worldPoints);
  const endingOverview = overviewViewport(
    { ...journey, worldPoints: overviewSegments.flat() },
    size,
  );
  const sampleCount = Math.max(
    20,
    Math.min(durationSeconds * 8, Math.max(durationSeconds * 2, Math.ceil(journey.totalDistanceKm / 250))),
  );
  const required = new Map<string, TileCoordinate>();
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    for (const tile of requiredTiles(cameraViewportAt(cameraTrack, sample / sampleCount))) {
      required.set(tileKey(tile), tile);
    }
  }
  const journeyEnd = cameraViewportAt(cameraTrack, 1);
  for (let sample = 0; sample <= 12; sample += 1) {
    const ending = blendViewport(journeyEnd, endingOverview, easeOutCubic(sample / 12), size);
    for (const tile of requiredTiles(ending)) required.set(tileKey(tile), tile);
  }
  const stops = await resolveJourneyStops(
    points,
    distances,
    journey.totalDistanceKm,
    worldPoints,
    resolveStopLabels,
    signal,
  );
  const transfers = buildJourneyTransfers(journey);
  const tiles = await loadRequiredTiles([...required.values()], mapTheme, signal, onProgress);
  return {
    ...journey,
    dayCount: journeyDayCount(points),
    stops,
    transfers,
    overviewRouteSegments: overviewSegments,
    size,
    cameraTrack,
    overviewViewport: endingOverview,
    tiles,
    mapTheme,
  };
}

function pointAtProgress(journey: PreparedJourney, progress: number): { point: WorldPoint; completedIndex: number } {
  const position = worldPositionAtProgress(journey, progress);
  return { point: position.point, completedIndex: position.fromIndex };
}

function strokeRoute(
  context: CanvasRenderingContext2D,
  points: WorldPoint[],
  head: WorldPoint,
  viewport: Viewport,
  size: RenderSize,
): void {
  if (points.length === 0) return;
  context.beginPath();
  points.forEach((point, index) => {
    const [x, y] = worldToCanvas(point, viewport, size);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  const [headX, headY] = worldToCanvas(head, viewport, size);
  context.lineTo(headX, headY);
  context.stroke();
}

/**
 * The preview canvas is the display's pixel size capped at the format size, so it is
 * proportionally smaller than the prepared size instead of equal to it. An integer backing
 * store cannot hit the format ratio exactly; the widest drift over every reachable device
 * width is 0.20 percent and the analytic bound is 0.33 percent, while the closest pair of
 * format ratios, 1 and 0.5625, is 44 percent apart.
 */
export const ASPECT_EPSILON = 0.01;

/**
 * The preview never draws a short edge below this many device pixels: below it the integer
 * backing store drifts too far from the format ratio to stay inside ASPECT_EPSILON.
 */
export const MIN_PREVIEW_SHORT_EDGE = 240;

/**
 * The backing store for the animated preview: the display's real pixel size, capped at the
 * format size so the preview is never sharper than the video it previews, and floored so the
 * short edge keeps at least MIN_PREVIEW_SHORT_EDGE device pixels. A width that cannot be
 * measured and a device pixel ratio that is not a positive finite number both degrade to the
 * exact format size, which is always correct and only ever costs pixels.
 */
export function previewCanvasSize(
  format: RenderSize,
  cssWidth: number,
  devicePixelRatio: number,
): RenderSize {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const deviceWidth = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth * ratio : format.width;
  const minimumScale = Math.min(1, MIN_PREVIEW_SHORT_EDGE / Math.min(format.width, format.height));
  const scale = Math.min(1, Math.max(minimumScale, deviceWidth / format.width));
  return {
    width: Math.round(format.width * scale),
    height: Math.round(format.height * scale),
  };
}

export function drawFrame(
  canvas: HTMLCanvasElement,
  journey: PreparedJourney,
  frame: TimelineFrame,
  text: OverlayText,
  appearance: RenderAppearance = DEFAULT_RENDER_APPEARANCE,
): void {
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('errorCanvasUnavailable', 'Canvas rendering is unavailable.');
  const size: RenderSize = { width: canvas.width, height: canvas.height };
  // The preview draws the prepared journey on a proportionally smaller canvas, which is the
  // same picture under a uniform scale, so only the ratio has to match. Absolute size is no
  // longer checked here: the export path is held to the format size by createJourneyMp4.
  const preparedAspect = aspectOf(journey.size);
  if (Math.abs(aspectOf(size) - preparedAspect) > preparedAspect * ASPECT_EPSILON) {
    throw new AppError('errorAspectRatio', 'The prepared journey does not match the canvas aspect ratio.');
  }
  const scale = overlayScale(size);
  context.clearRect(0, 0, size.width, size.height);
  const journeyViewport = cameraViewportAt(journey.cameraTrack, frame.journeyProgress);
  // The prepared size, never the canvas size: blendViewport derives the integer tile zoom from
  // the width it is given, and prepareJourney downloaded the outro tiles at the prepared zoom.
  // A smaller preview canvas would ask journey.tiles for keys that were never fetched, and the
  // whole map would fall back to the empty background for the length of the outro.
  const viewport = frame.outroProgress <= 0
    ? journeyViewport
    : blendViewport(
      journeyViewport,
      journey.overviewViewport,
      easeOutCubic(frame.outroProgress),
      journey.size,
    );
  drawMapBackground(canvas, viewport, journey.tiles, appearance.mapTheme);

  const colors = routePalette(appearance.routeColor);

  const current = pointAtProgress(journey, frame.journeyProgress);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const activeAlpha = 1 - easeOutCubic(frame.outroProgress);
  const activeTransfer = frame.outroProgress <= 0
    ? activeTransferAtProgress(journey.transfers, frame.journeyProgress)
    : null;
  context.save();
  context.globalAlpha = activeAlpha;
  if (activeTransfer) {
    const { transfer, localProgress } = activeTransfer;
    const departure = worldPositionAtDistance(
      journey,
      transfer.startProgress * journey.totalDistanceKm,
    );
    const traveled = journey.worldPoints.slice(0, departure.fromIndex + 1);
    context.strokeStyle = colors.trail;
    context.lineWidth = TRAIL_WIDTH * scale;
    strokeRoute(context, traveled, transfer.startWorld, viewport, size);

    context.strokeStyle = colors.main;
    context.lineWidth = RECENT_TRAIL_WIDTH * scale * 0.85;
    const planeWorld = strokeTransferArc(
      context,
      transfer.startWorld,
      transfer.endWorld,
      localProgress,
      viewport,
      size,
      scale,
    );
    const [planeX, planeY] = worldToCanvas(planeWorld, viewport, size);
    drawPlaneIcon(
      context,
      planeX,
      planeY,
      scale,
      colors,
      transferArcHeading(transfer.startWorld, transfer.endWorld, localProgress),
    );
  } else {
    const traveled = journey.worldPoints.slice(0, current.completedIndex + 1);
    context.strokeStyle = colors.trail;
    context.lineWidth = TRAIL_WIDTH * scale;
    strokeRoute(context, traveled, current.point, viewport, size);

    const currentDistance = journey.totalDistanceKm * Math.max(0, Math.min(1, frame.journeyProgress));
    const recentStartDistance = Math.max(0, currentDistance - Math.max(80, journey.totalDistanceKm * 0.16));
    const recentStartIndex = Math.max(
      0,
      journey.cumulativeDistanceKm.findIndex((distance) => distance >= recentStartDistance),
    );
    context.strokeStyle = colors.main;
    context.lineWidth = RECENT_TRAIL_WIDTH * scale;
    strokeRoute(
      context,
      journey.worldPoints.slice(recentStartIndex, current.completedIndex + 1),
      current.point,
      viewport,
      size,
    );
    const [headX, headY] = worldToCanvas(current.point, viewport, size);
    drawRouteHead(
      context,
      headX,
      headY,
      scale,
      colors,
      appearance.markerStyle,
      markerHeading(journey, current.completedIndex, current.point),
    );
  }

  const currentDistance = journey.totalDistanceKm * Math.max(0, Math.min(1, frame.journeyProgress));

  if (frame.outroProgress <= 0 && journey.stops.length > 0) {
    const activeStop = activeStopAtProgress(journey.stops, frame.journeyProgress);
    if (activeStop) {
      const alpha = stopLabelAlpha(frame.journeyProgress, activeStop.progress) * activeAlpha;
      const label = activeStop.longHop ? `✈ ${activeStop.label}` : activeStop.label;
      drawStopCallout(
        context,
        label,
        activeStop.worldPoint,
        viewport,
        size,
        scale,
        alpha,
        colors,
      );
    }
  }
  context.restore();

  if (frame.outroProgress > 0) {
    context.save();
    context.globalAlpha = (190 / 255) * easeInOutCubic(frame.outroProgress);
    context.strokeStyle = colors.main;
    context.lineWidth = OVERVIEW_TRAIL_WIDTH * scale;
    context.setLineDash(FLIGHT_DASH.map((value) => value * scale * 0.65));
    for (const segment of journey.overviewRouteSegments) {
      strokeRoute(
        context,
        segment.slice(0, -1),
        segment.at(-1) ?? current.point,
        viewport,
        size,
      );
    }
    for (const transfer of journey.transfers) {
      context.globalAlpha = (140 / 255) * easeInOutCubic(frame.outroProgress);
      strokeWorldPath(
        context,
        transferArcPoints(transfer.startWorld, transfer.endWorld),
        viewport,
        size,
      );
    }
    context.setLineDash([]);
    context.restore();
  }

  const outroFade = easeInOutCubic(frame.outroProgress);
  const card = overlayCard(size);
  context.fillStyle = colors.overlayCardFill;
  context.beginPath();
  context.roundRect(card.left, card.top, card.width, card.bottom - card.top, 24 * scale);
  context.fill();
  if (frame.outroProgress > 0) {
    context.save();
    context.globalAlpha = 0.35 * outroFade;
    context.strokeStyle = colors.main;
    context.lineWidth = 2.5 * scale;
    context.stroke();
    context.restore();
  }
  context.textAlign = 'center';
  context.fillStyle = colors.overlayTitle;
  context.font = `700 ${34 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(text.title, card.centerX, 72 * scale, card.width - 36 * scale);
  const distanceLabel = text.formatDistance(currentDistance);
  const showingOutroStats = frame.outroProgress > 0 && text.statsSubtitle;
  context.fillStyle = colors.overlaySubtitle;
  context.font = showingOutroStats
    ? `700 ${24 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`
    : `${20 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  const subtitle = showingOutroStats
    ? text.statsSubtitle
    : `${text.periodLabel}${text.separator}${distanceLabel}`;
  context.fillText(
    subtitle,
    card.centerX,
    108 * scale,
    card.width - 36 * scale,
  );
  if (showingOutroStats && text.outroStopsLine) {
    context.save();
    context.globalAlpha = outroFade;
    context.font = `600 ${16 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillStyle = colors.overlaySubtitle;
    context.fillText(
      text.outroStopsLine,
      card.centerX,
      138 * scale,
      card.width - 36 * scale,
    );
    context.restore();
  }

  context.textAlign = 'right';
  context.fillStyle = 'rgba(36, 25, 29, 0.78)';
  context.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(
    MAP_ATTRIBUTION,
    size.width - 12 * scale,
    size.height - 12 * scale,
  );
}
