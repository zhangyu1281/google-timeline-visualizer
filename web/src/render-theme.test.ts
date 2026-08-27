import { describe, expect, it } from 'vitest';
import { mapTileUrl } from './render-theme';

describe('mapTileUrl', () => {
  it('uses Esri Canvas basemaps with {z}/{y}/{x} tile order', () => {
    expect(mapTileUrl('light', 3, 4, 5)).toBe(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/3/5/4',
    );
    expect(mapTileUrl('dark', 3, 4, 5)).toBe(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/3/5/4',
    );
    expect(mapTileUrl('night', 3, 4, 5)).toBe(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/3/5/4',
    );
  });
});
