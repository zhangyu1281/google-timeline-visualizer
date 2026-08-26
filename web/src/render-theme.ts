export type MapTheme = 'light' | 'dark';
export type RouteColorPreset = 'classic' | 'neon' | 'sunset';

export interface RenderAppearance {
  mapTheme: MapTheme;
  routeColor: RouteColorPreset;
}

export const DEFAULT_RENDER_APPEARANCE: RenderAppearance = {
  mapTheme: 'light',
  routeColor: 'classic',
};

export function isMapTheme(value: string): value is MapTheme {
  return value === 'light' || value === 'dark';
}

export function isRouteColorPreset(value: string): value is RouteColorPreset {
  return value === 'classic' || value === 'neon' || value === 'sunset';
}

export function mapTileUrl(theme: MapTheme, z: number, x: number, y: number): string {
  const base = theme === 'dark'
    ? 'https://a.basemaps.cartocdn.com/dark_all'
    : 'https://a.basemaps.cartocdn.com/light_all';
  return `${base}/${z}/${x}/${y}.png`;
}

export function mapFallbackBackground(theme: MapTheme): string {
  return theme === 'dark' ? '#1a1a2e' : '#f2edf0';
}

export interface RoutePalette {
  main: string;
  trail: string;
  headFill: string;
  overlayCardFill: string;
  overlayTitle: string;
  overlaySubtitle: string;
}

export function routePalette(preset: RouteColorPreset): RoutePalette {
  switch (preset) {
    case 'neon':
      return {
        main: '#00d4ff',
        trail: 'rgba(0, 212, 255, 0.34)',
        headFill: '#0f172a',
        overlayCardFill: 'rgba(240, 253, 255, 0.86)',
        overlayTitle: '#0f172a',
        overlaySubtitle: '#475569',
      };
    case 'sunset':
      return {
        main: '#f97316',
        trail: 'rgba(249, 115, 22, 0.34)',
        headFill: '#431407',
        overlayCardFill: 'rgba(255, 247, 237, 0.86)',
        overlayTitle: '#431407',
        overlaySubtitle: '#9a3412',
      };
    default:
      return {
        main: '#e90064',
        trail: 'rgba(233, 0, 100, 0.34)',
        headFill: '#24191d',
        overlayCardFill: 'rgba(255, 248, 250, 0.86)',
        overlayTitle: '#24191d',
        overlaySubtitle: '#5c4b52',
      };
  }
}
