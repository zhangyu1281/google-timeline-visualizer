/** Site-specific overrides for www.timelinevisualizer.app */
export const SITE_ORIGIN = 'https://www.timelinevisualizer.app' as const;

/** When true, MP4 download and share require a Waffo checkout ($2.59 USD). */
export const PAYMENT_ENABLED = import.meta.env.VITE_PAYMENT_ENABLED === 'true';

/** Display price for download unlock (product price is configured in Waffo Dashboard). */
export const PAYMENT_PRICE_USD = '2.59';

/** Default when no saved preference: `'system'` follows the browser language. */
export const SITE_LOCALE = 'system' as const;

/** Show the in-tool language select (all supported locales). */
export const HIDE_LANGUAGE_PICKER = false;

/** Compact header toggle targets for this deployment. */
export const SITE_HEADER_LANGUAGES = ['en', 'ko', 'ja'] as const;
