import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import {
  locales,
  defaultLocale,
  isSupportedLocale,
  extractLocaleFromPath,
} from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";

/**
 * Protected routes that require authentication
 * These paths (without locale prefix) will redirect to login if no session
 */
const PROTECTED_ROUTES = ["/dashboard"];

/**
 * Auth routes that should redirect to dashboard if already logged in
 */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Check if pathname matches any of the given routes
 */
function matchesRoute(
  pathnameWithoutLocale: string,
  routes: string[]
): boolean {
  return routes.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(`${route}/`)
  );
}

/**
 * Enhanced composed middleware with robust locale handling:
 * 1) Validates and handles invalid locales with proper fallbacks
 * 2) next-intl locale routing (rewrite/redirect) with error handling
 * 3) Supabase session refresh on every request (Edge-compatible)
 * 4) Route protection for authenticated routes
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
  const { locale: pathLocale, pathnameWithoutLocale } =
    extractLocaleFromPath(pathname);

  // If we have a locale in the path but it's not supported, redirect to default locale
  if (pathLocale && !isSupportedLocale(pathLocale)) {
    const redirectUrl = new URL(
      `/${defaultLocale}${pathnameWithoutLocale}`,
      req.url
    );

    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Invalid locale "${pathLocale}" detected, redirecting to "${defaultLocale}"`
      );
    }

    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("x-locale-redirect", "invalid-locale");
    response.headers.set("x-original-locale", pathLocale);
    return response;
  }

  // Determine the effective locale for redirects
  const effectiveLocale =
    pathLocale && isSupportedLocale(pathLocale) ? pathLocale : defaultLocale;

  let supabaseResponse = NextResponse.next({ request: req });

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
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
    // Use getUser() instead of getSession() for security - getUser() validates with the server
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Development diagnostics
    if (process.env.NODE_ENV === "development") {
      supabaseResponse.headers.set("x-auth-user", user ? "1" : "0");
      if (error)
        supabaseResponse.headers.set(
          "x-auth-error",
          String(error.message).slice(0, 120)
        );
    }

    // Route protection logic
    const isProtectedRoute = matchesRoute(
      pathnameWithoutLocale,
      PROTECTED_ROUTES
    );
    const isAuthRoute = matchesRoute(pathnameWithoutLocale, AUTH_ROUTES);

    if (isProtectedRoute && !user) {
      // User is not authenticated but trying to access protected route
      const loginUrl = new URL(`/${effectiveLocale}/login`, req.url);
      // Preserve the original URL for redirect after login
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && user) {
      // User is authenticated but trying to access auth routes (login/signup)
      // Redirect to dashboard, preserving any query parameters (e.g., channel linking)
      const dashboardUrl = new URL(`/${effectiveLocale}/dashboard`, req.url);

      // Preserve important query parameters for channel linking flow
      const link = req.nextUrl.searchParams.get("link");
      const channel = req.nextUrl.searchParams.get("channel");
      const message = req.nextUrl.searchParams.get("message");

      if (link) dashboardUrl.searchParams.set("link", link);
      if (channel) dashboardUrl.searchParams.set("channel", channel);
      if (message) dashboardUrl.searchParams.set("message", message);

      return NextResponse.redirect(dashboardUrl);
    }
  } catch {
    // Never block the request due to middleware errors
    if (process.env.NODE_ENV === "development") {
      supabaseResponse.headers.set("x-auth-mw", "failed");
    }
  }

  // Now run intl middleware on the response
  let res: NextResponse;

  try {
    // Run next-intl to resolve the locale-aware URL
    res = intlMiddleware(req);

    // Copy over cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
  } catch (error) {
    // If intl middleware fails, create a fallback response
    if (process.env.NODE_ENV === "development") {
      console.error("Intl middleware error:", error);
    }

    // Create fallback response and redirect to default locale if needed
    const fallbackUrl = pathname.startsWith(`/${defaultLocale}`)
      ? req.url
      : new URL(`/${defaultLocale}${pathname}`, req.url);

    res = pathname.startsWith(`/${defaultLocale}`)
      ? NextResponse.next()
      : NextResponse.redirect(fallbackUrl);

    res.headers.set("x-intl-fallback", "true");

    // Copy over cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
  }

  // Expose pathname and host information so server actions can build correct URLs
  res.headers.set("x-pathname", req.nextUrl.pathname);
  res.headers.set("x-forwarded-host", req.nextUrl.host);
  res.headers.set("x-forwarded-proto", req.nextUrl.protocol);
  res.headers.set("origin", req.url);

  return res;
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a file extension
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
