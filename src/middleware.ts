import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';

/**
 * Narrow CookieOptions type to avoid `any` while remaining compatible
 * with NextResponse.cookies.set/remove options.
 */

/**
 * Composed middleware:
 * 1) next-intl locale routing (rewrite/redirect)
 * 2) Supabase session refresh on every request (Edge-compatible)
 *
 * Notes:
 * - Uses the same env vars as our server/client Supabase factories:
 *   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * - Adds x-pathname header to support server actions that read it
 * - Adds lightweight diagnostics headers in development
 */
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
});

export default async function middleware(req: NextRequest) {
  // First, run next-intl to resolve the locale-aware URL
  const res = intlMiddleware(req);

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