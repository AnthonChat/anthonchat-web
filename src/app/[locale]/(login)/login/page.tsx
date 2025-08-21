import { createClient } from "@/lib/db/server";
import LoginForm from "@/components/features/auth/LoginForm";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();
  const { message } = await searchParams;
  const locale = await getLocale();

  const { data: claims } = await supabase.auth.getClaims();

  if (claims) {
    localeRedirect("/dashboard", locale as Locale);
  }

  return <LoginForm message={message} />;
}
