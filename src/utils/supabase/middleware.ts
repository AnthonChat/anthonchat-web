import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { middlewareLogger } from '@/lib/logging/loggers'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: claims,
  } = await supabase.auth.getClaims()

  const { pathname } = request.nextUrl;

  middlewareLogger.info('Processing middleware request', 'SUPABASE_MIDDLEWARE_PROCESSING', { pathname }, claims?.claims?.sub || undefined);

  // Paths that are always allowed (login, auth callbacks, static assets)
  const publicPaths = ['/login', '/auth', '/signup'];

  // If user is not authenticated and trying to access a protected path, redirect to login
  if (!claims && !publicPaths.some(path => pathname.startsWith(path))) {
    middlewareLogger.info('Redirecting unauthenticated user to login', 'SUPABASE_MIDDLEWARE_REDIRECT_TO_LOGIN', { pathname });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check onboarding status
  if (claims) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', claims.claims.sub)
      .single();

    middlewareLogger.info('Fetched user data for onboarding check', 'SUPABASE_MIDDLEWARE_USER_DATA_FETCH', { userData, userError }, claims.claims.sub);

    if (userError || !userData) {
      middlewareLogger.error('Failed to fetch user onboarding status', new Error('SUPABASE_USER_ONBOARDING_STATUS_FETCH_ERROR'), { error: userError }, claims.claims.sub);
      // Handle error, maybe redirect to an error page or logout
      const url = request.nextUrl.clone();
      url.pathname = '/login'; // Fallback to login on error
      return NextResponse.redirect(url);
    }

    const onboardingComplete = userData.onboarding_complete;
    middlewareLogger.info('Checked onboarding status', 'SUPABASE_MIDDLEWARE_ONBOARDING_STATUS', { onboardingComplete }, claims.claims.sub);

    // If onboarding is not complete
    if (!onboardingComplete) {
      // If trying to access any page other than signup/complete, redirect to signup/complete
      if (!pathname.startsWith('/signup/complete') && !pathname.startsWith('/auth/callback')) {
        middlewareLogger.info('Redirecting to signup complete', 'SUPABASE_MIDDLEWARE_REDIRECT_TO_SIGNUP_COMPLETE', { pathname }, claims.claims.sub);
        const url = request.nextUrl.clone();
        url.pathname = '/signup/complete';
        return NextResponse.redirect(url);
      }
    } else {
      // If onboarding is complete and trying to access signup, redirect to dashboard
      if (pathname.startsWith('/signup')) {
        middlewareLogger.info('Redirecting to dashboard', 'SUPABASE_MIDDLEWARE_REDIRECT_TO_DASHBOARD', { pathname }, claims.claims.sub);
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
