/**
 * Export demo-hero.mp4 and demo-poster.jpg from the running local web app.
 * Prerequisites: `pnpm dev` on http://localhost:5173/
 * Usage: node scripts/generate-demo-hero.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const baseUrl = process.env.DEMO_BASE_URL ?? 'http://localhost:5173/';
const exportTimeoutMs = Number(process.env.DEMO_EXPORT_TIMEOUT_MS ?? 600_000);

function log(step) {
  console.log(`[demo-hero] ${step}`);
}

async function waitForCreateReady(page) {
  await page.waitForFunction(() => {
    const button = document.getElementById('create-button');
    return button instanceof HTMLButtonElement && !button.disabled;
  }, { timeout: 120_000 });
}

async function main() {
  log(`Opening ${baseUrl}`);
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    log('Loading fictional sample journey');
    await page.click('#sample-button');
    await page.waitForSelector('#settings-card:not(.hidden)', { timeout: 60_000 });
    await page.waitForFunction(() => document.body.classList.contains('timeline-loaded'), {
      timeout: 60_000,
    });

    log('Switching UI to English');
    await page.evaluate(() => {
      const select = document.getElementById('app-language');
      if (!(select instanceof HTMLSelectElement)) return;
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    log('Applying Epic look preset');
    await page.click('#epic-preset');

    log('Confirming map consent');
    await page.check('#map-consent');

    await waitForCreateReady(page);

    log('Creating MP4 (map tiles + encode — may take several minutes)');
    await page.click('#create-button');

    await page.waitForFunction(() => {
      const video = document.getElementById('result-video');
      return video instanceof HTMLVideoElement && !video.classList.contains('hidden') && Boolean(video.src);
    }, { timeout: exportTimeoutMs });

    log('Reading exported MP4 bytes');
    const bytes = await page.evaluate(async () => {
      const video = document.getElementById('result-video');
      if (!(video instanceof HTMLVideoElement) || !video.src) {
        throw new Error('Result video is missing');
      }
      const response = await fetch(video.src);
      const buffer = await response.arrayBuffer();
      return Array.from(new Uint8Array(buffer));
    });

    const mp4Path = resolve(publicDir, 'demo-hero.mp4');
    writeFileSync(mp4Path, Buffer.from(bytes));
    log(`Wrote ${mp4Path} (${(bytes.length / (1024 * 1024)).toFixed(2)} MB)`);

    log('Capturing poster frame');
    const posterBase64 = await page.evaluate(async () => {
      const video = document.getElementById('result-video');
      if (!(video instanceof HTMLVideoElement)) {
        throw new Error('Result video is missing');
      }
      await new Promise((resolvePromise, rejectPromise) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          resolvePromise(undefined);
        };
        const onError = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          rejectPromise(new Error('Video seek failed'));
        };
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        video.currentTime = Math.min(3, (video.duration || 3) * 0.25);
      });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
    });

    const posterPath = resolve(publicDir, 'demo-poster.jpg');
    writeFileSync(posterPath, Buffer.from(posterBase64, 'base64'));
    log(`Wrote ${posterPath}`);

    log('Compressing homepage demo video');
    const compress = spawnSync(process.execPath, [resolve(__dirname, 'compress-demo-hero.mjs')], {
      stdio: 'inherit',
    });
    if (compress.status !== 0) {
      throw new Error('Demo compression failed');
    }
  } finally {
    await browser.close();
  }

  log('Done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
