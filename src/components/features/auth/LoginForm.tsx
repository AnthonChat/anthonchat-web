"use client";

import React, { useState, useEffect, useRef } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { LocaleLink } from "@/components/ui/locale-link";
import { signInWithState } from "@/app/[locale]/(auth)/actions";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";
import { z } from "zod";

/**
 * Props per il componente LoginForm
 */
interface LoginFormProps {
  message?: string | null;
  link?: string | null;
  channel?: string | null;
}

/**
 * Channel linking feedback types
 */
interface ChannelLinkingFeedback {
  type: 'success' | 'error' | 'expired' | 'info';
  title: string;
  message: string;
  icon: React.ReactNode;
}

/**
 * Stato del form di login
 */
interface LoginFormState {
  message?: string;
  success: boolean;
}

const initialState: LoginFormState = {
  message: undefined,
  success: false,
};

// Zod schema for client-side login validation
const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email è obbligatoria")
    .email("Formato email non valido"),
  password: z
    .string()
    .min(8, "La password deve contenere almeno 8 caratteri"),
});
type LoginFields = z.infer<typeof LoginSchema>;

/**
 * Componente per il form di login con sistema di toast integrato
 *
 * Questo componente fornisce un'interfaccia utente moderna per l'autenticazione
 * con gestione avanzata degli errori tramite il sistema di notifiche toast unificato.
 *
 * Features:
 * - Gestione errori tramite toast notifications invece di messaggi statici
 * - Loading states con feedback visivo dettagliato
 * - Validation feedback in tempo reale
 * - Integrazione completa con il sistema di notifiche unificato
 * - UX migliorata con icone e animazioni
 * - Logging strutturato per debugging e analytics
 * - Channel linking support per registrazioni da chatbot
 *
 * @component
 * @example
 * ```tsx
 * // Utilizzo base
 * <LoginForm />
 *
 * // Con messaggio di errore esterno
 * <LoginForm message="Sessione scaduta, effettua nuovamente l'accesso" />
 *
 * // Con parametri di channel linking
 * <LoginForm 
 *   message="Accedi per collegare il tuo canale"
 *   channel="telegram"
 *   link="abc123def456"
 * />
 * ```
 *
 * @param props - Props del componente
 * @param props.message - Messaggio di errore esterno (es. da URL params o redirect)
 * @param props.link - Nonce per il collegamento del canale
 * @param props.channel - ID del canale da collegare
 *
 * @returns JSX.Element - Componente del form di login
 */
export default function LoginForm({ message, link, channel }: LoginFormProps) {
  const [formState, formAction, isPending] = useActionState(signInWithState, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showError, showSuccess } = useNotifications();
  const searchParams = useSearchParams();

  // Client-side validation state and helpers (Zod)
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFields, string>>>({});

  const validateField = (field: keyof LoginFields, value: string) => {
    const parsed = LoginSchema.pick({ [field]: true } as Record<keyof LoginFields, true>).safeParse(
      { [field]: value } as Partial<LoginFields>
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
    const res = LoginSchema.safeParse({ email, password });
    if (!res.success) {
      e.preventDefault();
      const fieldErrors: Partial<Record<keyof LoginFields, string>> = {};
      const messages: string[] = [];
      for (const issue of res.error.issues) {
        const path = issue.path[0] as keyof LoginFields;
        if (path) fieldErrors[path] = issue.message;
        messages.push(issue.message);
      }
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      try {
        showError(
          "Errore di validazione",
          messages.join(" • "),
          {
            errorType: NotificationErrorType.VALIDATION_ERROR,
            context: "login_client_validation",
            config: { duration: 6000 }
          }
        );
      } catch {
        // noop
      }
    }
  };

  /**
   * Get channel linking feedback from URL parameters
   */
  const getChannelLinkingFeedback = (): ChannelLinkingFeedback | null => {
    // Account exists message will be handled via toast, not inline alert

    // Check for channel linking success from signup redirect
    if (searchParams.get('from') === 'signup' && searchParams.get('channel_linked') === 'true') {
      return {
        type: 'success',
        title: 'Canale collegato con successo',
        message: `Il tuo canale ${channel || 'chat'} è stato collegato durante la registrazione. Accedi per continuare.`,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      };
    }

    // Check for channel linking error from signup redirect
    if (searchParams.get('from') === 'signup' && searchParams.get('channel_error') === 'true') {
      return {
        type: 'error',
        title: 'Errore nel collegamento del canale',
        message: `Non è stato possibile collegare automaticamente il tuo canale ${channel || 'chat'}. Potrai collegarlo manualmente dopo l'accesso.`,
        icon: <AlertCircle className="h-4 w-4 text-red-600" />,
      };
    }

    // Check for expired link
    if (searchParams.get('error') === 'expired_link' || searchParams.get('link_expired') === 'true') {
      return {
        type: 'expired',
        title: 'Link scaduto',
        message: 'Il link di registrazione è scaduto. Accedi al tuo account e potrai richiedere un nuovo link per collegare il canale.',
        icon: <Clock className="h-4 w-4 text-orange-600" />,
      };
    }

    // Check for general channel linking context
    if ((channel || link) && !searchParams.get('from') && message !== 'account_exists') {
      return {
        type: 'info',
        title: 'Collegamento canale in corso',
        message: `Accedi per collegare il tuo canale ${channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : 'chat'} al tuo account.`,
        icon: <CheckCircle className="h-4 w-4 text-blue-600" />,
      };
    }

    return null;
  };

  const channelFeedback = getChannelLinkingFeedback();

  // Unified notification handler with deduplication
  const lastShownNotificationRef = useRef<{
    type: 'form_error' | 'form_success' | 'external_error' | 'account_exists';
    value: string;
  } | null>(null);

  useEffect(() => {
    const prev = lastShownNotificationRef.current;

    // Handle account exists message with toast (highest priority)
    if (message === 'account_exists' && (channel || link)) {
      const accountExistsKey = `account_exists_${channel}_${link}`;
      if (prev?.type !== 'account_exists' || prev.value !== accountExistsKey) {
        showSuccess(
          'Account già esistente',
          `Hai già un account con questa email. Accedi per collegare il tuo canale ${channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : 'chat'}.`,
          undefined,
          {
            duration: 8000
          }
        );
        lastShownNotificationRef.current = { type: 'account_exists', value: accountExistsKey };
      }
      return; // Don't show other notifications when account exists message is present
    }

    // Skip notifications if we have channel feedback displayed
    if (channelFeedback) {
      return;
    }

    // Handle other external message props
    if (message && message !== 'account_exists') {
      if (prev?.type !== 'external_error' || prev.value !== message) {
        showError(
          'Errore di autenticazione',
          message,
          {
            errorType: NotificationErrorType.AUTH_UNAUTHORIZED,
            context: 'login_external_message',
            config: {
              duration: 6000
            }
          }
        );
        lastShownNotificationRef.current = { type: 'external_error', value: message };
      }
      return; // Don't show other notifications when external message is present
    }

    // Handle form state changes
    if (formState.message && !formState.success) {
      if (prev?.type !== 'form_error' || prev.value !== formState.message) {
        showError(
          'Errore durante il login',
          formState.message,
          {
            errorType: NotificationErrorType.AUTH_UNAUTHORIZED,
            context: 'login_form_action',
            config: {
              duration: 8000
            }
          }
        );
        lastShownNotificationRef.current = { type: 'form_error', value: formState.message };
      }
      return;
    }

    // Show success toast if login is successful
    if (formState.success) {
      const successValue = 'login_success';
      if (prev?.type !== 'form_success' || prev.value !== successValue) {
        showSuccess(
          'Login completato!',
          'Accesso effettuato con successo. Verrai reindirizzato al dashboard.'
        );
        lastShownNotificationRef.current = { type: 'form_success', value: successValue };
      }
    }
  }, [formState, message, showError, showSuccess, channelFeedback, channel, link]);

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">Bentornato!</CardTitle>
          <CardDescription className="text-base">
            {(channel || link) ? (
              <>
                Accedi per collegare il tuo canale {channel && `${channel.charAt(0).toUpperCase() + channel.slice(1)}`}
              </>
            ) : (
              "Accedi al tuo account AnthonChat"
            )}
          </CardDescription>
          
          {/* Channel linking feedback */}
          {channelFeedback && (
            <Alert className={`mt-4 ${
              channelFeedback.type === 'success' ? 'border-green-200 bg-green-50' :
              channelFeedback.type === 'error' ? 'border-red-200 bg-red-50' :
              channelFeedback.type === 'expired' ? 'border-orange-200 bg-orange-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                {channelFeedback.icon}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm mb-1">
                    {channelFeedback.title}
                  </div>
                  <AlertDescription className="text-sm">
                    {channelFeedback.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardHeader>

        <form action={formAction} onSubmit={onSubmit} noValidate>
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            {/* Hidden fields for channel linking parameters */}
            {channel && (
              <input
                type="hidden"
                name="channel"
                value={channel}
              />
            )}
            {link && (
              <input
                type="hidden"
                name="link"
                value={link}
              />
            )}
            {(channel || link) && (
              <input
                type="hidden"
                name="autoLinkChannel"
                value="true"
              />
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
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmail(v);
                    validateField('email', v);
                  }}
                  required
                  disabled={isPending}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="h-11 pl-10"
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword(v);
                    validateField('password', v);
                  }}
                  required
                  disabled={isPending}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="h-11 pl-10"
                />
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-xs text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Loading Progress Indicator */}
            {isPending && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    Effettuando l&apos;accesso...
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stiamo verificando le tue credenziali e preparando la sessione.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !email || !password || !!errors.email || !!errors.password}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Effettuando l&apos;accesso...
                </>
              ) : (
                "Accedi"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <LocaleLink href="/signup">Non hai un account? Registrati</LocaleLink>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}