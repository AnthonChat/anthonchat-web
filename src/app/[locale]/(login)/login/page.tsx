import { createClient } from "@/lib/db/server";
import { signIn } from "../actions";
import Login from "./login";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "@/components/ui/locale-link";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();
  const { message } = await searchParams;
  const locale = await getLocale();
  const tAuth = await getTranslations('auth');
  const tCommon = await getTranslations('common');

  const { data: claims } = await supabase.auth.getClaims();

  if (claims) {
    localeRedirect("/dashboard", locale as Locale);
  }

  return (
    <Login
      action={signIn}
      message={message}
      title={tAuth('login.title')}
      description={tAuth('login.subtitle')}
      footer={
        <>
          <Button className="w-full">{tCommon('actions.signIn')}</Button>
          <Button variant="outline" className="w-full" asChild>
            <LocaleLink href="/signup">{tAuth('login.signUpPrompt')}</LocaleLink>
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Label htmlFor="email" className="text-sm font-medium">
          {tAuth('fields.email')}
        </Label>
        <Input
          name="email"
          placeholder="you@example.com"
          required
          type="email"
          className="h-11"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="password" className="text-sm font-medium">
          {tAuth('fields.password')}
        </Label>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          required
          className="h-11"
        />
      </div>
    </Login>
  );
}
