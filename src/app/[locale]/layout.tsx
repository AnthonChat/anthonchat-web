import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { Metadata } from "next";

import {
  locales,
  type Locale,
  isSupportedLocale,
  getPathWithLocale,
  defaultLocale,
} from "@/i18n/routing";
import { loadMessages } from "@/lib/i18n/messages";
import HtmlLang from "@/components/features/i18n/HtmlLang";
import { AccessibilityFloatingMenu } from "@/components/features/accessibility";

export const dynamicParams = false;

export function generateStaticParams() {
  return (locales as readonly string[]).map((locale) => ({ locale }));
}

/**
 * Locale-aware metadata factory.
 * Uses localized strings from messages and provides alternates/hreflang entries.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const localeParam = (await params)?.locale as Locale;
  const locale = isSupportedLocale(localeParam) ? localeParam : defaultLocale;

  // Load messages (typed to next-intl's Messages type)
  const messages = await loadMessages(locale);
  // Narrow the shape locally for safe access without `any`.
  type SiteMessages = {
    common?: { appName?: string; appDescription?: string };
    marketing?: { hero?: { title?: string; description?: string } };
  };
  const local = messages as unknown as SiteMessages;

  const siteName = local?.common?.appName ?? "TryAnthon";
  const title = local?.marketing?.hero?.title ?? siteName;
  const description =
    local?.common?.appDescription ??
    local?.marketing?.hero?.description ??
    "An AI coach that provides personalized, multi-channel support for athletes and teams.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  // Build alternates.languages using the strongly-typed Locale values.
  const languages: Record<Locale, string> = {} as Record<Locale, string>;
  (locales as readonly Locale[]).forEach((l) => {
    languages[l] = `${siteUrl}${getPathWithLocale("/", l)}`;
  });

  const alternates: Metadata["alternates"] = {
    canonical: `${siteUrl}${getPathWithLocale("/", locale)}`,
    languages,
  };

  // Build a single, canonical document title string to avoid duplication
  const fullTitle =
    title && title !== siteName ? `${siteName} | ${title}` : siteName;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title,
      description,
      siteName,
      url: `${siteUrl}${getPathWithLocale("/", locale)}`,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates,
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  // Next.js generates params as a Promise for layout props — await it and use the typed Locale.
  const { locale: localeParam } = await params;

  if (!isSupportedLocale(localeParam)) {
    notFound();
  }

  const locale = localeParam as Locale;

  // Load messages via centralized loader (handles fallbacks)
  const messages = await loadMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* Keep <html lang> synchronized with active locale on the client */}
      <HtmlLang />
      {children}
      <AccessibilityFloatingMenu />
    </NextIntlClientProvider>
  );
}
