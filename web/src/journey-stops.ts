import { haversineKm } from './geo';
import { reverseGeocodeStop } from './stop-geocode';
import type { GeoPoint, WorldPoint } from './types';

export interface JourneyStop {
  label: string;
  progress: number;
  latitude: number;
  longitude: number;
  worldPoint: WorldPoint;
  /** ISO country name when reverse-geocoded. */
  country?: string | null;
  /** True when the hop into this stop is a long-distance segment (>300 km). */
  longHop: boolean;
}

const MIN_STOP_DISTANCE_KM = 35;
const MIN_STOP_GAP_HOURS = 6;
const LONG_HOP_KM = 300;
const MAX_STOPS = 8;

interface StopCandidate {
  pointIndex: number;
  longHop: boolean;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function pickStopCandidates(points: GeoPoint[]): StopCandidate[] {
  if (points.length === 0) return [];
  const candidates: StopCandidate[] = [{ pointIndex: 0, longHop: false }];
  let lastIndex = 0;

  for (let index = 1; index < points.length; index += 1) {
    const hopKm = haversineKm(points[lastIndex], points[index]);
    const gapHours = hoursBetween(points[lastIndex].instant, points[index].instant);
    if (hopKm >= MIN_STOP_DISTANCE_KM || gapHours >= MIN_STOP_GAP_HOURS) {
      candidates.push({ pointIndex: index, longHop: hopKm >= LONG_HOP_KM });
      lastIndex = index;
    }
  }

  const lastPointIndex = points.length - 1;
  if (candidates.at(-1)?.pointIndex !== lastPointIndex) {
    const prev = points[candidates.at(-1)!.pointIndex];
    const end = points[lastPointIndex];
    const hopKm = haversineKm(prev, end);
    candidates.push({ pointIndex: lastPointIndex, longHop: hopKm >= LONG_HOP_KM });
  }

  if (candidates.length <= MAX_STOPS) return candidates;

  const sampled: StopCandidate[] = [];
  for (let slot = 0; slot < MAX_STOPS; slot += 1) {
    const pick = Math.round((slot / (MAX_STOPS - 1)) * (candidates.length - 1));
    const candidate = candidates[pick];
    if (!sampled.some((entry) => entry.pointIndex === candidate.pointIndex)) {
      sampled.push(candidate);
    }
  }
  return sampled.sort((a, b) => a.pointIndex - b.pointIndex);
}

export function stopProgressAt(
  cumulativeDistanceKm: readonly number[],
  totalDistanceKm: number,
  pointIndex: number,
): number {
  if (totalDistanceKm <= 0) return 0;
  const distance = cumulativeDistanceKm[pointIndex] ?? 0;
  return Math.max(0, Math.min(1, distance / totalDistanceKm));
}

export function buildStopCandidates(points: GeoPoint[]): StopCandidate[] {
  return pickStopCandidates(points);
}

export async function resolveJourneyStops(
  points: GeoPoint[],
  cumulativeDistanceKm: readonly number[],
  totalDistanceKm: number,
  worldPoints: WorldPoint[],
  resolveLabels: boolean,
  signal?: AbortSignal,
  acceptLanguage = 'en',
): Promise<JourneyStop[]> {
  const candidates = pickStopCandidates(points);
  const stops: JourneyStop[] = [];

  for (const candidate of candidates) {
    if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');
    const point = points[candidate.pointIndex];
    const worldPoint = worldPoints[candidate.pointIndex];
    let label = `Stop ${stops.length + 1}`;
    let country: string | null = null;
    if (resolveLabels) {
      const resolved = await reverseGeocodeStop(point.latitude, point.longitude, signal, acceptLanguage);
      if (resolved.label) label = resolved.label;
      country = resolved.country;
    }
    stops.push({
      label,
      progress: stopProgressAt(cumulativeDistanceKm, totalDistanceKm, candidate.pointIndex),
      latitude: point.latitude,
      longitude: point.longitude,
      worldPoint,
      country,
      longHop: candidate.longHop,
    });
  }

  return stops;
}

/** Returns the stop whose reveal window contains `progress`, if any. */
export function activeStopAtProgress(stops: readonly JourneyStop[], progress: number): JourneyStop | null {
  const window = 0.045;
  let best: JourneyStop | null = null;
  let bestDistance = Infinity;
  for (const stop of stops) {
    if (progress < stop.progress - 0.01 || progress > stop.progress + window) continue;
    const distance = Math.abs(progress - stop.progress);
    if (distance < bestDistance) {
      best = stop;
      bestDistance = distance;
    }
  }
  return best;
}
