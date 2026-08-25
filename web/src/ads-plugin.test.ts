import { describe, expect, it } from 'vitest';
import {
  ADSTERRA_NATIVE_CONTAINER_ID,
  ADSTERRA_NATIVE_SCRIPT,
} from './ads-config.ts';
import { injectAdsterraNative } from './ads-plugin.ts';

describe('injectAdsterraNative', () => {
  it('injects Adsterra script when container is present in production HTML', () => {
    const html = `<!doctype html><body><div id="${ADSTERRA_NATIVE_CONTAINER_ID}"></div></body>`;
    const result = injectAdsterraNative(html, false);
    expect(result).toContain(ADSTERRA_NATIVE_SCRIPT);
    expect(result).toContain('data-cfasync="false"');
  });

  it('skips injection during dev', () => {
    const html = `<!doctype html><body><div id="${ADSTERRA_NATIVE_CONTAINER_ID}"></div></body>`;
    const result = injectAdsterraNative(html, true);
    expect(result).not.toContain(ADSTERRA_NATIVE_SCRIPT);
  });

  it('skips pages without the ad container', () => {
    const html = '<!doctype html><body><main>Privacy</main></body>';
    const result = injectAdsterraNative(html, false);
    expect(result).not.toContain(ADSTERRA_NATIVE_SCRIPT);
  });
});
