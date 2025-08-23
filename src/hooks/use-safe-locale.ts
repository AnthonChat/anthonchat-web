"use client";

import { useLocale } from "next-intl";
import { defaultLocale, type Locale } from "@/i18n/routing";

/**
 * Safe locale hook that handles missing locale context gracefully.
 * Returns the current locale or defaults to the default locale if not available.
 */
export function useSafeLocale(): Locale {
  try {
    return useLocale() as Locale;
  } catch {
    // Handle case where useLocale is not available (e.g., in not-found page)
    return defaultLocale;
  }
}