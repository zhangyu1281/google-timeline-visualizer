import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPaymentSession,
  createExportId,
  isPaymentSuccessPayload,
  loadCheckoutInPopup,
  markDownloadUnlocked,
  openCheckoutPopup,
  PAYMENT_SUCCESS_MESSAGE,
  paymentPriceLabel,
  paymentReturnExportId,
  storePendingPaymentSession,
} from './payment';

const storage = new Map<string, string>();

function mockBrowserLocation(url: string): void {
  const parsed = new URL(url, 'http://localhost');
  vi.stubGlobal('window', {
    history: {
      replaceState: (_state: unknown, _title: string, nextUrl: string) => {
        mockBrowserLocation(nextUrl);
      },
    },
    location: parsed,
  });
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    get length() {
      return storage.size;
    },
    key: () => null,
  });
  mockBrowserLocation('/');
});

afterEach(() => {
  clearPaymentSession();
  vi.unstubAllGlobals();
});

describe('payment', () => {
  it('returns price label', () => {
    expect(paymentPriceLabel()).toBe('$2.59');
  });

  it('creates export ids', () => {
    expect(createExportId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('marks export as unlocked in session storage', () => {
    markDownloadUnlocked('export-1', 'cs_test');
    expect(sessionStorage.getItem('tv-payment-unlocked')).toBe('export-1');
    expect(sessionStorage.getItem('tv-payment-session-id')).toBe('cs_test');
  });

  it('stores pending session ids', () => {
    storePendingPaymentSession('cs_abc', 'export-1');
    expect(sessionStorage.getItem('tv-payment-session-id')).toBe('cs_abc');
    expect(sessionStorage.getItem('tv-payment-export-id')).toBe('export-1');
  });

  it('reads payment return export id from query params', () => {
    mockBrowserLocation('/?payment=success&exportId=export-123');
    expect(paymentReturnExportId()).toBe('export-123');
  });

  it('opens a blank checkout popup synchronously', () => {
    const popup = { location: { href: '' } };
    const open = vi.fn(() => popup);
    vi.stubGlobal('window', { open });
    expect(openCheckoutPopup()).toBe(popup);
    expect(open).toHaveBeenCalledWith(
      'about:blank',
      'waffo-checkout',
      'popup,width=520,height=720',
    );
  });

  it('loads checkout url into popup', () => {
    const popup = { location: { href: '' }, opener: window };
    loadCheckoutInPopup(popup as unknown as Window, 'https://pancake.waffo.ai/checkout/cs_test');
    expect(popup.opener).toBe(window);
    expect(popup.location.href).toBe('https://pancake.waffo.ai/checkout/cs_test');
  });

  it('recognizes payment success postMessage payloads', () => {
    expect(isPaymentSuccessPayload({
      type: PAYMENT_SUCCESS_MESSAGE,
      exportId: 'export-1',
      sessionId: 'cs_test',
    })).toBe(true);
    expect(isPaymentSuccessPayload({ type: 'other', exportId: 'x' })).toBe(false);
    expect(isPaymentSuccessPayload(null)).toBe(false);
  });
});
