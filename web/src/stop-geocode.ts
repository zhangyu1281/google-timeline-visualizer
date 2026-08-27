const GEOCODE_CACHE = new Map<string, string>();
const MIN_GEOCODE_INTERVAL_MS = 1100;
let lastGeocodeAt = 0;

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

async function throttleGeocode(): Promise<void> {
  const wait = MIN_GEOCODE_INTERVAL_MS - (Date.now() - lastGeocodeAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastGeocodeAt = Date.now();
}

function labelFromNominatimAddress(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  return address.city
    ?? address.town
    ?? address.village
    ?? address.municipality
    ?? address.county
    ?? address.state
    ?? null;
}

/** Reverse-geocode a stop to a short place name (Nominatim / OSM). */
export async function reverseGeocodeStopLabel(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = cacheKey(latitude, longitude);
  const cached = GEOCODE_CACHE.get(key);
  if (cached) return cached;

  if (signal?.aborted) throw new DOMException('Video creation was cancelled.', 'AbortError');

  await throttleGeocode();
  const params = new URLSearchParams({
    format: 'json',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '10',
    'accept-language': 'en',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;

  const payload = await response.json() as { address?: Record<string, string> };
  const label = labelFromNominatimAddress(payload.address);
  if (label) GEOCODE_CACHE.set(key, label);
  return label;
}

/** @internal test helper */
export function clearGeocodeCacheForTests(): void {
  GEOCODE_CACHE.clear();
  lastGeocodeAt = 0;
}
