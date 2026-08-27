import { PAYMENT_ENABLED, PAYMENT_PRICE_USD } from './site-config';

const STORAGE_SESSION = 'tv-payment-session-id';
const STORAGE_EXPORT = 'tv-payment-export-id';
const STORAGE_UNLOCKED = 'tv-payment-unlocked';

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  exportId: string;
}

/** postMessage type sent from /payment/complete.html popup back to the opener. */
export const PAYMENT_SUCCESS_MESSAGE = 'tv-payment-success';

export interface PaymentSuccessPayload {
  type: typeof PAYMENT_SUCCESS_MESSAGE;
  exportId: string;
  sessionId?: string;
}

export function isPaymentSuccessPayload(data: unknown): data is PaymentSuccessPayload {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return record.type === PAYMENT_SUCCESS_MESSAGE
    && typeof record.exportId === 'string'
    && record.exportId.length > 0
    && (record.sessionId === undefined || typeof record.sessionId === 'string');
}

export function isPaymentEnabled(): boolean {
  return PAYMENT_ENABLED;
}

export function paymentPriceLabel(): string {
  return `$${PAYMENT_PRICE_USD}`;
}

export function createExportId(): string {
  return crypto.randomUUID();
}

export function readStoredPaymentSession(): string | null {
  return sessionStorage.getItem(STORAGE_SESSION);
}

export function readStoredExportId(): string | null {
  return sessionStorage.getItem(STORAGE_EXPORT);
}

export function isDownloadUnlocked(exportId: string | null): boolean {
  if (!isPaymentEnabled()) return true;
  if (!exportId) return false;
  const unlockedExport = sessionStorage.getItem(STORAGE_UNLOCKED);
  return unlockedExport === exportId;
}

export function markDownloadUnlocked(exportId: string, sessionId: string): void {
  sessionStorage.setItem(STORAGE_UNLOCKED, exportId);
  sessionStorage.setItem(STORAGE_SESSION, sessionId);
  sessionStorage.setItem(STORAGE_EXPORT, exportId);
}

export function clearPaymentSession(): void {
  sessionStorage.removeItem(STORAGE_SESSION);
  sessionStorage.removeItem(STORAGE_EXPORT);
  sessionStorage.removeItem(STORAGE_UNLOCKED);
}

export async function createCheckoutSession(exportId: string, locale: string): Promise<CheckoutSession> {
  const response = await fetch('/api/checkout/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exportId, locale }),
  });
  const payload = await response.json() as {
    configured?: boolean;
    checkoutUrl?: string;
    sessionId?: string;
    exportId?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? 'Could not start checkout');
  }
  if (!payload.checkoutUrl || !payload.sessionId) {
    throw new Error('Checkout response was incomplete');
  }
  const session = {
    checkoutUrl: payload.checkoutUrl,
    sessionId: payload.sessionId,
    exportId: payload.exportId ?? exportId,
  };
  storePendingPaymentSession(session.sessionId, session.exportId);
  return session;
}

export function storePendingPaymentSession(sessionId: string, exportId: string): void {
  sessionStorage.setItem(STORAGE_SESSION, sessionId);
  sessionStorage.setItem(STORAGE_EXPORT, exportId);
}

export async function fetchPaymentStatus(sessionId: string, exportId?: string): Promise<boolean> {
  const params = new URLSearchParams();
  if (sessionId.startsWith('cs_')) params.set('sessionId', sessionId);
  if (exportId) params.set('exportId', exportId);
  const response = await fetch(`/api/payment/status?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) return false;
  const payload = await response.json() as { paid?: boolean; configured?: boolean };
  return payload.paid === true;
}

const CHECKOUT_POPUP_FEATURES = 'popup,width=520,height=720';
const CHECKOUT_POPUP_NAME = 'waffo-checkout';

/** Open a blank checkout popup synchronously (must run inside a user click handler). */
export function openCheckoutPopup(): Window | null {
  return window.open('about:blank', CHECKOUT_POPUP_NAME, CHECKOUT_POPUP_FEATURES);
}

/** Navigate a popup opened via openCheckoutPopup to the Waffo checkout URL. */
export function loadCheckoutInPopup(popup: Window, checkoutUrl: string): void {
  popup.location.href = checkoutUrl;
}

export async function pollPaymentStatus(
  sessionId: string,
  signal: AbortSignal,
  intervalMs = 2000,
  exportId?: string,
): Promise<boolean> {
  while (!signal.aborted) {
    if (await fetchPaymentStatus(sessionId, exportId)) return true;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, intervalMs);
      signal.addEventListener('abort', () => {
        window.clearTimeout(timer);
        reject(new DOMException('Polling aborted', 'AbortError'));
      }, { once: true });
    });
  }
  return false;
}

export function paymentReturnExportId(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') !== 'success') return null;
  const exportId = params.get('exportId');
  return exportId && exportId.length > 0 ? exportId : null;
}

export function clearPaymentReturnParams(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('payment')) return;
  url.searchParams.delete('payment');
  url.searchParams.delete('exportId');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
