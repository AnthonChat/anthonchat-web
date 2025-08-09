import type { Locale } from "@/i18n/routing";
import type { AbstractIntlMessages } from "next-intl";

/**
 * Bundle-safe message loading for Vercel (Serverless/Edge).
 * Avoids Node fs/path and ensures JSON is included in the build output.
 */
export type Messages = AbstractIntlMessages;

// Statically imported dictionaries (code-split per locale)
const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: () =>
    import("@/locales/en.json").then((m) => m.default as Messages),
  it: () =>
    import("@/locales/it.json").then((m) => m.default as Messages),
};

const DEFAULT_LOCALE: Locale = "en";

export async function loadMessages(locale: Locale): Promise<Messages> {
  const load =
    dictionaries[locale as Locale] ?? dictionaries[DEFAULT_LOCALE];

  try {
    return await load();
  } catch {
    // As a final guard, try default locale; if it also fails, return empty object
    try {
      return await dictionaries[DEFAULT_LOCALE]();
    } catch {
      return {};
    }
  }
}