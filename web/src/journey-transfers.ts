import { buildJourneyLegs, worldPositionAtDistance } from './camera';
import type { WorldPoint } from './types';

export interface JourneyTransfer {
  startProgress: number;
  endProgress: number;
  startWorld: WorldPoint;
  endWorld: WorldPoint;
  distanceKm: number;
}

interface TransferJourney {
  worldPoints: WorldPoint[];
  cumulativeDistanceKm: number[];
  totalDistanceKm: number;
}

export function buildJourneyTransfers(journey: TransferJourney): JourneyTransfer[] {
  if (journey.totalDistanceKm <= 0) return [];
  return buildJourneyLegs(journey)
    .filter((leg) => leg.isTransfer)
    .map((leg) => ({
      startProgress: leg.startKm / journey.totalDistanceKm,
      endProgress: leg.endKm / journey.totalDistanceKm,
      startWorld: worldPositionAtDistance(journey, leg.startKm).point,
      endWorld: worldPositionAtDistance(journey, leg.endKm).point,
      distanceKm: leg.endKm - leg.startKm,
    }));
}

export interface ActiveTransfer {
  transfer: JourneyTransfer;
  /** 0 at departure, 1 at arrival. */
  localProgress: number;
}

export function activeTransferAtProgress(
  transfers: readonly JourneyTransfer[],
  progress: number,
): ActiveTransfer | null {
  for (const transfer of transfers) {
    if (progress < transfer.startProgress || progress > transfer.endProgress) continue;
    const span = transfer.endProgress - transfer.startProgress;
    const localProgress = span <= 0 ? 1 : (progress - transfer.startProgress) / span;
    return { transfer, localProgress: Math.max(0, Math.min(1, localProgress)) };
  }
  return null;
}

/** Samples a curved flight path between two world points for canvas drawing. */
export function transferArcPoints(
  start: WorldPoint,
  end: WorldPoint,
  samples = 24,
): WorldPoint[] {
  let endX = end.x;
  while (endX - start.x > 0.5) endX -= 1;
  while (endX - start.x < -0.5) endX += 1;
  const spanX = endX - start.x;
  const spanY = end.y - start.y;
  const bulge = Math.min(0.12, Math.abs(spanX) * 0.18 + Math.abs(spanY) * 0.08);
  const points: WorldPoint[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const fraction = index / samples;
    const lift = Math.sin(fraction * Math.PI) * bulge;
    points.push({
      x: start.x + spanX * fraction,
      y: start.y + spanY * fraction - lift,
    });
  }
  return points;
}

export function pointOnTransferArc(
  start: WorldPoint,
  end: WorldPoint,
  localProgress: number,
): WorldPoint {
  const arc = transferArcPoints(start, end);
  const position = Math.max(0, Math.min(1, localProgress)) * (arc.length - 1);
  const fromIndex = Math.floor(position);
  const toIndex = Math.min(fromIndex + 1, arc.length - 1);
  const fraction = position - fromIndex;
  const from = arc[fromIndex];
  const to = arc[toIndex];
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  };
}

export function transferArcHeading(
  start: WorldPoint,
  end: WorldPoint,
  localProgress: number,
): number {
  const epsilon = 0.02;
  const before = pointOnTransferArc(start, end, Math.max(0, localProgress - epsilon));
  const after = pointOnTransferArc(start, end, Math.min(1, localProgress + epsilon));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return -Math.PI / 4;
  return Math.atan2(dy, dx);
}
