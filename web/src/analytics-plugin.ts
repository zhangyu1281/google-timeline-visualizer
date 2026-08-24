import type { Plugin } from 'vite';

/** Injects Cloudflare Web Analytics on all HTML pages when VITE_CF_BEACON_TOKEN is set. */
export function analyticsPlugin(): Plugin {
  return {
    name: 'inject-analytics',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const token = process.env.VITE_CF_BEACON_TOKEN;
        if (!token) return html;
        const script = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`;
        return html.replace('</body>', `${script}\n</body>`);
      },
    },
  };
}
