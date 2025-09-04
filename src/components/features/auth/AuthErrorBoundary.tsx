"use client";

import React, { Component, ErrorInfo, ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, LogOut, RefreshCw, Home } from "lucide-react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import {
  AuthError,
  AuthErrorType,
  getAuthErrorMessage,
  supabaseErrorToAuthError
} from "@/lib/auth/types";
import { useAuthActions } from "./AuthProvider";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onAuthError?: (error: AuthError) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * Componente per gestire errori di autenticazione con UI specifica
 */
function AuthErrorFallback({
  error,
  resetErrorBoundary,
  onAuthError
}: {
  error: Error;
  resetErrorBoundary: () => void;
  onAuthError?: (error: AuthError) => void;
}) {
  const router = useLocaleRouter();
  const { signOut, clearError } = useAuthActions();
  const { showError } = useNotifications();

  // Converte l'errore in AuthError strutturato
  const authError: AuthError = React.useMemo(() => {
    // Se è già un AuthError, restituiscilo
    if ('type' in error && 'timestamp' in error) {
      return error as AuthError;
    }
    
    // Altrimenti converti da errore generico
    return supabaseErrorToAuthError(error);
  }, [error]);

  // Chiamata callback se fornita
  React.useEffect(() => {
    onAuthError?.(authError);
  }, [authError, onAuthError]);

  /**
   * Gestisce il logout dell'utente
   */
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      clearError();
      router.push('/login');
    } catch (err) {
      // Mostra toast di errore invece di console.error
      showError(
        'Errore durante il logout',
        'Si è verificato un problema durante il logout.',
        {
          errorType: NotificationErrorType.AUTH_SESSION_EXPIRED,
          context: 'auth_signout',
          originalError: err,
          config: {
            duration: 5000
          }
        }
      );
      
      // Fallback: redirect diretto
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }, [signOut, clearError, router, showError]);

  /**
   * Redirect alla homepage
   */
  const handleGoHome = useCallback(() => {
    clearError();
    router.push('/');
  }, [clearError, router]);

  /**
   * Riprova l'operazione
   */
  const handleRetry = useCallback(() => {
    clearError();
    resetErrorBoundary();
  }, [clearError, resetErrorBoundary]);

  /**
   * Ricarica la pagina
   */
  const handleReload = useCallback(() => {
    clearError();
    window.location.reload();
  }, [clearError]);

  // Determina quali azioni mostrare in base al tipo di errore
  const showSignOut = authError.requiresReauth || 
                     authError.type === AuthErrorType.SESSION_EXPIRED ||
                     authError.type === AuthErrorType.UNAUTHORIZED;

  const showRetry = authError.type === AuthErrorType.NETWORK_ERROR ||
                   authError.type === AuthErrorType.TOKEN_REFRESH_FAILED;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">
            Errore di Autenticazione
          </CardTitle>
          <CardDescription>
            {authError.message || getAuthErrorMessage(authError.type)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dettagli errore in development */}
          {process.env.NODE_ENV === "development" && (
            <details className="rounded-md bg-muted p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Dettagli Errore (Development)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                Tipo: {authError.type}
                {authError.code && `\nCodice: ${authError.code}`}
                {authError.details && `\nDettagli: ${JSON.stringify(authError.details, null, 2)}`}
                {error.stack && `\nStack: ${error.stack}`}
              </pre>
            </details>
          )}

          {/* Azioni disponibili */}
          <div className="flex flex-col gap-2">
            {showSignOut && (
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Effettua Logout
              </Button>
            )}
            
            {showRetry && (
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Riprova
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                onClick={handleReload}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Ricarica
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Classe interna che estende ErrorBoundary per funzionalità auth-specific
 */
class AuthErrorBoundaryInternal extends Component<
  AuthErrorBoundaryProps & { authFallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: AuthErrorBoundaryProps & { authFallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onAuthError } = this.props;

    // Converte in AuthError se necessario
    let authError: AuthError;
    if ('type' in error && 'timestamp' in error) {
      authError = error as AuthError;
    } else {
      authError = supabaseErrorToAuthError(error);
    }

    // Manteniamo console.error per debugging ma solo in development.
    // Use a safe serializer to avoid logging empty objects for complex/unserializable errors.
    if (process.env.NODE_ENV === 'development') {
      const safeSerialize = (v: unknown) => {
        try {
          return JSON.parse(
            JSON.stringify(v, (_k, val) => {
              if (val instanceof Error) {
                return { name: val.name, message: val.message, stack: val.stack };
              }
              return val;
            })
          );
        } catch {
          try {
            if (typeof v === 'object' && v !== null) {
              const copy: Record<string, unknown> = {};
              for (const k of Object.keys(v as Record<string, unknown>)) {
                try {
                  const val = (v as Record<string, unknown>)[k];
                  if (val instanceof Error) {
                    copy[k] = { name: val.name, message: val.message };
                  } else {
                    copy[k] = val;
                  }
                } catch {
                  copy[k] = '[unserializable]';
                }
              }
              return copy;
            }
            return String(v);
          } catch {
            return '[unable to serialize]';
          }
        }
      };

      console.error(
        'AuthErrorBoundary: Caught auth error:',
        safeSerialize({ authError, errorInfo, originalError: error })
      );
    }

    // Chiama callback con informazioni aggiuntive per supportare toast
    onAuthError?.(authError);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, authFallback } = this.props;

    if (hasError && error) {
      // Usa fallback personalizzato se fornito
      if (fallback) {
        return fallback;
      }

      // Usa authFallback se fornito
      if (authFallback) {
        return authFallback;
      }

      // Default auth error UI
      return (
        <AuthErrorFallback
          error={error}
          resetErrorBoundary={this.resetErrorBoundary}
          onAuthError={this.props.onAuthError}
        />
      );
    }

    return children;
  }
}

/**
 * AuthErrorBoundary che specializza ErrorBoundary per errori di autenticazione
 */
export function AuthErrorBoundary({
  children,
  fallback,
  onAuthError,
  resetOnPropsChange = true,
  resetKeys = []
}: AuthErrorBoundaryProps) {
  return (
    <AuthErrorBoundaryInternal
      fallback={fallback}
      onAuthError={onAuthError}
      resetOnPropsChange={resetOnPropsChange}
      resetKeys={resetKeys}
    >
      {children}
    </AuthErrorBoundaryInternal>
  );
}

/**
 * HOC per wrappare componenti con AuthErrorBoundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<AuthErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

/**
 * Hook per gestire errori auth programmaticamente
 */
export function useAuthErrorHandler() {
  const { setError, clearError } = useAuthActions();
  const router = useLocaleRouter();

  const handleAuthError = useCallback((error: unknown) => {
    const authError = supabaseErrorToAuthError(error);
    setError(authError);

    // Auto-redirect per errori che richiedono re-auth
    if (authError.requiresReauth) {
      setTimeout(() => {
        router.push('/login');
      }, 3000); // Delay per permettere all'utente di leggere l'errore
    }
  }, [setError, router]);

  return {
    handleAuthError,
    clearError,
  };
}