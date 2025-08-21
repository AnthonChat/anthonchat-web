"use client";

import { useTranslations } from "next-intl";

type TranslationValues = Record<string, string | number | Date | boolean | null | undefined>;
type Translator = (key: string, values?: TranslationValues) => string;

/**
 * Dev-safe wrapper around next-intl's useTranslations.
 * - In development: logs missing keys to console and returns the key string to avoid throwing.
 * - In production: behaves like regular t(), letting next-intl handle errors according to its config.
 */
export function useSafeTranslations(namespace?: string): Translator {
  const baseT = useTranslations(namespace as never) as unknown as Translator;

  const safeT: Translator = (key, values) => {
    try {
      return baseT(key, values);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[i18n-miss]",
          namespace ? `${namespace}.${String(key)}` : String(key),
          e
        );
      }
      return String(key);
    }
  };

  return safeT;
}