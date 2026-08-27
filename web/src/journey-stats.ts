import type { GeoPoint } from './types';

/** Inclusive calendar days spanned by the journey (local recorded dates when present). */
export function journeyDayCount(points: GeoPoint[]): number {
  if (points.length === 0) return 0;
  const keys = new Set<string>();
  for (const point of points) {
    if (point.recordedDate) {
      keys.add(point.recordedDate);
      continue;
    }
    keys.add(point.instant.toISOString().slice(0, 10));
  }
  return Math.max(1, keys.size);
}

export interface JourneyStats {
  totalDistanceKm: number;
  dayCount: number;
  stopCount: number;
}

export function buildJourneyStats(
  totalDistanceKm: number,
  points: GeoPoint[],
  stopCount: number,
): JourneyStats {
  return {
    totalDistanceKm,
    dayCount: journeyDayCount(points),
    stopCount,
  };
}
