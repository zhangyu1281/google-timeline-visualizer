import type { JourneyStop } from './journey-stops';

/** Mean equatorial circumference of Earth in kilometers. */
export const EARTH_CIRCUMFERENCE_KM = 40_075;

export function earthLaps(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return distanceKm / EARTH_CIRCUMFERENCE_KM;
}

/** Pick distinctive stop names for the outro route line, deduplicated and long-hop first. */
export function pickHighlightStopLabels(stops: readonly JourneyStop[], max = 4): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (label: string): void => {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(label.trim());
  };

  for (const stop of stops) {
    if (!stop.longHop) continue;
    add(stop.label);
    if (result.length >= max) return result;
  }
  for (const stop of stops) {
    add(stop.label);
    if (result.length >= max) return result;
  }
  return result;
}

export function formatRouteLine(stops: readonly string[], separator: string): string {
  return stops.filter((stop) => stop.length > 0).join(separator);
}

export interface OutroHighlightInput {
  totalDistanceKm: number;
  dayCount: number;
  transferCount: number;
}

/** Pick the single most share-worthy highlight line for the outro card. */
export function pickOutroHighlightKind(
  input: OutroHighlightInput,
): 'earthLaps' | 'longHaulFlights' | 'fullYear' | null {
  if (earthLaps(input.totalDistanceKm) >= 1) return 'earthLaps';
  if (input.transferCount >= 2) return 'longHaulFlights';
  if (input.dayCount >= 365) return 'fullYear';
  return null;
}
