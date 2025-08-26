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
import { Loader2, CreditCard, CheckCircle, Eye, EyeOff } from "lucide-react";

import { signUp } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/types";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";
import { useTranslations, useLocale } from "next-intl";
import { useAuthState } from "@/components/features/auth/AuthProvider";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { z } from "zod";


interface UserExistenceState {
  isChecking: boolean;
  userExists: boolean | null;
  checkedEmail: string | null;
  error: string | null;
}

interface SignupFormProps {
  message?: string | null;
  link?: string | null;
  channel?: string | null;
  userExistenceState?: UserExistenceState;
  onRedirectToLogin?: () => void;
}

const initialState: FormState = {
  message: undefined,
  errors: undefined,
  success: false,
};

// Zod schema for client-side signup validation
const SignupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email è obbligatoria")
    .email("Formato email non valido"),
  password: z
    .string()
    .min(8, "La password deve contenere almeno 8 caratteri"),
});
type SignupFields = z.infer<typeof SignupSchema>;

export default function SignupForm({ 
  message, 
  link, 
  channel, 
  userExistenceState,
  onRedirectToLogin
}: SignupFormProps) {
  const [formState, formAction, isPending] = useActionState(signUp, initialState);
  const [loadingStep, setLoadingStep] = useState<
    "auth" | "stripe" | "complete"
  >("auth");
  
  // Add authentication state and router
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const router = useLocaleRouter();

  // Translation hooks
  const t = useTranslations("auth.signup");
  const tFields = useTranslations("auth.fields");
  const locale = useLocale();

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

  // Client-side validation state and helpers (Zod)
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFields, string>>>({});

  const validateField = (field: keyof SignupFields, value: string) => {
    const parsed = SignupSchema.pick({ [field]: true } as Record<keyof SignupFields, true>).safeParse(
      { [field]: value } as Partial<SignupFields>
    );
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Valore non valido";
      setErrors((prev) => ({ ...prev, [field]: msg }));
      return false;
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    return true;
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const res = SignupSchema.safeParse({ email, password });
    if (!res.success) {
      e.preventDefault();
      const fieldErrors: Partial<Record<keyof SignupFields, string>> = {};
      const messages: string[] = [];
      for (const issue of res.error.issues) {
        const path = issue.path[0] as keyof SignupFields;
        if (path) fieldErrors[path] = issue.message;
        messages.push(issue.message);
      }
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      try {
        // Reuse the toast system already in place
        showError(
          "Errore di validazione",
          messages.join(" • "),
          {
            errorType: NotificationErrorType.VALIDATION_ERROR,
            context: "signup_client_validation",
            config: { duration: 6000 }
          }
        );
      } catch {
        // noop
      }
    }
  };
  
  // Debounced email change handler for user existence checking
  const emailChangeTimeoutRef = useRef<number | null>(null);
  
  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    // Removed user existence checking to avoid interfering with autocomplete
    // Authentication check will happen only when signup button is clicked
  }, []);
  
  const { showError, showSuccess, showVerificationToast, dismissToast } = useNotifications();
  
  /**
   * Handle signup button click with authentication check
   * If user is already authenticated, redirect to dashboard with channel linking
   */
  const handleSignupClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Check if user is already authenticated before submitting
    if (isAuthenticated && !authLoading) {
      event.preventDefault();
      
      console.log('SignupForm: User already authenticated on signup click, redirecting to dashboard with channel params', {
        hasChannelParams: Boolean(link && channel),
        link: link?.substring(0, 8) + '...',
        channel,
      });
      
      // Build dashboard URL with preserved channel parameters
      const params = new URLSearchParams();
      if (link) params.set('link', link);
      if (channel) params.set('channel', channel);
      if (message) params.set('message', message);
      
      const dashboardUrl = params.toString() 
        ? `/dashboard?${params.toString()}`
        : '/dashboard';
      
      // Show a quick success message
      showSuccess(
        "Already Signed In",
        channel ? `Connecting your ${channel} channel...` : "Redirecting to dashboard..."
      );
      
      // Redirect to dashboard
      router.push(dashboardUrl);
      return;
    }
    
    // If not authenticated, let the form submit normally
    // Don't prevent default - let the form action handle it
  }, [isAuthenticated, authLoading, link, channel, message, router, showSuccess]);
  // Ref per evitare toast duplicati in loop: memorizza ultimo toast mostrato (type + value)
  const lastShownErrorRef = useRef<{ type: 'validation' | 'message' | 'external' | 'success' | 'nonce' | 'nonce_pending' | null; value?: string | null } | null>(null);
  // Ref per tenere traccia del toast di verifica in corso (così possiamo chiuderlo quando finisce)
  const pendingVerificationToastRef = useRef<string | null>(null);
  // Ref per gestire un timeout di sicurezza che chiude il toast di verifica se resta in stato "in corso" troppo a lungo
  const verificationTimeoutRef = useRef<number | null>(null);
  // Field-level errors derivati dallo stato del server (se presenti)
  const emailError = formState.errors?.find((e) => e.field === "email")?.message;
  const passwordError = formState.errors?.find((e) => e.field === "password")?.message;

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "auth":
        return t("loading.auth");
      case "stripe":
        return t("loading.stripe");
      case "complete":
        return t("loading.complete");
      default:
        return t("loading.processing");
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
        error: result.isValid ? undefined : t("nonce.invalid"),
      });
    } catch {
      setNonceValidation({
        isValidating: false,
        isValid: false,
        error: t("nonce.error"),
      });
    }
  }, [link, channel, t]);

  // Validazione nonce quando componente monta
  useEffect(() => {
    if (link && channel) {
      validateNonceOnMount();
    }
  }, [link, channel, validateNonceOnMount]);

  // Cleanup email change timeout on unmount
  useEffect(() => {
    const timeoutRef = emailChangeTimeoutRef.current;
    return () => {
      if (timeoutRef) {
        window.clearTimeout(timeoutRef);
      }
    };
  }, []);

  // Show nonce validation result via toasts instead of inline UI
  useEffect(() => {
    // Avoid firing if we don't have channel/link context yet
    if (!channel && !link) return;

    // If validation is in progress, show a verification/loading toast (once per nonce)
    if (nonceValidation.isValidating) {
      if (lastShownErrorRef.current?.type !== 'nonce_pending' || lastShownErrorRef.current?.value !== link) {
        try {
          // mark as shown before calling the toast to avoid race-driven duplicates
          lastShownErrorRef.current = { type: 'nonce_pending', value: link };
          const toastId = showVerificationToast(channel || "Channel", link || "");
          // store the verification toast id so we can dismiss it when validation completes
          pendingVerificationToastRef.current = toastId;

          // Clear any existing timeout and set a safety timeout to avoid infinite loading toast
          if (verificationTimeoutRef.current) {
            window.clearTimeout(verificationTimeoutRef.current);
          }
          verificationTimeoutRef.current = window.setTimeout(() => {
            if (pendingVerificationToastRef.current) {
              try {
                dismissToast(pendingVerificationToastRef.current);
                // Show a friendly error if validation never completed
                showError(
                  t("notifications.verificationError"),
                  t("nonce.invalid")
                );
              } catch (e) {
                console.error("AUTO_DISMISS_VERIFICATION_TOAST_FAILED", { error: e });
              } finally {
                pendingVerificationToastRef.current = null;
                verificationTimeoutRef.current = null;
              }
            }
          }, 12000); // 12s safety timeout
        } catch (e) {
          // best-effort - don't break the signup form if toast fails
          console.error("SHOW_VERIFICATION_TOAST_FAILED", { error: e });
        }
        lastShownErrorRef.current = { type: 'nonce_pending', value: link };
      }
      return;
    }

    // If there was a pending verification toast, dismiss it now (validation finished)
    if (pendingVerificationToastRef.current) {
      try {
        dismissToast(pendingVerificationToastRef.current);
      } catch (e) {
        console.error("DISMISS_VERIFICATION_TOAST_FAILED", { error: e });
      } finally {
        pendingVerificationToastRef.current = null;
      }
    }

    // Clear the safety timeout if validation finished
    if (verificationTimeoutRef.current) {
      window.clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }

    // Handle success
    if (nonceValidation.isValid === true) {
      if (lastShownErrorRef.current?.type !== 'nonce' || lastShownErrorRef.current?.value !== link) {
        showSuccess(
          t("notifications.linkVerified"),
          t("nonce.valid", { channel })
        );
        lastShownErrorRef.current = { type: 'nonce', value: link };
      }
      return;
    }

    // Handle failure
    if (nonceValidation.isValid === false) {
      const errMsg = nonceValidation.error || t("nonce.invalid");
      if (lastShownErrorRef.current?.type !== 'nonce' || lastShownErrorRef.current?.value !== errMsg) {
        showError(
          t("notifications.verificationError"),
          errMsg,
          {
            errorType: NotificationErrorType.VERIFICATION_POLLING_ERROR,
            context: 'nonce_validation_signup',
            config: {
              duration: 8000
            }
          }
        );
        lastShownErrorRef.current = { type: 'nonce', value: errMsg };
      }
      return;
    }
  }, [nonceValidation.isValidating, nonceValidation.isValid, nonceValidation.error, showVerificationToast, showSuccess, showError, dismissToast, t, channel, link]);
 
  // Handle form state changes and loading progression
  useEffect(() => {
    if (isPending) {
      setLoadingStep("auth");
      // Simulate the progression through steps for UX
      setTimeout(() => setLoadingStep("stripe"), 1000);
      setTimeout(() => setLoadingStep("complete"), 2000);
    }
  }, [isPending]);

  // unified notification handler with improved deduplication
  // extract derived values to stable variables so the effect dependency array is static
  const errorsString = formState.errors && formState.errors.length > 0
    ? formState.errors.map((err) => err.message).join(". ")
    : undefined;
  const userId = formState.userId;

  useEffect(() => {
    const prev = lastShownErrorRef.current;

    // handle external message prop first (highest priority)
    if (message) {
      if (prev?.type !== 'external' || prev.value !== message) {
        showError(
          t("notifications.externalError"),
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
      return; // don't show other notifications when external message is present
    }

    // show validation errors only once per unique message
    if (errorsString) {
      if (prev?.type !== 'validation' || prev.value !== errorsString) {
        // set dedupe marker before showing the toast to prevent races
        lastShownErrorRef.current = { type: 'validation', value: errorsString };
        showError(
          t("notifications.validationError"),
          t("notifications.validationErrorDescription", { errors: errorsString }),
          {
            errorType: NotificationErrorType.VALIDATION_ERROR,
            context: "signup_form_validation",
            config: {
              duration: 8000,
            },
          }
        );
      }
      return;
    }

    // show general api error only if changed
    if (formState.message && !formState.success) {
      if (prev?.type !== 'message' || prev.value !== formState.message) {
        // set marker first to avoid duplicates during re-renders caused by toast state updates
        lastShownErrorRef.current = { type: 'message', value: formState.message };
        showError(
          t("notifications.registrationError"),
          formState.message,
          {
            errorType: NotificationErrorType.API_ERROR,
            context: 'signup_form_action',
            config: {
              duration: 8000
            }
          }
        );
      }
      return;
    }

    // show success toast once
    if (formState.success) {
      const successValue = userId || 'success';
      if (prev?.type !== 'success' || prev.value !== successValue) {
        // set marker first to avoid duplicate notifications
        lastShownErrorRef.current = { type: 'success', value: successValue };
        showSuccess(
          t("notifications.success"),
          t("notifications.successDescription")
        );
      }
    }
  }, [
    // granular dependencies to avoid effect retriggering from object identity changes
    message,
    formState.message,
    formState.success,
    errorsString,
    userId,
    showError,
    showSuccess,
    t
  ]);

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription className="text-base">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>


        <form action={formAction} onSubmit={onSubmit} noValidate>
          {channel && <input type="hidden" name="channel" value={channel} />}
          {link && <input type="hidden" name="link" value={link} />}
          <input type="hidden" name="locale" value={locale} />
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                {tFields("email")}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleEmailChange(v);
                    validateField('email', v);
                  }}
                  required
                  disabled={isPending}
                  aria-invalid={!!(errors.email || emailError)}
                  aria-describedby={(errors.email || emailError) ? "email-error" : undefined}
                  className="h-11"
                />
                {userExistenceState?.isChecking && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {(errors.email || emailError) && (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {errors.email ?? emailError}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                {tFields("password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword(v);
                    validateField('password', v);
                  }}
                  required
                  disabled={isPending}
                  aria-invalid={!!(errors.password || passwordError)}
                  aria-describedby={(errors.password || passwordError) ? "password-error" : undefined}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t("actions.hidePassword") : t("actions.showPassword")}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? (
                <CardDescription id="password-error" className="text-destructive" aria-live="polite">
                  {errors.password}
                </CardDescription>
              ) : passwordError ? (
                <CardDescription id="password-error" className="text-destructive" aria-live="polite">
                  {passwordError}
                </CardDescription>
              ) : (
                <CardDescription aria-live="polite">
                  {tFields("passwordHelp")}
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
                    <span>{t("loading.steps.creating")}</span>
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
                    <span>{t("loading.steps.configuring")}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle
                      className={`h-4 w-4 ${
                        loadingStep === "complete"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>{t("loading.steps.preparing")}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("loading.description")}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || authLoading || !!errors.email || !!errors.password || !email || !password}
              onClick={handleSignupClick}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getLoadingMessage()}
                </>
              ) : authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking authentication...
                </>
              ) : isAuthenticated ? (
                <>
                  Continue to Dashboard
                  {channel && ` & Connect ${channel}`}
                </>
              ) : (
                t("actions.signUp")
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={onRedirectToLogin || (() => window.location.href = '/login')}
              disabled={isPending}
            >
              {t("signInPrompt")}
            </Button>

          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
