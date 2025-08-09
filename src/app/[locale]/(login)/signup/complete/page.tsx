import { createClient } from "@/lib/db/server";
import SignupCompleteForm from "@/components/features/auth/SignupCompleteForm";
import DeeplinkOnMount from "@/components/features/auth/DeeplinkOnMount";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale } from "next-intl/server";
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
  searchParams?: { message?: string; link?: string; channel?: string };
}) {
  const supabase = await createClient();
  const locale = await getLocale();
  // `searchParams` may be a Promise-like object in Next.js server routes.
  // Await it to get a resolved params object before reading properties.
  // This prevents "searchParams should be awaited" runtime errors.
  const resolvedSearchParams = await searchParams;

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  const userId = claims.claims.sub;

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
    !!incomingChannel && !!incomingLink && incomingChannel.toLowerCase() === "telegram";

  if (isOnboarded === true && !shouldPreserveForClient) {
    localeRedirect("/dashboard", locale as Locale);
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

  return (
    <div className="max-w-2xl w-full space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-foreground">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Just a few more details to get you started with AnthonChat
        </p>
      </div>

      <DeeplinkOnMount />
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
      />
    </div>
  );
}
