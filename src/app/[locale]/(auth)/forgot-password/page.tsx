"use client";

import React, { useEffect, useState } from "react";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/[locale]/(auth)/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "@/components/ui/locale-link";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

type FormState = {
  message?: string;
  errors?: { field: string; message: string }[];
  success?: boolean;
};

const initialState: FormState = {
  message: undefined,
  errors: undefined,
  success: false,
};

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const [formState, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState
  );
  const t = useTranslations("auth.password.forgot");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const sp = await searchParams;
        if (sp?.email) setEmail(sp.email);
      } catch {
        // ignore
      }
    })();
  }, [searchParams]);

  const emailError = formState.errors?.find((e) => e.field === "email")?.message;
  const serverMessage = formState.message;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-xl sm:text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t("subtitle")}
          </CardDescription>

        </CardHeader>

        <form action={formAction} noValidate>
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            {formState.success && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.45)] animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                  <div className="flex flex-1 min-w-[14rem] items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <MailCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {t("successTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {serverMessage ?? t("successDescription")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("successHint")}
                      </p>
                    </div>
                  </div>
                  {email && (
                    <span className="inline-flex max-w-full shrink-0 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300 sm:self-center break-all">
                      {email}
                    </span>
                  )}
                </div>
              </div>
            )}
    
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className="h-11 pl-10"
                />
              </div>
              {emailError && (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>

            {isPending && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {t("sending")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("success")}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !email}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                formState.success ? t("resendButton") : t("button")
              )}
            </Button>

            <Button variant="outline" className="w-full" asChild disabled={isPending}>
              <LocaleLink href="/login">{t("backToLogin")}</LocaleLink>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}