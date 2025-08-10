"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/types";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";


interface SignupFormProps {
  message?: string | null;
  link?: string | null;
  channel?: string | null;
}

const initialState: FormState = {
  message: undefined,
  errors: undefined,
  success: false,
};

export default function SignupForm({ message, link, channel }: SignupFormProps) {
  const [formState, formAction, isPending] = useActionState(signUp, initialState);
  const [loadingStep, setLoadingStep] = useState<
    "auth" | "stripe" | "complete"
  >("auth");

  // Stato per validazione nonce
  const [nonceValidation, setNonceValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error?: string;
  }>({
    isValidating: false,
    isValid: null,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showError, showSuccess } = useNotifications();
  // Ref per evitare toast duplicati in loop: memorizza ultimo toast mostrato (type + value)
  const lastShownErrorRef = useRef<{ type: 'validation' | 'message' | 'external' | 'success' | null; value?: string } | null>(null);
  // Field-level errors derivati dallo stato del server (se presenti)
  const emailError = formState.errors?.find((e) => e.field === "email")?.message;
  const passwordError = formState.errors?.find((e) => e.field === "password")?.message;

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "auth":
        return "Creating your account...";
      case "stripe":
        return "Setting up billing & payment processing...";
      case "complete":
        return "Almost done! Finalizing your account...";
      default:
        return "Processing...";
    }
  };

  const validateNonceOnMount = useCallback(async () => {
    if (!link || !channel) return;
    
    setNonceValidation({ isValidating: true, isValid: null });
    
    try {
      const response = await fetch('/api/link/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce: link, channelId: channel }),
      });
      
      const result = await response.json();
      
      setNonceValidation({
        isValidating: false,
        isValid: result.isValid,
        error: result.isValid ? undefined : "Link non valido o scaduto",
      });
    } catch {
      setNonceValidation({
        isValidating: false,
        isValid: false,
        error: "Errore durante la validazione del link",
      });
    }
  }, [link, channel]);

  // Validazione nonce quando componente monta
  useEffect(() => {
    if (link && channel) {
      validateNonceOnMount();
    }
  }, [link, channel, validateNonceOnMount]);

  // Handle form state changes and loading progression
  useEffect(() => {
    if (isPending) {
      setLoadingStep("auth");
      // Simulate the progression through steps for UX
      setTimeout(() => setLoadingStep("stripe"), 1000);
      setTimeout(() => setLoadingStep("complete"), 2000);
    }
  }, [isPending]);

  // Handle form state changes for toast notifications (guarded to avoid duplicate loops)
  useEffect(() => {
    const prev = lastShownErrorRef.current;

    // Show validation errors only once per unique message
    if (formState.errors && formState.errors.length > 0) {
      const detailedErrorMessage = formState.errors
        .map((err) => err.message)
        .join(". ");
      if (prev?.type !== 'validation' || prev.value !== detailedErrorMessage) {
        showError(
          "Errore di validazione",
          `Il form contiene errori: ${detailedErrorMessage}`,
          {
            errorType: NotificationErrorType.VALIDATION_ERROR,
            context: "signup_form_validation",
            config: {
              duration: 8000,
            },
          }
        );
        lastShownErrorRef.current = { type: 'validation', value: detailedErrorMessage };
      }
      return;
    }

    // Show general API error only if changed
    if (formState.message && !formState.success) {
      if (prev?.type !== 'message' || prev.value !== formState.message) {
        showError(
          "Errore durante la registrazione",
          formState.message,
          {
            errorType: NotificationErrorType.API_ERROR,
            context: 'signup_form_action',
            config: {
              duration: 8000
            }
          }
        );
        lastShownErrorRef.current = { type: 'message', value: formState.message };
      }
      return;
    }

    // Show success toast once
    if (formState.success) {
      const successValue = formState.userId || 'success';
      if (prev?.type !== 'success' || prev.value !== successValue) {
        showSuccess(
          'Registrazione completata!',
          'Il tuo account è stato creato con successo. Verrai reindirizzato al dashboard.'
        );
        lastShownErrorRef.current = { type: 'success', value: successValue };
      }
    }
  }, [formState, showError, showSuccess]);

  // Handle external message prop (guarded)
  useEffect(() => {
    if (!message) return;
    const prev = lastShownErrorRef.current;
    if (prev?.type !== 'external' || prev.value !== message) {
      showError(
        'Errore',
        message,
        {
          errorType: NotificationErrorType.API_ERROR,
          context: 'signup_external_message',
          config: {
            duration: 6000
          }
        }
      );
      lastShownErrorRef.current = { type: 'external', value: message };
    }
  }, [message, showError]);

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription className="text-base">
            Sign up for a new AnthonChat account
          </CardDescription>
        </CardHeader>

        {/* Indicatore validazione nonce */}
        {(link && channel) && (
          <div className="px-6 pb-2">
            {nonceValidation.isValidating && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validazione link in corso...
              </div>
            )}
            
            {nonceValidation.isValid === true && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Link valido - Il tuo canale {channel} verrà collegato automaticamente
              </div>
            )}
            
            {nonceValidation.isValid === false && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {nonceValidation.error} - Potrai collegare il canale dopo la registrazione
              </div>
            )}
          </div>
        )}

        <form action={formAction}>
          {channel && <input type="hidden" name="channel" value={channel} />}
          {link && <input type="hidden" name="link" value={link} />}
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Resetta il guard per validation toast quando l'utente modifica il campo
                  if (lastShownErrorRef.current?.type === 'validation') {
                    lastShownErrorRef.current = null;
                  }
                }}
                required
                disabled={isPending}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className="h-11"
              />
              {emailError && (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Resetta il guard per validation toast quando l'utente modifica il campo
                    if (lastShownErrorRef.current?.type === 'validation') {
                      lastShownErrorRef.current = null;
                    }
                  }}
                  required
                  disabled={isPending}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError ? (
                <CardDescription className="text-destructive" aria-live="polite">
                  {passwordError}
                </CardDescription>
              ) : (
                <CardDescription aria-live="polite">
                  Password must be at least 8 characters long and contain at least one number and one letter.
                </CardDescription>
              )}
            </div>

            {/* Loading Progress Indicator */}
            {isPending && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {getLoadingMessage()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle
                      className={`h-4 w-4 ${
                        loadingStep !== "auth"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>Creating your account</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="relative">
                      {loadingStep === "stripe" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : loadingStep === "complete" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span>Configuring billing & payments</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle
                      className={`h-4 w-4 ${
                        loadingStep === "complete"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>Preparing your dashboard</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  We&apos;re setting up your account with secure payment
                  processing. This ensures you can manage subscriptions and
                  billing seamlessly.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getLoadingMessage()}
                </>
              ) : (
                "Sign Up"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <Link href="/login">Already have an account? Sign In</Link>
            </Button>

          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
