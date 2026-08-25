import type { Plugin } from 'vite';
import {
  ADSTERRA_NATIVE_CONTAINER_ID,
  ADSTERRA_NATIVE_ENABLED,
  ADSTERRA_NATIVE_SCRIPT,
} from './ads-config.ts';

function adsterraNativeSnippet(): string {
  return `<script async="async" data-cfasync="false" src="${ADSTERRA_NATIVE_SCRIPT}"></script>`;
}

export function injectAdsterraNative(html: string, isDev: boolean): string {
  if (isDev || !ADSTERRA_NATIVE_ENABLED) return html;
  if (!html.includes(ADSTERRA_NATIVE_CONTAINER_ID)) return html;
  return html.replace('</body>', `${adsterraNativeSnippet()}\n</body>`);
}

/** Injects Adsterra Native Banner script on HTML pages that include the ad container. */
export function adsPlugin(): Plugin {
  return {
    name: 'inject-ads',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        return injectAdsterraNative(html, Boolean(ctx.server));
      },
    },
  };
}
