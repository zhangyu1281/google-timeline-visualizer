import type { CameraMovement } from './types';
import type { BgmTrackId } from './bgm';
import type { AspectRatioPreset, VideoFormatKey } from './video';
import type { MapTheme, MarkerPreset, RouteColorPreset } from './render-theme';

export type SocialPresetId = 'custom' | 'reels' | 'youtube';

export interface SocialPresetSettings {
  aspect: AspectRatioPreset;
  duration: number;
  cameraMovement: CameraMovement;
  mapTheme: MapTheme;
  routeColor: RouteColorPreset;
  markerStyle: MarkerPreset;
  squareFormatKey: VideoFormatKey;
  bgmTrackId: Exclude<BgmTrackId, 'none'>;
}

export const SOCIAL_PRESETS: Record<Exclude<SocialPresetId, 'custom'>, SocialPresetSettings> = {
  reels: {
    aspect: 'portrait',
    duration: 15,
    cameraMovement: 'dynamic',
    mapTheme: 'light',
    routeColor: 'classic',
    markerStyle: 'pin',
    squareFormatKey: 'high',
    bgmTrackId: 'wander',
  },
  youtube: {
    aspect: 'landscape',
    duration: 30,
    cameraMovement: 'steady',
    mapTheme: 'light',
    routeColor: 'classic',
    markerStyle: 'classic',
    squareFormatKey: 'high',
    bgmTrackId: 'passage',
  },
};

export function isSocialPresetId(value: string): value is SocialPresetId {
  return value === 'custom' || value === 'reels' || value === 'youtube';
}

export function presetMatchesSettings(
  presetId: Exclude<SocialPresetId, 'custom'>,
  settings: SocialPresetSettings | (Omit<SocialPresetSettings, 'bgmTrackId'> & { bgmTrackId: BgmTrackId }),
): boolean {
  const preset = SOCIAL_PRESETS[presetId];
  return (
    preset.aspect === settings.aspect
    && preset.duration === settings.duration
    && preset.cameraMovement === settings.cameraMovement
    && preset.mapTheme === settings.mapTheme
    && preset.routeColor === settings.routeColor
    && preset.markerStyle === settings.markerStyle
    && preset.bgmTrackId === settings.bgmTrackId
  );
}
