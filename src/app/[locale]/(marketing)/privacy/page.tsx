import type { Metadata } from "next";
import { loadMessages } from "@/lib/i18n/messages";
import PrivacyContent from "@/components/features/legal/PrivacyContent";
import { type Locale, locales, getPathWithLocale } from "@/i18n/routing";

type PageParams = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const canonical = `${siteUrl}${getPathWithLocale("/privacy", locale)}`;

  const languages = (locales as readonly Locale[]).reduce<Record<Locale, string>>((acc, l) => {
    acc[l] = `${siteUrl}${getPathWithLocale("/privacy", l)}`;
    return acc;
  }, {} as Record<Locale, string>);

  type LegalMessages = { legal?: { privacy?: { metaTitle?: string; metaDescription?: string } } };
  const legal = (messages as LegalMessages).legal?.privacy ?? {};
  const title = legal.metaTitle ?? "Privacy Policy — TryAnthon";
  const description = legal.metaDescription ?? "Privacy information for TryAnthon.";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PrivacyPage() {
  return <PrivacyContent />;
}