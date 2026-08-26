/** Site-specific overrides for www.timelinevisualizer.app */
export const SITE_ORIGIN = 'https://www.timelinevisualizer.app' as const;

/** Default when no saved preference: `'system'` follows the browser language. */
export const SITE_LOCALE = 'system' as const;

/** Show the in-tool language select (all supported locales). */
export const HIDE_LANGUAGE_PICKER = false;

/** Compact header toggle targets for this deployment. */
export const SITE_HEADER_LANGUAGES = ['en', 'ko'] as const;
