"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  locales,
  extractLocaleFromPath,
  getPathWithLocale,
  isSupportedLocale,
  defaultLocale,
  type Locale,
} from "@/i18n/routing";

/**
 * Language switcher optimized for speed:
 * - Uses Next.js Link prefetch to fetch the RSC payload for the target locale in advance.
 * - Calls router.prefetch for alternate locales on mount and on hover for instant transitions.
 * - Computes paths via routing helpers (no string replace bugs).
 */
export default function LanguageSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const activeLocale: Locale = isSupportedLocale((current ?? "") as string)
    ? ((current as unknown) as Locale)
    : defaultLocale;

  // Derive the current path without any locale prefix
  const basePath = useMemo(() => {
    const { pathnameWithoutLocale } = extractLocaleFromPath(pathname || "/");
    return pathnameWithoutLocale || "/";
  }, [pathname]);

  // Precompute destinations for all locales
  const destinations = useMemo(() => {
    return (locales as readonly Locale[]).reduce<Record<Locale, string>>(
      (acc, l) => {
        acc[l] = getPathWithLocale(basePath, l);
        return acc;
      },
      {} as Record<Locale, string>
    );
  }, [basePath]);

  // Warm up Next.js router cache for alternate locales
  useEffect(() => {
    (locales as readonly Locale[]).forEach((l) => {
      if (l !== activeLocale) {
        try {
          // Prefetch is a fire-and-forget hint (returns void)
          router.prefetch(destinations[l]);
        } catch {
          // ignore
        }
      }
    });
  }, [activeLocale, destinations, router]);

  return (
    <div className="flex gap-2">
      {(locales as readonly Locale[]).map((loc) => {
        const href = destinations[loc];

        return (
          <Link
            key={loc}
            href={href}
            prefetch
            onMouseEnter={() => {
              // Extra safety: prefetch again on hover to ensure it’s hot
              try {
                router.prefetch(href);
              } catch {
                // ignore
              }
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeLocale === loc
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {loc.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}