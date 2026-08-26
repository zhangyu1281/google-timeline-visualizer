import {
  activeLocale,
  createI18n,
  formattingLocale,
} from './i18n';
import { applyStrings, syncDocumentLang } from './i18n-dom';
import { resolveInitialLanguagePreference } from './site-locale';

const preference = resolveInitialLanguagePreference();
const preferred = navigator.languages.length > 0 ? [...navigator.languages] : [navigator.language];
const locale = activeLocale(preference, preferred);
const i18n = createI18n(locale, formattingLocale(preference, preferred, locale));

applyStrings(document, i18n);
syncDocumentLang(i18n);

for (const link of document.querySelectorAll<HTMLAnchorElement>('.site-lang-link')) {
  const lang = link.getAttribute('hreflang');
  if (!lang) continue;
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  link.href = `${url.pathname}${url.search}${url.hash}`;
}
