import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n/routing';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales,
 
  // Used when no locale matches
  defaultLocale
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a file extension
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};