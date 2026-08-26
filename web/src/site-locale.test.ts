import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from './i18n';
import { consumeLangQueryParam, resolveInitialLanguagePreference } from './site-locale';

function createStorage() {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
  };
}

function stubBrowserUrl(path: string): { storage: ReturnType<typeof createStorage> } {
  const storage = createStorage();
  const url = new URL(`https://www.timelinevisualizer.app${path}`);
  vi.stubGlobal('window', {
    location: url,
    localStorage: storage,
  });
  vi.stubGlobal('history', { replaceState: vi.fn() });
  return { storage };
}

describe('site locale bootstrap', () => {
  beforeEach(() => {
    stubBrowserUrl('/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses ?lang= from the URL and persists it', () => {
    const { storage } = stubBrowserUrl('/?lang=ko');
    expect(consumeLangQueryParam()).toBe('ko');
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ko');
    expect(history.replaceState).toHaveBeenCalled();
  });

  it('falls back to stored preference', () => {
    const { storage } = stubBrowserUrl('/');
    storage.setItem(LANGUAGE_STORAGE_KEY, 'ko');
    expect(resolveInitialLanguagePreference()).toBe('ko');
  });

  it('falls back to SITE_LOCALE when nothing is stored', () => {
    expect(resolveInitialLanguagePreference()).toBe('system');
  });
});
