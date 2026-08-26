/**
 * Generates a multi-year fictional Timeline.json for local testing.
 * Run: node web/scripts/generate-test-timeline-long-span.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../public/test-timeline-long-span.json');

/** @param {number} lat @param {number} lng @param {number} n */
function interpolate(lat1, lng1, lat2, lng2, n) {
  const points = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0 : i / (n - 1);
    points.push([
      lat1 + (lat2 - lat1) * t,
      lng1 + (lng2 - lng1) * t,
    ]);
  }
  return points;
}

/** @param {string} iso @param {number} minutes */
function addMinutes(iso, minutes) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString().replace('.000Z', 'Z');
}

/**
 * @param {object} opts
 * @param {string} opts.startTime
 * @param {number} opts.durationHours
 * @param {Array<[number, number]>} opts.waypoints
 * @param {'path' | 'activity' | 'visit'} [opts.kind]
 */
function makeSegment({ startTime, durationHours, waypoints, kind = 'path' }) {
  const endTime = addMinutes(startTime, durationHours * 60);
  const legs = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    legs.push(...interpolate(
      waypoints[i][0], waypoints[i][1],
      waypoints[i + 1][0], waypoints[i + 1][1],
      3,
    ));
  }
  const unique = legs.filter((p, idx, arr) => idx === 0
    || p[0] !== arr[idx - 1][0] || p[1] !== arr[idx - 1][1]);
  const step = Math.max(1, Math.floor((durationHours * 60) / Math.max(unique.length - 1, 1)));
  const timelinePath = unique.map((p, i) => ({
    point: `${p[0].toFixed(4)},${p[1].toFixed(4)}`,
    durationMinutesOffsetFromStartTime: i * step,
  }));

  const segment = { startTime, endTime, timelinePath };

  if (kind === 'activity') {
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    segment.activity = {
      start: `${first[0].toFixed(4)},${first[1].toFixed(4)}`,
      end: `${last[0].toFixed(4)},${last[1].toFixed(4)}`,
    };
  }

  if (kind === 'visit') {
    const [lat, lng] = waypoints[waypoints.length - 1];
    segment.visit = {
      topCandidate: { placeLocation: `${lat.toFixed(4)},${lng.toFixed(4)}` },
    };
  }

  return segment;
}

/** @param {string} startIso @param {number} count @param {[number, number]} hub */
function localCommuteDays(startIso, count, hub) {
  const segments = [];
  let t = Date.parse(startIso);
  for (let d = 0; d < count; d += 1) {
    const day = new Date(t + d * 86_400_000);
    const y = day.getUTCFullYear();
    const m = String(day.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(day.getUTCDate()).padStart(2, '0');
    const jitter = (d % 5) * 0.008;
    const a = [hub[0] + jitter, hub[1] - jitter * 0.7];
    const b = [hub[0] - jitter * 0.5, hub[1] + jitter];
    segments.push(makeSegment({
      startTime: `${y}-${m}-${dd}T01:30:00Z`,
      durationHours: 10,
      waypoints: [a, b, hub],
      kind: d % 3 === 0 ? 'activity' : 'path',
    }));
  }
  return segments;
}

const SH = [31.2304, 121.4737];

const journeys = [
  {
    start: '2019-02-10T06:00:00Z',
    hours: 14,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [35.68, 139.69], [34.69, 135.50], [35.01, 135.77]],
  },
  {
    start: '2019-05-18T08:00:00Z',
    hours: 18,
    kind: 'visit',
    waypoints: [[31.23, 121.47], [48.86, 2.35], [51.51, -0.13], [52.37, 4.90], [50.11, 8.68]],
  },
  {
    start: '2019-09-03T04:00:00Z',
    hours: 16,
    kind: 'path',
    waypoints: [[31.23, 121.47], [13.75, 100.50], [1.35, 103.82], [-8.65, 115.22]],
  },
  {
    start: '2020-01-12T07:00:00Z',
    hours: 12,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [22.32, 114.17], [23.13, 113.26], [39.90, 116.40]],
  },
  {
    start: '2020-07-22T09:00:00Z',
    hours: 10,
    kind: 'path',
    waypoints: [[31.23, 121.47], [30.27, 120.15], [29.56, 106.55], [25.04, 121.56]],
  },
  {
    start: '2021-04-05T05:00:00Z',
    hours: 20,
    kind: 'visit',
    waypoints: [[31.23, 121.47], [37.77, -122.42], [34.05, -118.24], [36.17, -115.14], [40.71, -74.01]],
  },
  {
    start: '2021-11-20T03:00:00Z',
    hours: 15,
    kind: 'path',
    waypoints: [[31.23, 121.47], [19.08, 72.88], [25.20, 55.27], [41.01, 28.98]],
  },
  {
    start: '2022-03-14T06:00:00Z',
    hours: 14,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [-33.87, 151.21], [-37.81, 144.96], [-27.47, 153.03]],
  },
  {
    start: '2022-08-01T08:00:00Z',
    hours: 16,
    kind: 'path',
    waypoints: [[31.23, 121.47], [55.76, 37.62], [59.93, 30.34], [60.17, 24.94]],
  },
  {
    start: '2023-02-18T04:00:00Z',
    hours: 18,
    kind: 'visit',
    waypoints: [[31.23, 121.47], [-23.55, -46.63], [-22.91, -43.17], [-34.60, -58.38]],
  },
  {
    start: '2023-06-09T07:00:00Z',
    hours: 12,
    kind: 'path',
    waypoints: [[31.23, 121.47], [43.65, 7.26], [41.39, 2.17], [40.42, -3.70]],
  },
  {
    start: '2023-10-25T05:00:00Z',
    hours: 15,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [64.15, -21.95], [51.51, -0.13], [55.95, -3.19]],
  },
  {
    start: '2024-01-08T02:00:00Z',
    hours: 14,
    kind: 'path',
    waypoints: [[31.23, 121.47], [25.03, 121.57], [22.63, 120.30], [23.98, 121.60]],
  },
  {
    start: '2024-05-30T06:00:00Z',
    hours: 20,
    kind: 'visit',
    waypoints: [[31.23, 121.47], [49.28, -123.12], [47.61, -122.33], [45.52, -122.68], [37.77, -122.42]],
  },
  {
    start: '2024-09-15T09:00:00Z',
    hours: 16,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [28.61, 77.21], [19.08, 72.88], [12.97, 77.59]],
  },
  {
    start: '2025-01-20T03:00:00Z',
    hours: 12,
    kind: 'path',
    waypoints: [[31.23, 121.47], [35.68, 139.69], [34.69, 135.50], [35.68, 139.69]],
  },
  {
    start: '2025-04-11T05:00:00Z',
    hours: 18,
    kind: 'visit',
    waypoints: [[31.23, 121.47], [41.90, 12.50], [45.46, 9.19], [47.38, 8.54], [48.86, 2.35]],
  },
  {
    start: '2025-08-02T07:00:00Z',
    hours: 14,
    kind: 'activity',
    waypoints: [[31.23, 121.47], [1.29, 103.85], [3.14, 101.69], [13.75, 100.50]],
  },
];

const segments = [];

for (const j of journeys) {
  segments.push(makeSegment({
    startTime: j.start,
    durationHours: j.hours,
    waypoints: j.waypoints,
    kind: j.kind,
  }));
}

segments.push(...localCommuteDays('2019-01-06T02:00:00Z', 8, SH));
segments.push(...localCommuteDays('2020-03-01T02:00:00Z', 10, SH));
segments.push(...localCommuteDays('2021-01-10T02:00:00Z', 12, SH));
segments.push(...localCommuteDays('2022-01-08T02:00:00Z', 10, SH));
segments.push(...localCommuteDays('2023-01-05T02:00:00Z', 14, SH));
segments.push(...localCommuteDays('2024-01-04T02:00:00Z', 12, SH));
segments.push(...localCommuteDays('2025-01-03T02:00:00Z', 10, SH));

segments.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

const payload = {
  semanticSegments: segments,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

let pointCount = 0;
for (const s of segments) {
  pointCount += s.timelinePath?.length ?? 0;
  if (s.activity) pointCount += 2;
  if (s.visit) pointCount += 1;
}

console.log(`Wrote ${segments.length} segments (~${pointCount} raw points) to ${outPath}`);
console.log(`Span: ${segments[0].startTime} → ${segments.at(-1).endTime}`);
