export type Locales = "en" | "it";

// return the current locale set in the device (this could be different from the app supported languages)
// export const getCurrentLocale = (): Locales => I18n.currentLocale();

/**
 * return the primary component of the current locale (i.e: it-US -> it)
 * if the current locale (the language set in the device) is not a language supported by the app
 * the fallback will returned
 * @param fallback
 */
export const getLocalePrimaryWithFallback = (fallback: Locales = "it") => fallback;