import { describe, expect, it, vi } from 'vitest';
import { AppError } from './errors';
import * as renderer from './renderer';
import { createJourneyPosterBlob } from './poster';
import { DEFAULT_RENDER_APPEARANCE } from './render-theme';
import type { PreparedJourney } from './types';

const overlay = {
  title: 'Trip',
  periodLabel: 'March 2026',
  separator: ' · ',
  formatDistance: (km: number) => `${Math.round(km)} km`,
  statsSubtitle: '100 km · 2 days · 0 stops',
  outroStopsLine: '',
  outroTotalDistanceKm: 100,
  outroHeroDistance: '100 km',
  outroHighlight: '',
  outroSecondaryStats: '2 days · 0 stops',
  outroRouteLine: '',
};

describe('createJourneyPosterBlob', () => {
  it('throws when the canvas cannot encode PNG', async () => {
    vi.spyOn(renderer, 'drawFrame').mockImplementation(() => undefined);
    const canvas = {
      width: 480,
      height: 480,
      toBlob: (callback: (blob: Blob | null) => void) => callback(null),
    } as unknown as HTMLCanvasElement;

    await expect(createJourneyPosterBlob(
      canvas,
      {} as PreparedJourney,
      overlay,
      DEFAULT_RENDER_APPEARANCE,
    )).rejects.toBeInstanceOf(AppError);
  });
});
