import { describe, expect, it } from 'vitest';
import {
  activeStopAtProgress,
  buildStopCandidates,
  stopProgressAt,
} from './journey-stops';
import { cumulativeDistances } from './geo';
import type { GeoPoint } from './types';

function route(coordinates: Array<[number, number]>, hourStep = 6): GeoPoint[] {
  return coordinates.map(([latitude, longitude], index) => ({
    instant: new Date(index * hourStep * 60 * 60 * 1000),
    latitude,
    longitude,
  }));
}

describe('buildStopCandidates', () => {
  it('includes first and last points and major hops', () => {
    const points = route([
      [37.5665, 126.9780],
      [37.5700, 126.9850],
      [35.1796, 129.0756],
    ]);
    const candidates = buildStopCandidates(points);
    expect(candidates[0]?.pointIndex).toBe(0);
    expect(candidates.at(-1)?.pointIndex).toBe(points.length - 1);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('caps the number of stops', () => {
    const coordinates: Array<[number, number]> = [];
    for (let index = 0; index < 20; index += 1) {
      coordinates.push([37 + index * 2, 127 + index * 2]);
    }
    expect(buildStopCandidates(route(coordinates)).length).toBeLessThanOrEqual(8);
  });
});

describe('stopProgressAt', () => {
  it('maps a point index to cumulative distance progress', () => {
    const points = route([[37, 127], [38, 128], [39, 129]]);
    const cumulative = cumulativeDistances(points);
    const total = cumulative.at(-1) ?? 0;
    expect(stopProgressAt(cumulative, total, 1)).toBeCloseTo(cumulative[1] / total, 5);
  });
});

describe('activeStopAtProgress', () => {
  const stops = [
    { label: 'A', progress: 0.2, latitude: 0, longitude: 0, worldPoint: { x: 0, y: 0 }, longHop: false },
    { label: 'B', progress: 0.6, latitude: 0, longitude: 0, worldPoint: { x: 0, y: 0 }, longHop: true },
  ];

  it('returns the nearest stop inside the reveal window', () => {
    expect(activeStopAtProgress(stops, 0.21)?.label).toBe('A');
    expect(activeStopAtProgress(stops, 0.1)).toBeNull();
  });
});
