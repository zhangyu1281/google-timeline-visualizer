#!/usr/bin/env node
/** Generates placeholder royalty-free-style BGM WAV files for local export testing. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/audio');
const sampleRate = 48_000;
const durationSec = 20;

function writeWav(filePath, getSample) {
  const frames = durationSec * sampleRate;
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate;
    const mono = getSample(t);
    const sample = Math.max(-1, Math.min(1, mono));
    const int16 = Math.round(sample * 32_767 * 0.35);
    buffer.writeInt16LE(int16, offset);
    buffer.writeInt16LE(int16, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
}

const tracks = {
  wander: (t) => (
    Math.sin(2 * Math.PI * 220 * t) * 0.35
    + Math.sin(2 * Math.PI * 330 * t) * 0.18
    + Math.sin(2 * Math.PI * 440 * t) * 0.08
  ),
  horizon: (t) => (
    Math.sin(2 * Math.PI * 392 * t) * 0.28 * (0.55 + 0.45 * Math.sin(2 * Math.PI * 1.5 * t))
    + Math.sin(2 * Math.PI * 587 * t) * 0.12
  ),
  passage: (t) => (
    Math.sin(2 * Math.PI * 110 * t) * 0.42
    + Math.sin(2 * Math.PI * 165 * t) * 0.22
    + Math.sin(2 * Math.PI * 220 * t) * 0.1 * Math.sin(2 * Math.PI * 0.25 * t)
  ),
};

fs.mkdirSync(outDir, { recursive: true });
for (const [name, fn] of Object.entries(tracks)) {
  writeWav(path.join(outDir, `${name}.wav`), fn);
  console.log(`Wrote ${name}.wav`);
}
