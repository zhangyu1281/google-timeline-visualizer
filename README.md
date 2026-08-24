# Timeline Visualizer

Free web tool to turn your Google Maps Timeline export into an animated travel recap video.

**Live site:** [timelinevisualizer.app](https://timelinevisualizer.app)

## Features

- Upload `Timeline.json` from Google Maps (iPhone or Android export)
- Preview your journey on an interactive map
- Generate MP4 travel videos (Portrait, Square, Landscape)
- 100% browser-based — your data never leaves your device

## Tech stack

- Core engine: forked from [mahlernim/google-timeline-visualizer](https://github.com/mahlernim/google-timeline-visualizer) (MIT)
- TypeScript + Vite
- WebCodecs H.264 + mediabunny for MP4 export
- Deployed on Vercel via GitHub

## Development

```bash
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173

## Build & test

```bash
cd web
pnpm test
pnpm build
```

## Deploy

Push to GitHub — Vercel auto-deploys using `vercel.json`.

See [docs/DEPLOY.md](./docs/DEPLOY.md) for setup details.

## Attribution

Based on [google-timeline-visualizer](https://github.com/mahlernim/google-timeline-visualizer) by @mahler83. See [ATTRIBUTION.md](./ATTRIBUTION.md).

**Unofficial tool — not affiliated with Google.**
