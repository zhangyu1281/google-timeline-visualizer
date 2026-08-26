import { WaffoPancake } from '@waffo/pancake-ts';

let client: WaffoPancake | null = null;

export function isWaffoConfigured(): boolean {
  return Boolean(
    process.env.WAFFO_MERCHANT_ID
    && process.env.WAFFO_PRIVATE_KEY
    && process.env.WAFFO_PRODUCT_ID,
  );
}

export function getWaffoClient(): WaffoPancake {
  if (!isWaffoConfigured()) {
    throw new Error('Waffo is not configured');
  }
  if (!client) {
    client = new WaffoPancake({
      merchantId: process.env.WAFFO_MERCHANT_ID!,
      privateKey: process.env.WAFFO_PRIVATE_KEY!,
    });
  }
  return client;
}

export function siteOrigin(): string {
  return process.env.SITE_ORIGIN ?? 'https://www.timelinevisualizer.app';
}

/** Map app locale tags to Waffo checkout language codes. */
export function waffoCheckoutLanguage(locale: string | undefined): string | undefined {
  if (!locale || locale === 'system') return 'en';
  const map: Record<string, string> = {
    en: 'en',
    ko: 'ko-KR',
    ja: 'ja-JP',
    'zh-CN': 'zh-Hans',
    'zh-TW': 'zh-Hant-TW',
    es: 'es-MX',
    fr: 'fr',
    de: 'de',
    'pt-BR': 'pt-BR',
  };
  return map[locale] ?? 'en';
}
