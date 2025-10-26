"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import { PASSWORD_VALIDATION } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "@/components/ui/locale-link";
import { Loader2, Lock, AlertTriangle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const t = useTranslations("auth.password.reset");

  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState<{ password?: string; password2?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // On mount, verify that a recovery session exists
  useEffect(() => {
    const verifyRecoverySession = async () => {
      try {
        // Visiting this page via the Supabase email link should create a "recovery" session client-side
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setSessionValid(false);
          setCheckingSession(false);
          return;
        }
        const user = data.session?.user ?? null;
        setEmail(user?.email ?? null);
        // If we have a session at all, assume it's valid for password update
        setSessionValid(!!data.session);
      } catch {
        setSessionValid(false);
      } finally {
        setCheckingSession(false);
      }
    };

    // Supabase puts tokens in the URL hash on redirect; the client handles parsing automatically.
    verifyRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const next: { password?: string; password2?: string } = {};
    if (!password || !PASSWORD_VALIDATION.pattern.test(password)) {
      next.password = PASSWORD_VALIDATION.message;
    }
    if (password2 !== password) {
      next.password2 = t("mismatch");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Common cases: session invalid/expired
        if (/session/i.test(error.message) || /token/i.test(error.message)) {
          setSessionValid(false);
          setServerError(null);
        } else {
          setServerError(error.message || t("serverErrorDescription"));
        }
        return;
      }

      setSuccessMessage(t("successDescription"));
      // Optional: sign out recovery session to require fresh login
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state while verifying session
  if (checkingSession) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Preparing secure password reset...</span>
        </div>
      </div>
    );
  }

  const showForm = sessionValid && !successMessage;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-xl sm:text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {email ? t("subtitleWithEmail", { email }) : t("subtitle")}
          </CardDescription>

          {sessionValid === false && !successMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-4 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-6 shadow-[0_12px_40px_-18px_rgba(244,63,94,0.45)] animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                <div className="flex min-w-[14rem] flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h3 className="text-base font-semibold text-foreground">
                      {t("invalidTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("invalidDescription")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("invalidHint")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.45)] animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                <div className="flex min-w-[14rem] flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h3 className="text-base font-semibold text-foreground">
                      {t("successTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {successMessage ?? t("successDescription")}
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

          {serverError && !successMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-4 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-6 shadow-[0_12px_40px_-18px_rgba(244,63,94,0.45)] animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                <div className="flex min-w-[14rem] flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h3 className="text-base font-semibold text-foreground">
                      {t("serverErrorTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{serverError}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("serverErrorHint")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        {showForm ? (
          <form onSubmit={onSubmit} noValidate>
            <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("newPassword")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="h-11 pl-10"
                  />
                </div>
                {errors.password ? (
                  <p id="password-error" className="mt-1 text-xs text-destructive">
                    {errors.password}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("help", { min: PASSWORD_VALIDATION.minLength })}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password2" className="text-sm font-medium">
                  {t("confirmPassword")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password2"
                    name="password2"
                    type="password"
                    placeholder="••••••••"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    disabled={submitting}
                    aria-invalid={!!errors.password2}
                    aria-describedby={errors.password2 ? "password2-error" : undefined}
                    className="h-11 pl-10"
                  />
                </div>
                {errors.password2 && (
                  <p id="password2-error" className="mt-1 text-xs text-destructive">
                    {errors.password2}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  t("updateButton")
                )}
              </Button>

              <Button variant="outline" className="w-full" asChild disabled={submitting}>
                <LocaleLink href="/login">{t("backToLogin")}</LocaleLink>
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            {successMessage ? (
              <Button variant="outline" className="w-full" asChild>
                <LocaleLink href="/login">{t("backToLogin")}</LocaleLink>
              </Button>
            ) : (
              <Button variant="outline" className="w-full" asChild>
                <LocaleLink href="/forgot-password">{t("requestNewLink")}</LocaleLink>
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}