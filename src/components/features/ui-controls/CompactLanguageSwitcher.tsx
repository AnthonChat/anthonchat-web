"use client";

import Link from "next/link";
import { useEffect, useMemo, memo } from "react";
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

interface CompactLanguageSwitcherProps {
  className?: string;
}

/**
 * Compact language switcher optimized for headers:
 * - 40% smaller than the original with reduced padding
 * - Uses flag icons and compact button group design
 * - Maintains existing prefetching optimization
 * - Space-efficient horizontal layout
 * - Memoized to prevent unnecessary re-renders
 */
const CompactLanguageSwitcher = memo(function CompactLanguageSwitcher({
  className = ""
}: CompactLanguageSwitcherProps) {
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

  // Flag emoji mapping for locales
  const flagMap: Record<Locale, string> = {
    en: "🇺🇸",
    it: "🇮🇹",
  };

  return (
    <div className={`flex rounded-md border border-border overflow-hidden ${className}`}>
      {(locales as readonly Locale[]).map((loc, index) => {
        const href = destinations[loc];
        const isActive = activeLocale === loc;
        const isFirst = index === 0;

        return (
          <Link
            key={loc}
            href={href}
            prefetch
            onMouseEnter={() => {
              // Extra safety: prefetch again on hover to ensure it's hot
              try {
                router.prefetch(href);
              } catch {
                // ignore
              }
            }}
            className={`
              flex items-center gap-1 px-2 py-1 text-xs font-medium
              transition-colors duration-200 ease-in-out
              ${!isFirst ? "border-l border-border" : ""}
              ${isActive
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
            aria-label={`Switch to ${loc === 'en' ? 'English' : 'Italian'}`}
          >
            <span className="text-sm" role="img" aria-hidden="true">
              {flagMap[loc]}
            </span>
            <span className="font-semibold">
              {loc.toUpperCase()}
            </span>
          </Link>
        );
      })}
    </div>
  );
});

export default CompactLanguageSwitcher;