import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { locales, type Locale, isSupportedLocale } from '@/i18n/routing';

export const dynamicParams = false;

export function generateStaticParams() {
  return (locales as readonly string[]).map((locale) => ({ locale }));
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

  // Load messages directly based on the locale from params
  let messages;
  try {
    if (locale === 'en') {
      messages = (await import('../../../public/locales/en.json')).default;
    } else if (locale === 'it') {
      messages = (await import('../../../public/locales/it.json')).default;
    } else {
      messages = (await import('../../../public/locales/en.json')).default;
    }
  } catch (error) {
    console.error('Layout: Error loading messages:', error);
    messages = (await import('../../../public/locales/en.json')).default;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}