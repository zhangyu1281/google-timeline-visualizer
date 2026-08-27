import { describe, expect, it } from 'vitest';
import { VISUAL_PRESETS, isVisualPresetId } from './visual-presets';

describe('visual presets', () => {
  it('includes epic and sunset presets', () => {
    expect(VISUAL_PRESETS.epic.routeColor).toBe('neon');
    expect(VISUAL_PRESETS.sunset.routeColor).toBe('sunset');
  });

  it('validates preset ids', () => {
    expect(isVisualPresetId('epic')).toBe(true);
    expect(isVisualPresetId('sunset')).toBe(true);
    expect(isVisualPresetId('classic')).toBe(false);
  });
});
