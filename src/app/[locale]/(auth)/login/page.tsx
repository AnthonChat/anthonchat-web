import { createClient } from "@/lib/db/server";
import LoginForm from "@/components/features/auth/LoginForm";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; channel?: string; link?: string; redirectTo?: string }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const { message, channel, link, redirectTo } = resolvedSearchParams;
  const locale = await getLocale();

  // Debug: Log all search params received
  console.info('LoginPage DEBUG: Search params received', {
    message: message || 'NOT_PRESENT',
    channel: channel || 'NOT_PRESENT', 
    link: link || 'NOT_PRESENT',
    redirectTo: redirectTo || 'NOT_PRESENT',
    allParams: resolvedSearchParams,
  });

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
    // Use redirectTo if provided, otherwise default to dashboard
    const baseRedirectPath = redirectTo || `/${locale}/dashboard`;
    
    // Build redirect URL with preserved channel parameters for logged-in users
    const params = new URLSearchParams();
    if (link) params.set('link', link);
    if (channel) params.set('channel', channel);
    if (message) params.set('message', message);
    
    // Ensure path has locale prefix if redirectTo is provided without it
    const finalPath = redirectTo && !redirectTo.startsWith(`/${locale}`) 
      ? `/${locale}${redirectTo.startsWith('/') ? '' : '/'}${redirectTo}`
      : baseRedirectPath;
    
    const redirectPath = params.toString() 
      ? `${finalPath}${finalPath.includes('?') ? '&' : '?'}${params.toString()}`
      : finalPath;
    
    console.log('LoginPage: Redirecting authenticated user', {
      hasChannelParams: Boolean(link && channel),
      redirectPath,
      hasRedirectTo: Boolean(redirectTo),
    });
    
    // Use direct redirect instead of localeRedirect to preserve query parameters
    redirect(redirectPath);
  }

  return <LoginForm message={message} channel={channel} link={link} redirectTo={redirectTo} />;
}
