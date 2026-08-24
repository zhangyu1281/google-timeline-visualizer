import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = resolve(import.meta.dirname, '../public');

const REQUIRED_ASSETS = [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'logo-mark.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png',
  'og-image.png',
  'og-home.png',
  'og-export.png',
  'og-export-iphone.png',
  'og-export-android.png',
];

describe('brand assets', () => {
  for (const file of REQUIRED_ASSETS) {
    it(`includes ${file}`, () => {
      expect(existsSync(resolve(publicDir, file))).toBe(true);
    });
  }
});
