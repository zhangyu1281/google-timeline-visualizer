import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { analyticsPlugin } from './src/analytics-plugin.ts';
import { adsPlugin } from './src/ads-plugin.ts';

export default defineConfig({
  base: '/',
  plugins: [analyticsPlugin(), adsPlugin()],
  build: {
    target: 'safari16.4',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'how-to-export': resolve(__dirname, 'how-to-export.html'),
        'how-to-export-iphone': resolve(__dirname, 'how-to-export-iphone.html'),
        'how-to-export-android': resolve(__dirname, 'how-to-export-android.html'),
        faq: resolve(__dirname, 'faq.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
