const BGM_SAMPLE_RATE = 48_000;
const BGM_FADE_SECONDS = 0.5;
const BGM_GAIN = 0.22;

export type BgmTrackId = 'none' | 'wander' | 'horizon' | 'passage';

const TRACK_FILES: Record<Exclude<BgmTrackId, 'none'>, string> = {
  wander: `${import.meta.env.BASE_URL}audio/wander.wav`,
  horizon: `${import.meta.env.BASE_URL}audio/horizon.wav`,
  passage: `${import.meta.env.BASE_URL}audio/passage.wav`,
};

const decodedCache = new Map<Exclude<BgmTrackId, 'none'>, AudioBuffer>();

export function isBgmTrackId(value: string): value is BgmTrackId {
  return value === 'none' || value === 'wander' || value === 'horizon' || value === 'passage';
}

export function hasAudioEncoder(): boolean {
  return typeof globalThis.AudioEncoder !== 'undefined';
}

async function decodeTrack(
  trackId: Exclude<BgmTrackId, 'none'>,
  signal?: AbortSignal,
): Promise<AudioBuffer> {
  const cached = decodedCache.get(trackId);
  if (cached) return cached;

  if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');

  const response = await fetch(TRACK_FILES[trackId], { signal });
  if (!response.ok) {
    throw new Error(`Background music file could not be loaded (${response.status}).`);
  }
  const bytes = await response.arrayBuffer();
  if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');

  const context = new AudioContext({ sampleRate: BGM_SAMPLE_RATE });
  try {
    const decoded = await context.decodeAudioData(bytes.slice(0));
    decodedCache.set(trackId, decoded);
    return decoded;
  } finally {
    await context.close();
  }
}

async function resampleToTargetRate(source: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  if (source.sampleRate === targetSampleRate) return source;
  const frames = Math.max(1, Math.ceil(source.duration * targetSampleRate));
  const offline = new OfflineAudioContext(source.numberOfChannels, frames, targetSampleRate);
  const node = offline.createBufferSource();
  node.buffer = source;
  node.connect(offline.destination);
  node.start(0);
  return offline.startRendering();
}

function fillLoopedBuffer(source: AudioBuffer, frameCount: number): AudioBuffer {
  const output = new AudioBuffer({
    length: frameCount,
    numberOfChannels: source.numberOfChannels,
    sampleRate: source.sampleRate,
  });
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const targetData = output.getChannelData(channel);
    const sourceChannel = Math.min(channel, source.numberOfChannels - 1);
    const sourceData = source.getChannelData(sourceChannel);
    for (let frame = 0; frame < frameCount; frame += 1) {
      targetData[frame] = sourceData[frame % source.length] ?? 0;
    }
  }
  return output;
}

function applyTailFade(buffer: AudioBuffer, fadeSeconds: number): void {
  const fadeFrames = Math.min(buffer.length, Math.round(fadeSeconds * buffer.sampleRate));
  if (fadeFrames <= 0) return;
  const start = buffer.length - fadeFrames;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let frame = 0; frame < fadeFrames; frame += 1) {
      const gain = 1 - frame / fadeFrames;
      data[start + frame] *= gain;
    }
  }
}

/** Builds a stereo buffer trimmed or looped to the export duration. */
export async function buildBgmBuffer(source: AudioBuffer, durationSeconds: number): Promise<AudioBuffer> {
  const normalized = await resampleToTargetRate(source, BGM_SAMPLE_RATE);
  const frameCount = Math.max(1, Math.round(durationSeconds * BGM_SAMPLE_RATE));
  const output = fillLoopedBuffer(normalized, frameCount);

  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let frame = 0; frame < data.length; frame += 1) {
      data[frame] *= BGM_GAIN;
    }
  }

  applyTailFade(output, BGM_FADE_SECONDS);
  return output;
}

export async function prepareBgmForExport(
  trackId: BgmTrackId,
  durationSeconds: number,
  signal?: AbortSignal,
): Promise<AudioBuffer | null> {
  if (trackId === 'none') return null;
  if (!hasAudioEncoder()) return null;
  const source = await decodeTrack(trackId, signal);
  return await buildBgmBuffer(source, durationSeconds);
}
