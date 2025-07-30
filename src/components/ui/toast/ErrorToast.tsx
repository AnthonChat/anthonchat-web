/**
 * Componente toast personalizzato per la gestione degli errori
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationErrorType } from '@/lib/notifications/types';

interface ErrorToastProps {
  title: string;
  message: string;
  errorType: NotificationErrorType;
  onRetry?: () => void;
  onGoHome?: () => void;
  onSignOut?: () => void;
  showDetails?: boolean;
  details?: Record<string, unknown>;
  className?: string;
}

export function ErrorToast({
  title,
  message,
  errorType,
  onRetry,
  onGoHome,
  onSignOut,
  showDetails = false,
  details,
  className
}: ErrorToastProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const isAuthError = [
    'AUTH_SESSION_EXPIRED',
    'AUTH_UNAUTHORIZED',
    'AUTH_TOKEN_REFRESH_FAILED'
  ].includes(errorType);

  const isNetworkError = [
    'NETWORK_ERROR',
    'CONNECTIVITY_LOST',
    'API_ERROR'
  ].includes(errorType);

  const isVerificationError = [
    'VERIFICATION_POLLING_ERROR',
    'VERIFICATION_TIMEOUT',
    'VERIFICATION_EXPIRED',
    'NONCE_INVALID'
  ].includes(errorType);

  const getErrorIcon = () => {
    if (isAuthError) {
      return <LogOut className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    }
    if (isNetworkError) {
      return <RefreshCw className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    }
    return <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
  };

  const getErrorTypeLabel = () => {
    switch (errorType) {
      case 'VERIFICATION_POLLING_ERROR':
      case 'VERIFICATION_TIMEOUT':
      case 'VERIFICATION_EXPIRED':
      case 'NONCE_INVALID':
        return 'Errore di verifica';
      case 'NETWORK_ERROR':
      case 'CONNECTIVITY_LOST':
        return 'Errore di connessione';
      case 'API_ERROR':
        return 'Errore API';
      case 'AUTH_SESSION_EXPIRED':
      case 'AUTH_UNAUTHORIZED':
      case 'AUTH_TOKEN_REFRESH_FAILED':
        return 'Errore di autenticazione';
      case 'SERVER_ERROR':
        return 'Errore del server';
      default:
        return 'Errore';
    }
  };

  return (
    <div className={cn("space-y-3 min-w-[320px] max-w-[420px]", className)}>
      {/* Header con icona e messaggio */}
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-5 text-destructive">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-4">
            {message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {getErrorTypeLabel()}
          </p>
        </div>
      </div>

      {/* Dettagli tecnici (solo in sviluppo) */}
      {showDetails && details && (
        <div className="space-y-2">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDetailsExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Dettagli tecnici
          </button>
            
          {isDetailsExpanded && (
            <div className="p-2.5 bg-muted/50 rounded-md border">
              <pre className="text-xs text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Azioni contestuali */}
      <div className="flex gap-2 pt-1">
        {/* Azione di retry per errori di rete e verifica */}
        {onRetry && (isNetworkError || isVerificationError) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex-1 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            {isVerificationError ? 'Riprova verifica' : 'Riprova'}
          </Button>
        )}
        
        {/* Azione Home per errori server */}
        {onGoHome && !isAuthError && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGoHome}
            className="flex-1 h-8 text-xs"
          >
            <Home className="h-3 w-3 mr-1.5" />
            Home
          </Button>
        )}
        
        {/* Azione Logout per errori di auth */}
        {onSignOut && isAuthError && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onSignOut}
            className="flex-1 h-8 text-xs"
          >
            <LogOut className="h-3 w-3 mr-1.5" />
            Logout
          </Button>
        )}

        {/* Se non ci sono azioni specifiche, mostra un'azione generica */}
        {!onRetry && !onGoHome && !onSignOut && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex-1 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Ricarica pagina
          </Button>
        )}
      </div>
    </div>
  );
}