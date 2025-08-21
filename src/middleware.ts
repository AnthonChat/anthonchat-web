import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, isSupportedLocale, extractLocaleFromPath } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';

/**
 * Enhanced composed middleware with robust locale handling:
 * 1) Validates and handles invalid locales with proper fallbacks
 * 2) next-intl locale routing (rewrite/redirect) with error handling
 * 3) Supabase session refresh on every request (Edge-compatible)
 *
 * Notes:
 * - Uses the same env vars as our server/client Supabase factories:
 *   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * - Adds x-pathname header to support server actions that read it
 * - Adds lightweight diagnostics headers in development
 * - Gracefully handles invalid locales by redirecting to default locale
 */
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  alternateLinks: false, // Disable to prevent issues with invalid locales
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Check for invalid locale in pathname and handle gracefully
  const { locale: pathLocale, pathnameWithoutLocale } = extractLocaleFromPath(pathname);
  
  // If we have a locale in the path but it's not supported, redirect to default locale
  if (pathLocale && !isSupportedLocale(pathLocale)) {
    const redirectUrl = new URL(`/${defaultLocale}${pathnameWithoutLocale}`, req.url);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Invalid locale "${pathLocale}" detected, redirecting to "${defaultLocale}"`);
    }
    
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('x-locale-redirect', 'invalid-locale');
    response.headers.set('x-original-locale', pathLocale);
    return response;
  }

  let res: NextResponse;
  
  try {
    // Run next-intl to resolve the locale-aware URL
    res = intlMiddleware(req);
  } catch (error) {
    // If intl middleware fails, create a fallback response
    if (process.env.NODE_ENV === 'development') {
      console.error('Intl middleware error:', error);
    }
    
    // Create fallback response and redirect to default locale if needed
    const fallbackUrl = pathname.startsWith(`/${defaultLocale}`)
      ? req.url
      : new URL(`/${defaultLocale}${pathname}`, req.url);
    
    res = pathname.startsWith(`/${defaultLocale}`)
      ? NextResponse.next()
      : NextResponse.redirect(fallbackUrl);
    
    res.headers.set('x-intl-fallback', 'true');
  }

  // Expose pathname so server actions relying on it can read it
  res.headers.set('x-pathname', req.nextUrl.pathname);

  try {
    // Bridge cookies between Supabase SSR client and Next middleware response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // NextResponse cookies.set supports object form
                res.cookies.set({ name, value, ...(options || {}) });
              });
            } catch {
              // Ignore if setting cookies fails (e.g., immutable response)
            }
          },
        },
      }
    );

    // Trigger a session read to refresh tokens if needed
    const { data, error } = await supabase.auth.getSession();

    // Development diagnostics
    if (process.env.NODE_ENV === 'development') {
      res.headers.set('x-auth-session', data.session ? '1' : '0');
      if (error) res.headers.set('x-auth-error', String(error.message).slice(0, 120));
    }
  } catch {
    // Never block the request due to middleware errors
    if (process.env.NODE_ENV === 'development') {
      res.headers.set('x-auth-mw', 'failed');
    }
  }

  return res;
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a file extension
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};