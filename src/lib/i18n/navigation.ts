import { redirect } from "next/navigation";
import { getPathWithLocale, type Locale } from "@/i18n/routing";

/**
 * Locale-aware redirect function for server components
 * 
 * @param path - The path to redirect to (without locale prefix)
 * @param locale - The current locale
 * 
 * @example
 * localeRedirect("/dashboard", "en") // redirects to /en/dashboard
 */
export function localeRedirect(path: string, locale: Locale): never {
  const localeAwarePath = getPathWithLocale(path, locale);
  redirect(localeAwarePath);
}

/**
 * Get locale-aware path for use in server components
 * 
 * @param path - The path to make locale-aware
 * @param locale - The current locale
 * @returns The path with locale prefix
 */
export function getLocalePath(path: string, locale: Locale): string {
  return getPathWithLocale(path, locale);
}