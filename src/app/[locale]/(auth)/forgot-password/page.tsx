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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LocaleLink } from "@/components/ui/locale-link";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
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
  // Capture the current origin on the client so the server action can build the correct absolute URL
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const sp = await searchParams;
        if (sp?.email) setEmail(sp.email);
      } catch {
        // ignore
      }
    })();

    // Read the current browser origin to ensure password reset uses the same domain
    try {
      if (typeof window !== "undefined" && window.location?.origin) {
        setOrigin(window.location.origin);
      }
    } catch {
      // ignore
    }
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

          {formState.success && serverMessage && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  {serverMessage ?? t("success")}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardHeader>

        <form action={formAction} noValidate>
          {/* Provide the current origin to the server action for accurate absolute redirect URLs */}
          <input type="hidden" name="origin" value={origin} readOnly />
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
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
                t("button")
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