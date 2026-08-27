import { beforeAll, describe, expect, it } from 'vitest';
import { buildBgmBuffer, isBgmTrackId } from './bgm';
import { presetMatchesSettings, SOCIAL_PRESETS } from './social-presets';

/** Minimal AudioBuffer stand-in for Node test runs without Web Audio. */
class MockAudioBuffer {
  readonly length: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(options: { length: number; numberOfChannels: number; sampleRate: number }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channels = Array.from(
      { length: this.numberOfChannels },
      () => new Float32Array(this.length),
    );
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]!;
  }
}

beforeAll(() => {
  globalThis.AudioBuffer = MockAudioBuffer as unknown as typeof AudioBuffer;
});

describe('isBgmTrackId', () => {
  it('accepts known track ids', () => {
    expect(isBgmTrackId('none')).toBe(true);
    expect(isBgmTrackId('wander')).toBe(true);
    expect(isBgmTrackId('unknown')).toBe(false);
  });
});

describe('buildBgmBuffer', () => {
  it('loops source audio to the export duration', async () => {
    const source = new AudioBuffer({
      length: 100,
      numberOfChannels: 1,
      sampleRate: 48_000,
    });
    source.getChannelData(0).fill(0.5);

    const output = await buildBgmBuffer(source, 0.001);
    expect(output.length).toBeGreaterThan(0);
    expect(output.sampleRate).toBe(48_000);
    expect(output.getChannelData(0)[0]).toBeGreaterThan(0);
  });
});

describe('SOCIAL_PRESETS', () => {
  it('matches reels settings exactly', () => {
    expect(presetMatchesSettings('reels', { ...SOCIAL_PRESETS.reels, bgmTrackId: 'wander' })).toBe(true);
    expect(presetMatchesSettings('reels', { ...SOCIAL_PRESETS.reels, bgmTrackId: 'none' })).toBe(false);
  });

  it('matches youtube settings exactly', () => {
    expect(presetMatchesSettings('youtube', { ...SOCIAL_PRESETS.youtube, bgmTrackId: 'passage' })).toBe(true);
    expect(presetMatchesSettings('youtube', { ...SOCIAL_PRESETS.reels, bgmTrackId: 'wander' })).toBe(false);
  });
});
