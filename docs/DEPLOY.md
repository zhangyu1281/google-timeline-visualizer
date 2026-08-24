# Deployment Guide

## Vercel (recommended)

1. Push this repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Vercel reads `vercel.json` automatically:
   - Build: `cd web && pnpm install --frozen-lockfile && pnpm test && pnpm build`
   - Output: `web/dist`
4. Add custom domain `timelinevisualizer.app` in Vercel project settings
5. Point DNS to Vercel (A record or CNAME as instructed)

## Environment variables

None required for basic deployment.

Optional:
- `VITE_PREVIEW=true` — shows preview banner (for staging only)

## Upstream sync

Keep the core engine updated:

```bash
git remote add upstream https://github.com/mahlernim/google-timeline-visualizer.git
git fetch upstream
git merge upstream/main -- web/src
```

Resolve conflicts carefully — prefer upstream changes in `web/src/` core files.

## Google Search Console

After deploy:
1. Add property `https://timelinevisualizer.app`
2. Verify ownership (DNS or HTML tag)
3. Submit sitemap: `https://timelinevisualizer.app/sitemap.xml`
4. Request indexing for `/` and `/how-to-export-iphone.html`

## Analytics (optional)

Privacy-friendly page-view analytics via Cloudflare Web Analytics:

1. Create a site at [Cloudflare Web Analytics](https://dash.cloudflare.com → Web Analytics)
2. Copy your beacon token
3. Add environment variable in Vercel project settings:
   ```
   VITE_CF_BEACON_TOKEN=your-token-here
   ```
4. Redeploy — the token is injected at build time into all HTML pages

No Timeline data is sent to analytics. Only aggregate page views are tracked.
