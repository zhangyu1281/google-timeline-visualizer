export interface GeocodedStop {
  label: string | null;
  country: string | null;
}

const GEOCODE_CACHE = new Map<string, GeocodedStop>();
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

function countryFromNominatimAddress(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  return address.country ?? null;
}

/** Reverse-geocode a stop to a short place name and country (Nominatim / OSM). */
export async function reverseGeocodeStop(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  acceptLanguage = 'en',
): Promise<GeocodedStop> {
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
    'accept-language': acceptLanguage,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return { label: null, country: null };

  const payload = await response.json() as { address?: Record<string, string> };
  const result: GeocodedStop = {
    label: labelFromNominatimAddress(payload.address),
    country: countryFromNominatimAddress(payload.address),
  };
  GEOCODE_CACHE.set(key, result);
  return result;
}

/** Reverse-geocode a stop to a short place name (Nominatim / OSM). */
export async function reverseGeocodeStopLabel(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  acceptLanguage = 'en',
): Promise<string | null> {
  const result = await reverseGeocodeStop(latitude, longitude, signal, acceptLanguage);
  return result.label;
}

/** @internal test helper */
export function clearGeocodeCacheForTests(): void {
  GEOCODE_CACHE.clear();
  lastGeocodeAt = 0;
}
