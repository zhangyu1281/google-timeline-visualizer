import {
  isLanguagePreference,
  readLanguagePreference,
  writeLanguagePreference,
  type LanguagePreference,
} from './i18n';
import { SITE_LOCALE } from './site-config';

/** Reads `?lang=` once, persists it, and removes the query param from the URL bar. */
export function consumeLangQueryParam(): LanguagePreference | null {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  if (lang === null || !isLanguagePreference(lang)) return null;
  params.delete('lang');
  const rest = params.toString();
  const next = `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`;
  history.replaceState(null, '', next);
  writeLanguagePreference(lang);
  return lang;
}

export function resolveInitialLanguagePreference(): LanguagePreference {
  const fromQuery = consumeLangQueryParam();
  if (fromQuery !== null) return fromQuery;
  const stored = readLanguagePreference();
  if (stored !== 'system') return stored;
  return SITE_LOCALE;
}
