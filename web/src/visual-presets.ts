import type { CameraMovement } from './types';
import type { MapTheme, MarkerPreset, RouteColorPreset } from './render-theme';

export type VisualPresetId = 'epic' | 'sunset';

export interface VisualPreset {
  routeColor: RouteColorPreset;
  mapTheme: MapTheme;
  markerStyle: MarkerPreset;
  cameraMovement: CameraMovement;
}

export const VISUAL_PRESETS: Record<VisualPresetId, VisualPreset> = {
  epic: {
    routeColor: 'neon',
    mapTheme: 'night',
    markerStyle: 'pin',
    cameraMovement: 'dynamic',
  },
  sunset: {
    routeColor: 'sunset',
    mapTheme: 'dark',
    markerStyle: 'classic',
    cameraMovement: 'steady',
  },
};

export function isVisualPresetId(value: string): value is VisualPresetId {
  return value === 'epic' || value === 'sunset';
}
