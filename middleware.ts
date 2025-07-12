import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('Middleware - Entry point reached for:', request.nextUrl.pathname)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl;

  console.log('Middleware - Running for path:', pathname);
  console.log('Middleware - User:', user ? user.id : 'No user');

  // Paths that are always allowed (login, auth callbacks, static assets)
  const publicPaths = ['/login', '/auth', '/signup'];

  // If user is not authenticated and trying to access a protected path, redirect to login
  if (!user && !publicPaths.some(path => pathname.startsWith(path))) {
    console.log('Middleware - No user, redirecting to login from:', pathname);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check onboarding status
  if (user) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single();

    console.log('Middleware - User data:', userData);
    console.log('Middleware - User error:', userError);

    if (userError || !userData) {
      console.error("Error fetching user onboarding status:", userError);
      // Handle error, maybe redirect to an error page or logout
      const url = request.nextUrl.clone();
      url.pathname = '/login'; // Fallback to login on error
      return NextResponse.redirect(url);
    }

    const onboardingComplete = userData.onboarding_complete;
    console.log('Middleware - Onboarding complete:', onboardingComplete);

    // If onboarding is not complete
    if (!onboardingComplete) {
      // If trying to access any page other than signup/complete, redirect to signup/complete
      if (!pathname.startsWith('/signup/complete') && !pathname.startsWith('/auth/callback')) {
        console.log('Middleware - Redirecting to signup/complete');
        const url = request.nextUrl.clone();
        url.pathname = '/signup/complete';
        return NextResponse.redirect(url);
      }
    } else {
      // If onboarding is complete and trying to access signup, redirect to dashboard
      if (pathname.startsWith('/signup')) {
        console.log('Middleware - Redirecting to dashboard');
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
