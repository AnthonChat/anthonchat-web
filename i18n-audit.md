# I18n audit and quick fixes

This document lists top issues in the i18n integration and concise fixes.

## Top issues and quick fixes proposal

1) Locale detection in signup server action is unreliable
- Why it matters: redirects after signup may land in the default locale (usually /en)
- Location: src/lib/auth/actions.ts (getCurrentLocale)
- Quick fix: derive locale from a reliable signal (Referer header or NEXT_LOCALE cookie) and use extractLocaleFromPath to parse; fallback to defaultLocale
- Quick steps:
  - Import extractLocaleFromPath from src/i18n/routing
  - Read headers().get('referer') or cookies().get('NEXT_LOCALE')
  - Compute locale = parsed ?? defaultLocale
  - Use getPathWithLocale(path, locale) for redirects
- Impact: medium-high

2) HTML lang attribute is hard-coded to English
- Why: accessibility and SEO
- Location: src/app/layout.tsx (html lang="en")
- Quick fix: derive locale and set html lang accordingly; move provider tree into src/app/[locale]/layout.tsx and set <html lang={locale}>
- Quick steps:
  - Derive locale from route or headers
  - Use <html lang={locale}> in locale-specific layout
- Impact: high

3) 404 page not localized and redirects are noisy
- Why: English-only 404; redirect flicker
- Location: src/app/not-found.tsx
- Quick fix: create locale-specific 404 under src/app/[locale]/not-found.tsx and remove hard redirect to /en
- Quick steps:
  - Add src/app/[locale]/not-found.tsx
  - Use LocaleLink / getPathWithLocale in redirects
- Impact: medium

4) use-locale-router edge-case handling is naive
- Why: may double-prefix or break external URLs
- Location: src/hooks/use-locale-router.ts
- Quick fix: guard external URLs (http(s), mailto:, tel:, #, ?) and normalize via getPathWithLocale
- Quick steps:
  - Check for http|https|mailto|tel|#|?
  - Build path with getPathWithLocale
- Impact: high

5) LanguageSwitcher should preserve query and hash
- Why: locale switch should preserve URL query/hash
- Location: src/components/features/i18n/LanguageSwitcher.tsx
- Quick fix: reconstruct URL using usePathname(), useSearchParams(), and location.hash
- Quick steps:
  - Read pathname, searchParams, hash
  - Build new URL with new locale prefix
  - Navigate
- Impact: medium

6) Middleware localePrefix strategy
- Why: canonical vs as-needed URLs
- Location: src/middleware.ts
- Quick fix: decide on "always" vs "as-needed" and adjust config
- Impact: medium

7) Not all internal links are locale-aware
- Why: hard-coded '/en' bypasses LocaleLink
- Location: various (not-found, redirects)
- Quick fix: replace with LocaleLink or getPathWithLocale
- Impact: low-medium

8) Translation loading and flash risk
- Why: missing keys can flash or show fallback
- Location: i18n/request.ts and layout.tsx
- Quick fix: preload messages per locale or ensure safe fallbacks
- Impact: medium

9) Typing of locale param in locale layout
- Why: currently params is a Promise
- Location: src/app/[locale]/layout.tsx
- Quick fix: use params: { locale: Locale } and remove await
- Impact: low

10) Testing plan
- Quick fix: add manual QA steps or tests for routing, signup redirect, 404
- Impact: low

End of audit.