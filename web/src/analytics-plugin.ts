import type { Plugin } from 'vite';

const GA_MEASUREMENT_ID = process.env.VITE_GA_MEASUREMENT_ID ?? 'G-D537HYXP7Z';

function googleAnalyticsSnippet(id: string): string {
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
}

function cloudflareBeaconSnippet(token: string): string {
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`;
}

/** Injects analytics scripts on all built HTML pages. */
export function analyticsPlugin(): Plugin {
  return {
    name: 'inject-analytics',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html;

        let result = html;
        const cfToken = process.env.VITE_CF_BEACON_TOKEN;
        if (cfToken) {
          result = result.replace('</body>', `${cloudflareBeaconSnippet(cfToken)}\n</body>`);
        }
        if (GA_MEASUREMENT_ID) {
          result = result.replace('</head>', `${googleAnalyticsSnippet(GA_MEASUREMENT_ID)}\n</head>`);
        }
        return result;
      },
    },
  };
}
