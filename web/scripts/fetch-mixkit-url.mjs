#!/usr/bin/env node
/** Resolves Mixkit music download URLs from track page slugs. */
const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Usage: node fetch-mixkit-url.mjs serene-view-443 traveling-along-...');
  process.exit(1);
}

for (const slug of slugs) {
  const url = `https://mixkit.co/free-stock-music/${slug}/`;
  const res = await fetch(url);
  const html = await res.text();
  const match = html.match(/https:\/\/assets\.mixkit\.co\/music\/download\/mixkit-[^"']+\.mp3/);
  console.log(slug, match?.[0] ?? 'NOT FOUND');
}
