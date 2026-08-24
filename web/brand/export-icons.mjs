/**
 * Generate favicons, PWA icons, and OG PNGs from brand SVG sources.
 * Run: pnpm icons  (also runs automatically before build)
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import toIco from 'to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const publicDir = resolve(__dirname, '../public');

const SITE_ORIGIN = 'https://www.timelinevisualizer.app';

function svgToPng(svgPath, outPath, width, height) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: height ? { mode: 'width', value: width } : { mode: 'width', value: width },
  });
  let png = resvg.render().asPng();
  if (height && png.length) {
    // Re-render with height constraint when aspect ratio differs
    const resvgH = new Resvg(svg, { fitTo: { mode: 'height', value: height } });
    png = resvgH.render().asPng();
  }
  writeFileSync(outPath, png);
}

function svgToPngBuffer(svgPath, width) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

function copySvg(name, destName = name) {
  copyFileSync(resolve(brandDir, name), resolve(publicDir, destName));
}

async function main() {
  copySvg('logo-mark.svg');
  copySvg('logo-mark-light.svg', 'icon.svg');
  copySvg('logo-mark-dark.svg', 'apple-touch-icon.svg');
  copySvg('og-home.svg', 'og-image.svg');

  const favicon16 = svgToPngBuffer(resolve(brandDir, 'logo-mark-light.svg'), 16);
  const favicon32 = svgToPngBuffer(resolve(brandDir, 'logo-mark-light.svg'), 32);
  const favicon48 = svgToPngBuffer(resolve(brandDir, 'logo-mark-light.svg'), 48);
  writeFileSync(resolve(publicDir, 'favicon.ico'), await toIco([favicon16, favicon32, favicon48]));

  svgToPng(resolve(brandDir, 'logo-mark-light.svg'), resolve(publicDir, 'favicon-16x16.png'), 16);
  svgToPng(resolve(brandDir, 'logo-mark-light.svg'), resolve(publicDir, 'favicon-32x32.png'), 32);
  svgToPng(resolve(brandDir, 'logo-mark-dark.svg'), resolve(publicDir, 'apple-touch-icon.png'), 180);
  svgToPng(resolve(brandDir, 'logo-mark-light.svg'), resolve(publicDir, 'icon-192.png'), 192);
  svgToPng(resolve(brandDir, 'logo-mark-maskable.svg'), resolve(publicDir, 'icon-512.png'), 512);
  svgToPng(resolve(brandDir, 'logo-mark-maskable.svg'), resolve(publicDir, 'icon-512-maskable.png'), 512);

  const ogExports = [
    ['og-home.svg', 'og-image.png'],
    ['og-home.svg', 'og-home.png'],
    ['og-export.svg', 'og-export.png'],
    ['og-export-iphone.svg', 'og-export-iphone.png'],
    ['og-export-android.svg', 'og-export-android.png'],
  ];
  for (const [src, dest] of ogExports) {
    svgToPng(resolve(brandDir, src), resolve(publicDir, dest), 1200, 630);
  }

  console.log('Brand assets exported to web/public/');
  console.log(`OG default: ${SITE_ORIGIN}/og-image.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
