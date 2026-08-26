import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPaymentSession,
  createExportId,
  markDownloadUnlocked,
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
});
