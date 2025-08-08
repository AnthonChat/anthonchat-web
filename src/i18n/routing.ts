export const locales = ['en', 'it'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';

export function isSupportedLocale(l: string): l is Locale {
  return (locales as readonly string[]).includes(l);
}

export function extractLocaleFromPath(pathname: string): { locale: Locale | null; pathnameWithoutLocale: string } {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];
  if (first && isSupportedLocale(first)) {
    const rest = '/' + parts.slice(1).join('/');
    return { locale: first, pathnameWithoutLocale: rest === '/' ? '' : rest };
  }
  return { locale: null, pathnameWithoutLocale: pathname };
}

export function getPathWithLocale(pathname: string, locale: Locale): string {
  // Remove any existing supported locale prefix, then prefix with the desired one
  const { pathnameWithoutLocale } = extractLocaleFromPath(pathname);
  const normalized = pathnameWithoutLocale || '';
  if (normalized === '' || normalized === '/') {
    return `/${locale}`;
  }
  return `/${locale}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

/**
 * Derive a Locale from available signals.
 * Priority:
 *  1) Referer path if it contains a supported locale prefix
 *  2) NEXT_LOCALE cookie
 *  3) defaultLocale
 *
 * This helper accepts raw signals (referer string and cookie value) and returns a valid Locale.
 */
export function deriveLocaleFromSignals(referer?: string | null, nextLocaleCookie?: string | null): Locale {
  // 1) Try referer path
  if (referer) {
    try {
      const url = new URL(referer, 'https://example.com');
      const { locale } = extractLocaleFromPath(url.pathname);
      if (locale && isSupportedLocale(locale)) {
        return locale;
      }
    } catch {
      // ignore invalid referer URL
    }
  }

  // 2) Try NEXT_LOCALE cookie
  if (nextLocaleCookie && isSupportedLocale(nextLocaleCookie)) {
    return nextLocaleCookie as Locale;
  }

  // 3) Fallback
  return defaultLocale;
}