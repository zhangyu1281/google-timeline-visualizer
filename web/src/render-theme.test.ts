import { describe, expect, it, vi } from 'vitest';

describe('mapTileUrl', () => {
  it('appends CARTO api key when configured', async () => {
    vi.stubEnv('VITE_CARTO_API_KEY', 'test-carto-key');
    vi.resetModules();
    const { mapTileUrl } = await import('./render-theme');
    expect(mapTileUrl('light', 3, 4, 5)).toBe(
      'https://a.basemaps.cartocdn.com/light_all/3/4/5.png?key=test-carto-key',
    );
  });
});
