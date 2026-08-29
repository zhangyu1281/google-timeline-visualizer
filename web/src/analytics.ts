/** Privacy-safe conversion analytics. Never send coordinates, place names, or file contents. */

export type AnalyticsEventName =
  | 'timeline_loaded'
  | 'timeline_load_failed'
  | 'map_consent_granted'
  | 'preview_started'
  | 'preview_completed'
  | 'preview_failed'
  | 'export_started'
  | 'export_success'
  | 'export_failed'
  | 'checkout_started'
  | 'purchase'
  | 'download'
  | 'download_poster'
  | 'share'
  | 'share_poster'
  | 'sample_used'
  | 'visual_preset_applied'
  | 'payment_popup_blocked'
  | 'payment_abandoned'
  | 'browser_unsupported';

const ALLOWED_PARAM_KEYS = new Set([
  'source',
  'reason',
  'error_code',
  'point_count_bucket',
  'has_raw_only',
  'duration_s',
  'aspect',
  'camera',
  'format',
  'fps',
  'total_km_bucket',
  'stop_count_bucket',
  'file_size_mb_bucket',
  'export_id',
  'entry',
  'preset',
  'value',
  'currency',
  'transaction_id',
]);

export function bucketCount(count: number): string {
  if (count <= 0) return '0';
  if (count <= 50) return '1-50';
  if (count <= 200) return '51-200';
  if (count <= 1000) return '201-1000';
  return '1000+';
}

export function bucketKm(kilometers: number): string {
  if (kilometers <= 50) return '0-50';
  if (kilometers <= 500) return '50-500';
  if (kilometers <= 5000) return '500-5000';
  return '5000+';
}

export function bucketMb(bytes: number): string {
  const megabytes = bytes / 1_000_000;
  if (megabytes <= 5) return '0-5';
  if (megabytes <= 20) return '5-20';
  return '20+';
}

export function sanitizeAnalyticsParams(
  params: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAM_KEYS.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
    }
  }
  return output;
}

export function trackEvent(
  name: AnalyticsEventName,
  params?: Record<string, unknown>,
): void {
  const payload = params ? sanitizeAnalyticsParams(params) : undefined;
  if (!import.meta.env.PROD) {
    console.debug('[analytics]', name, payload);
    return;
  }
  window.gtag?.('event', name, payload);
}

/** Load privacy-friendly analytics in production when configured. */
export function initAnalytics(): void {
  const token = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
  if (!import.meta.env.PROD || !token) return;
  if (document.querySelector('script[data-cf-beacon]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(script);
}
