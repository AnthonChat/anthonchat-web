import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getPathWithLocale, isSupportedLocale, defaultLocale, type Locale } from '@/i18n/routing';

/**
 * A small guard that determines whether a target should be treated as external.
 * We consider http(s), mailto:, tel: as external. Anchors and query-only URLs
 * are treated as internal so they can be locale-prefixed.
 */
function isExternalTarget(target: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(target);
}

/**
 * Split a target into pathname, search and hash parts.
 * Accepts full or relative paths. For empty pathname we treat it as '/'.
 */
function splitTarget(target: string): { pathname: string; search: string; hash: string } {
  let pathname = target;
  let search = '';
  let hash = '';

  const hashIndex = pathname.indexOf('#');
  if (hashIndex >= 0) {
    hash = pathname.slice(hashIndex);
    pathname = pathname.slice(0, hashIndex);
  }

  const queryIndex = pathname.indexOf('?');
  if (queryIndex >= 0) {
    search = pathname.slice(queryIndex);
    pathname = pathname.slice(0, queryIndex);
  }

  if (!pathname) pathname = '/';
  return { pathname, search, hash };
}

export function useLocaleRouter() {
  const router = useRouter();
  const locale = useLocale();

  const buildInternalPath = (target: string) => {
    // Keep external targets untouched
    if (isExternalTarget(target)) return target;

    const { pathname, search, hash } = splitTarget(target);
    // Resolve current locale safely and use getPathWithLocale to ensure single prefix and normalized path
    const currentLocale: Locale = isSupportedLocale((locale ?? '') as string) ? (locale as unknown as Locale) : defaultLocale;
    const withLocale = getPathWithLocale(pathname, currentLocale);
    return `${withLocale}${search}${hash}`;
  };

  const push = (target: string) => {
    const dest = buildInternalPath(target);
    router.push(dest);
  };

  const replace = (target: string) => {
    const dest = buildInternalPath(target);
    router.replace(dest);
  };

  return {
    ...router,
    push,
    replace,
  };
}