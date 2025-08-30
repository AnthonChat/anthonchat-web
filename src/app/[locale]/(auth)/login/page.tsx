import { createClient } from "@/lib/db/server";
import LoginForm from "@/components/features/auth/LoginForm";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; channel?: string; link?: string }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const { message, channel, link } = resolvedSearchParams;
  const locale = await getLocale();

  // Log channel linking context for monitoring
  if (channel && link) {
    console.info('LoginPage: Channel linking context detected', {
      channel,
      hasValidLink: Boolean(link),
      hasMessage: Boolean(message),
    });
  }

  const { data: claims } = await supabase.auth.getClaims();

  if (claims) {
    // Build dashboard URL with preserved channel parameters for logged-in users
    const params = new URLSearchParams();
    if (link) params.set('link', link);
    if (channel) params.set('channel', channel);
    if (message) params.set('message', message);
    
    const dashboardPath = params.toString() 
      ? `/${locale}/dashboard?${params.toString()}`
      : `/${locale}/dashboard`;
    
    console.log('LoginPage: Redirecting authenticated user to dashboard with channel params', {
      hasChannelParams: Boolean(link && channel),
      dashboardPath,
    });
    
    // Use direct redirect instead of localeRedirect to preserve query parameters
    redirect(dashboardPath);
  }

  return <LoginForm message={message} channel={channel} link={link} />;
}
