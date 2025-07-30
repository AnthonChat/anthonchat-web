import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.info("Middleware entry", {
    pathname: request.nextUrl.pathname,
  });

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data: claims } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const userId = claims?.claims?.sub;

  console.info(
    "Processing middleware request",
    { pathname },
    userId || undefined
  );

  // Paths that are always allowed (login, auth callbacks, static assets)
  const publicPaths = ["/login", "/auth", "/signup"];

  // If user is not authenticated and trying to access a protected path, redirect to login
  if (!claims && !publicPaths.some((path) => pathname.startsWith(path))) {
    console.info(
      "Redirecting unauthenticated user to login",
      { pathname }
    );
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check onboarding status
  if (claims && userId) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("onboarding_complete")
      .eq("id", userId)
      .single();

    console.info(
      "Fetched user data for onboarding check",
      { userData, userError },
      userId
    );

    if (userError || !userData) {
      console.error(
        "Failed to fetch user onboarding status",
        { error: userError },
        userId
      );
      // Handle error, maybe redirect to an error page or logout
      const url = request.nextUrl.clone();
      url.pathname = "/login"; // Fallback to login on error
      return NextResponse.redirect(url);
    }

    const onboardingComplete = userData.onboarding_complete;
    console.info(
      "Checked onboarding status",
      { onboardingComplete },
      userId
    );

    // If onboarding is not complete
    if (!onboardingComplete) {
      // If trying to access any page other than signup/complete, redirect to signup/complete
      if (
        !pathname.startsWith("/signup/complete") &&
        !pathname.startsWith("/auth/callback")
      ) {
        console.info(
          "Redirecting to signup complete",
          { pathname },
          userId
        );
        const url = request.nextUrl.clone();
        url.pathname = "/signup/complete";
        return NextResponse.redirect(url);
      }
    } else {
      // If onboarding is complete and trying to access signup, redirect to dashboard
      if (pathname.startsWith("/signup")) {
        console.info(
          "Redirecting to dashboard",
          { pathname },
          userId
        );
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
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

  return supabaseResponse;
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
