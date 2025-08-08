"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, Mail, Lock } from "lucide-react";
import { LocaleLink } from "@/components/ui/locale-link";
import { signInWithState } from "@/app/[locale]/(login)/actions";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";

/**
 * Props per il componente LoginForm
 */
interface LoginFormProps {
  message?: string | null;
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
 *
 * @component
 * @example
 * ```tsx
 * // Utilizzo base
 * <LoginForm />
 *
 * // Con messaggio di errore esterno
 * <LoginForm message="Sessione scaduta, effettua nuovamente l'accesso" />
 * ```
 *
 * @param props - Props del componente
 * @param props.message - Messaggio di errore esterno (es. da URL params o redirect)
 *
 * @returns JSX.Element - Componente del form di login
 */
export default function LoginForm({ message }: LoginFormProps) {
  const [formState, formAction, isPending] = useActionState(signInWithState, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showError, showSuccess } = useNotifications();

  // Handle form state changes for toast notifications
  useEffect(() => {
    // Show error toast for form state messages
    if (formState.message && !formState.success) {
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
    }

    // Show success toast if login is successful
    if (formState.success) {
      showSuccess(
        'Login completato!',
        'Accesso effettuato con successo. Verrai reindirizzato al dashboard.'
      );
    }
  }, [formState, showError, showSuccess]);

  // Handle external message prop
  useEffect(() => {
    if (message) {
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
    }
  }, [message, showError]);

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">Bentornato!</CardTitle>
          <CardDescription className="text-base">
            Accedi al tuo account AnthonChat
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
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
                  className="h-11 pl-10"
                />
              </div>
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className="h-11 pl-10"
                />
              </div>
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
              disabled={isPending || !email || !password}
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