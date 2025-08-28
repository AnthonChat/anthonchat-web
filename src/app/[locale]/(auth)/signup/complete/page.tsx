import { createClient } from "@/lib/db/server";
import SignupCompleteForm from "@/components/features/auth/SignupCompleteForm";
import DeeplinkOnMount from "@/components/features/auth/DeeplinkOnMount";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function SignupCompletePage({
  searchParams,
}: {
  // We accept searchParams here so we can preserve and honor incoming
  // query params such as `channel` and `link` that may have been forwarded
  // by the server-side signup flow. If the user is already onboarded but
  // the request includes a registration `channel=telegram` and `link` nonce,
  // we avoid a server-side redirect to /dashboard so the client-side code
  // can run and trigger the Telegram deeplink.
  searchParams?: Promise<{ 
    message?: string; 
    link?: string; 
    channel?: string;
    skip_onboarding?: string;
    channel_error?: string;
    show_fallback?: string;
  }>;
}) {
  const supabase = await createClient();
  const locale = await getLocale();
  const tAuth = await getTranslations('auth');
  // `searchParams` may be a Promise-like object in Next.js server routes.
  // Await it to get a resolved params object before reading properties.
  // This prevents "searchParams should be awaited" runtime errors.
  const resolvedSearchParams = await searchParams;

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  const userId = claims.claims.sub;

  // Check for skipOnboarding parameter - if present, redirect to dashboard immediately
  const shouldSkipOnboarding = resolvedSearchParams?.skip_onboarding === 'true';
  
  if (shouldSkipOnboarding) {
    // Build dashboard redirect URL with channel linking context
    const dashboardParams: Record<string, string> = {};
    
    if (resolvedSearchParams?.channel) {
      dashboardParams.channel_linked = 'true';
      dashboardParams.channel = resolvedSearchParams.channel;
    }
    
    if (resolvedSearchParams?.channel_error === 'true') {
      dashboardParams.channel_error = 'true';
    }
    
    if (resolvedSearchParams?.message) {
      dashboardParams.message = resolvedSearchParams.message;
    }

    // Create dashboard URL with parameters
    const dashboardUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    Object.entries(dashboardParams).forEach(([key, value]) => {
      dashboardUrl.searchParams.set(key, value);
    });

    localeRedirect(dashboardUrl.pathname + dashboardUrl.search, locale as Locale);
  }

  // 1. Check if user is already onboarded using the function
  const { data: isOnboarded, error: rpcError } = await supabase.rpc(
    "check_onboarding_complete",
    {
      user_id_param: userId,
    }
  );

  // If the check fails, we can log it but we'll still show the form
  if (rpcError) {
    console.error("ONBOARDING_CHECK_FUNCTION_ERROR", {
      rpcError: rpcError.message,
      userId: userId,
    });
  }

  // 2. If the function returns `true`, redirect immediately.
  // However, if the request includes channel/link query params (for example
  // when the signup flow was initiated from Telegram), avoid redirecting on
  // the server so the client can read those params and perform the deeplink
  // navigation. Only redirect server-side when there are no channel/link params.
  const incomingChannel = resolvedSearchParams?.channel;
  const incomingLink = resolvedSearchParams?.link;
  const shouldPreserveForClient =
    !!incomingChannel &&
    !!incomingLink &&
    ["telegram", "whatsapp"].includes(incomingChannel.toLowerCase());

  // If user is already onboarded and we don't need to preserve for client, redirect to dashboard
  if (isOnboarded === true && !shouldPreserveForClient && !shouldSkipOnboarding) {
    localeRedirect("/dashboard", locale as Locale);
  }

  // If user is already onboarded but we have skipOnboarding parameter, redirect with context
  if (isOnboarded === true && shouldSkipOnboarding) {
    const dashboardParams: Record<string, string> = {};
    
    if (resolvedSearchParams?.channel) {
      dashboardParams.channel_linked = 'true';
      dashboardParams.channel = resolvedSearchParams.channel;
    }
    
    if (resolvedSearchParams?.message) {
      dashboardParams.message = resolvedSearchParams.message;
    }

    const dashboardUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    Object.entries(dashboardParams).forEach(([key, value]) => {
      dashboardUrl.searchParams.set(key, value);
    });

    localeRedirect(dashboardUrl.pathname + dashboardUrl.search, locale as Locale);
  }

  // 3. If the user is NOT onboarded, we continue and fetch their profile details
  //    to pre-fill the form. Notice `onboarding_complete` is removed from the select.
  const { data: userProfile } = await supabase
    .from("users")
    .select("nickname, first_name, last_name")
    .eq("id", userId)
    .single();

  // Fetch all active channels from database
  const { data: channels } = await supabase
    .from("channels")
    .select("id, is_active, link_method")
    .eq("is_active", true);

  // Check existing channel connections
  const { data: userChannels, error: userChannelsError } = await supabase
    .from("user_channels")
    .select("channel_id, link") // Just get what you need
    .eq("user_id", userId)
    .not("verified_at", "is", null); // Only select channels that are actually verified

  if (userChannelsError) {
    console.error("VERIFIED_CHANNELS_FETCH_ERROR", {
      userChannelsError: userChannelsError.message,
      userId: userId,
    });
  }

  // If we came from a Telegram registration link, avoid rendering the full UI
  // and immediately trigger the deeplink client-side with a minimal shell.
  if (shouldPreserveForClient) {
    return (
      <div className="max-w-2xl w-full">
        <DeeplinkOnMount />
      </div>
    );
  }

  // Check for channel linking context
  const hasChannelError = resolvedSearchParams?.channel_error === 'true';
  const showFallback = resolvedSearchParams?.show_fallback === 'true';
  const channelLinkingMessage = resolvedSearchParams?.message;

  return (
    <div className="max-w-2xl w-full space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-foreground">
          {tAuth('signupComplete.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tAuth('signupComplete.subtitle')}
        </p>
      </div>

      {/* Show channel linking feedback if present */}
      {channelLinkingMessage && (
        <div className={`p-4 rounded-md ${hasChannelError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <p className={`text-sm ${hasChannelError ? 'text-red-700' : 'text-green-700'}`}>
            {channelLinkingMessage}
          </p>
          {hasChannelError && showFallback && (
            <p className="text-xs text-red-600 mt-2">
              {tAuth('channelLinking.fallbackMessage')}
            </p>
          )}
        </div>
      )}

      <SignupCompleteForm
        user={{ id: userId }}
        userProfile={userProfile}
        channels={(channels || []).map((channel) => ({
          id: channel.id,
          active: channel.is_active,
          link_method: channel.link_method,
          name: channel.id,
        }))}
        existingChannels={userChannels || []} // No mapping needed, pass it directly
        channelLinkingContext={{
          hasError: hasChannelError,
          showFallback: showFallback,
          channel: resolvedSearchParams?.channel,
        }}
      />
    </div>
  );
}
