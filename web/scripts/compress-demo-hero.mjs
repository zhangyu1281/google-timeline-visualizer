/**
 * Compress demo-hero.mp4 for homepage autoplay.
 * Keeps a full-quality backup as demo-hero-source.mp4 when missing.
 */
import { copyFileSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const toolsDir = resolve(__dirname, '../.tools');
const sourcePath = resolve(publicDir, 'demo-hero.mp4');
const backupPath = resolve(publicDir, 'demo-hero-source.mp4');
const tempPath = resolve(publicDir, 'demo-hero-compressed.mp4');

function findBundledFfmpeg() {
  if (!existsSync(toolsDir)) return null;
  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(toolsDir, entry.name, 'bin', 'ffmpeg.exe');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const bundled = findBundledFfmpeg();
  if (bundled) return bundled;
  try {
    const ffmpegStatic = (await import('ffmpeg-static')).default;
    if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch {
    // Optional dependency may be unavailable.
  }
  return null;
}

const ffmpegBinary = await resolveFfmpeg();
if (!ffmpegBinary) {
  console.error('ffmpeg binary is missing. Set FFMPEG_PATH or download tools into web/.tools/');
  process.exit(1);
}

if (!existsSync(sourcePath)) {
  console.error(`Missing ${sourcePath}`);
  process.exit(1);
}

if (!existsSync(backupPath)) {
  copyFileSync(sourcePath, backupPath);
  console.log(`Backed up source to ${backupPath}`);
}

const inputPath = backupPath;

const args = [
  '-y',
  '-i', inputPath,
  '-t', '12',
  '-an',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '28',
  '-movflags', '+faststart',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=720:-2',
  tempPath,
];

console.log(`Compressing with ${ffmpegBinary}`);
const result = spawnSync(ffmpegBinary, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

renameSync(tempPath, sourcePath);
const sizeMb = (statSync(sourcePath).size / (1024 * 1024)).toFixed(2);
console.log(`Wrote ${sourcePath} (${sizeMb} MB)`);
