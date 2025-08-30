"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import {
  isSupportedLocale,
  defaultLocale,
  type Locale,
} from "@/i18n/routing";

/**
 * Client-side enhancer that keeps <html lang="…" /> in sync with the active locale.
 * This avoids hydration warnings by leaving SSR to the defaultLocale and adjusting after mount.
 */
export default function HtmlLang() {
  const current = useLocale();
  const locale: Locale = isSupportedLocale((current ?? "") as string)
    ? ((current as unknown) as Locale)
    : defaultLocale;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.setAttribute("data-locale", locale);
      // Optionally set text direction if you add RTL locales in the future.
      // document.documentElement.dir = "ltr";
    }
  }, [locale]);

  return null;
}