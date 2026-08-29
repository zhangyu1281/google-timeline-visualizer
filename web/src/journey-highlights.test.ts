import { describe, expect, it } from 'vitest';
import {
  earthLaps,
  formatRouteLine,
  pickHighlightStopLabels,
  pickOutroHighlightKind,
} from './journey-highlights';
import type { JourneyStop } from './journey-stops';

function stop(label: string, longHop = false): JourneyStop {
  return {
    label,
    progress: 0,
    latitude: 0,
    longitude: 0,
    worldPoint: { x: 0, y: 0 },
    longHop,
  };
}

describe('earthLaps', () => {
  it('returns zero for empty distance', () => {
    expect(earthLaps(0)).toBe(0);
  });

  it('converts kilometers to laps', () => {
    expect(earthLaps(40_075)).toBeCloseTo(1, 5);
    expect(earthLaps(405_627)).toBeCloseTo(10.12, 1);
  });
});

describe('pickHighlightStopLabels', () => {
  it('deduplicates and prefers long-hop stops', () => {
    const labels = pickHighlightStopLabels([
      stop('Shanghai'),
      stop('Hong Kong', true),
      stop("Jing'an District"),
      stop('Shanghai'),
      stop('Paris', true),
    ]);
    expect(labels).toEqual(['Hong Kong', 'Paris', 'Shanghai', "Jing'an District"]);
  });

  it('caps the number of labels', () => {
    expect(pickHighlightStopLabels([
      stop('A', true),
      stop('B', true),
      stop('C', true),
      stop('D', true),
      stop('E', true),
    ], 3)).toEqual(['A', 'B', 'C']);
  });
});

describe('formatRouteLine', () => {
  it('joins stops with the provided separator', () => {
    expect(formatRouteLine(['Seoul', 'Busan'], ' → ')).toBe('Seoul → Busan');
  });
});

describe('pickOutroHighlightKind', () => {
  it('prioritizes earth laps over other highlights', () => {
    expect(pickOutroHighlightKind({
      totalDistanceKm: 50_000,
      dayCount: 400,
      transferCount: 5,
    })).toBe('earthLaps');
  });

  it('falls back to long-haul flights', () => {
    expect(pickOutroHighlightKind({
      totalDistanceKm: 1000,
      dayCount: 10,
      transferCount: 3,
    })).toBe('longHaulFlights');
  });

  it('falls back to a full year on the road', () => {
    expect(pickOutroHighlightKind({
      totalDistanceKm: 1000,
      dayCount: 365,
      transferCount: 0,
    })).toBe('fullYear');
  });

  it('returns null when nothing is highlight-worthy', () => {
    expect(pickOutroHighlightKind({
      totalDistanceKm: 100,
      dayCount: 3,
      transferCount: 1,
    })).toBeNull();
  });
});
