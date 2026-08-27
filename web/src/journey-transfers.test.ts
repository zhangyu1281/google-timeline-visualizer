import { describe, expect, it } from 'vitest';
import { cumulativeDistances, unwrapJourneyPoints } from './geo';
import {
  activeTransferAtProgress,
  buildJourneyTransfers,
  pointOnTransferArc,
  transferArcPoints,
} from './journey-transfers';
import type { GeoPoint } from './types';

function journeyFromCoordinates(coordinates: Array<[number, number]>): {
  points: GeoPoint[];
  worldPoints: ReturnType<typeof unwrapJourneyPoints>;
  cumulativeDistanceKm: number[];
  totalDistanceKm: number;
} {
  const points: GeoPoint[] = coordinates.map(([latitude, longitude], index) => ({
    instant: new Date(index * 3_600_000),
    latitude,
    longitude,
  }));
  const worldPoints = unwrapJourneyPoints(points);
  const cumulativeDistanceKm = cumulativeDistances(points);
  return {
    points,
    worldPoints,
    cumulativeDistanceKm,
    totalDistanceKm: cumulativeDistanceKm.at(-1) ?? 0,
  };
}

describe('buildJourneyTransfers', () => {
  it('detects a long hop as a transfer segment', () => {
    const journey = journeyFromCoordinates([
      [37.5665, 126.9780],
      [35.1796, 129.0756],
    ]);
    const transfers = buildJourneyTransfers(journey);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.distanceKm).toBeGreaterThan(200);
    expect(transfers[0]?.startProgress).toBe(0);
    expect(transfers[0]?.endProgress).toBe(1);
  });
});

describe('transfer arc helpers', () => {
  it('moves along the arc as local progress increases', () => {
    const start = { x: 0.2, y: 0.4 };
    const end = { x: 0.7, y: 0.55 };
    const arc = transferArcPoints(start, end);
    expect(arc.length).toBeGreaterThan(2);
    const halfway = pointOnTransferArc(start, end, 0.5);
    expect(halfway.x).toBeGreaterThan(start.x);
    expect(halfway.x).toBeLessThan(end.x);
  });

  it('returns the active transfer for progress inside the segment', () => {
    const transfers = [{
      startProgress: 0.2,
      endProgress: 0.5,
      startWorld: { x: 0.1, y: 0.2 },
      endWorld: { x: 0.8, y: 0.3 },
      distanceKm: 900,
    }];
    const active = activeTransferAtProgress(transfers, 0.35);
    expect(active?.localProgress).toBeCloseTo(0.5, 5);
    expect(activeTransferAtProgress(transfers, 0.1)).toBeNull();
  });
});
