import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isSupportedLocale, type Locale } from './routing';
import { loadMessages } from '@/lib/i18n/messages';

// Provide server-side messages so getTranslations() works on route handlers/pages.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) || defaultLocale;
  const locale: Locale = isSupportedLocale(requested) ? (requested as Locale) : defaultLocale;

  const messages = await loadMessages(locale);

  return {
    locale,
    messages
  };
});