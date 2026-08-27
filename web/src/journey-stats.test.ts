import { describe, expect, it } from 'vitest';
import { buildJourneyStats, journeyDayCount } from './journey-stats';
import type { GeoPoint } from './types';

function point(instant: string, recordedDate?: string): GeoPoint {
  return {
    instant: new Date(instant),
    latitude: 37.5,
    longitude: 127,
    recordedDate,
  };
}

describe('journeyDayCount', () => {
  it('counts distinct calendar days from recordedDate when present', () => {
    const points = [
      point('2024-01-01T10:00:00Z', '2024-01-01'),
      point('2024-01-01T18:00:00Z', '2024-01-01'),
      point('2024-01-02T09:00:00Z', '2024-01-02'),
    ];
    expect(journeyDayCount(points)).toBe(2);
  });

  it('returns at least one day for a single point', () => {
    expect(journeyDayCount([point('2024-03-15T12:00:00Z')])).toBe(1);
  });
});

describe('buildJourneyStats', () => {
  it('combines distance, days, and stop count', () => {
    const points = [
      point('2024-01-01T10:00:00Z', '2024-01-01'),
      point('2024-01-03T10:00:00Z', '2024-01-03'),
    ];
    expect(buildJourneyStats(1200, points, 5)).toEqual({
      totalDistanceKm: 1200,
      dayCount: 2,
      stopCount: 5,
    });
  });
});
