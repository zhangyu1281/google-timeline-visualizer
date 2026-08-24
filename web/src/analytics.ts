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
