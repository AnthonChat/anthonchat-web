/**
 * Utility per mappare errori HTTP e di sistema ai tipi di notifica
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import { 
  NotificationErrorType, 
  NotificationAction,
  ErrorNotificationOptions 
} from './types';
import { getErrorMessage } from './config';

/**
 * Mappa errori comuni ai loro tipi di notifica
 */
export function mapErrorToNotificationType(error: unknown): NotificationErrorType {
  if (!error) return NotificationErrorType.UNKNOWN_ERROR;

  // Gestione oggetti Response (fetch API)
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return NotificationErrorType.AUTH_UNAUTHORIZED;
      case 403:
        return NotificationErrorType.AUTH_UNAUTHORIZED;
      case 408:
        return NotificationErrorType.VERIFICATION_TIMEOUT;
      case 429:
        return NotificationErrorType.API_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return NotificationErrorType.SERVER_ERROR;
      default:
        return NotificationErrorType.API_ERROR;
    }
  }

  // Gestione oggetti Error
  const errorStr = error instanceof Error ? error.message : String(error);
  const lowerError = errorStr.toLowerCase();

  // Errori di verifica
  if (lowerError.includes('nonce') && lowerError.includes('expired')) {
    return NotificationErrorType.VERIFICATION_EXPIRED;
  }
  if (lowerError.includes('nonce') && lowerError.includes('invalid')) {
    return NotificationErrorType.NONCE_INVALID;
  }
  if (lowerError.includes('verification') && lowerError.includes('polling')) {
    return NotificationErrorType.VERIFICATION_POLLING_ERROR;
  }
  if (lowerError.includes('verification') && lowerError.includes('timeout')) {
    return NotificationErrorType.VERIFICATION_TIMEOUT;
  }

  // Errori di rete
  if (lowerError.includes('network') || lowerError.includes('fetch failed')) {
    return NotificationErrorType.NETWORK_ERROR;
  }
  if (lowerError.includes('connectivity') || lowerError.includes('offline')) {
    return NotificationErrorType.CONNECTIVITY_LOST;
  }
  if (lowerError.includes('cors') || lowerError.includes('connection')) {
    return NotificationErrorType.NETWORK_ERROR;
  }

  // Errori di auth
  if (lowerError.includes('session') && lowerError.includes('expired')) {
    return NotificationErrorType.AUTH_SESSION_EXPIRED;
  }
  if (lowerError.includes('unauthorized') || lowerError.includes('403')) {
    return NotificationErrorType.AUTH_UNAUTHORIZED;
  }
  if (lowerError.includes('token') && lowerError.includes('refresh')) {
    return NotificationErrorType.AUTH_TOKEN_REFRESH_FAILED;
  }
  if (lowerError.includes('jwt') && lowerError.includes('expired')) {
    return NotificationErrorType.AUTH_SESSION_EXPIRED;
  }

  // Errori server
  if (lowerError.includes('500') || lowerError.includes('internal server error')) {
    return NotificationErrorType.SERVER_ERROR;
  }
  if (lowerError.includes('503') || lowerError.includes('service unavailable')) {
    return NotificationErrorType.SERVER_ERROR;
  }

  // Errori API generici
  if (lowerError.includes('api') || lowerError.includes('request failed')) {
    return NotificationErrorType.API_ERROR;
  }

  return NotificationErrorType.UNKNOWN_ERROR;
}

/**
 * Mappa i codici di stato HTTP ai tipi di errore
 */
export function mapHttpStatusToErrorType(status: number): NotificationErrorType {
  switch (status) {
    case 400:
      return NotificationErrorType.API_ERROR;
    case 401:
      return NotificationErrorType.AUTH_UNAUTHORIZED;
    case 403:
      return NotificationErrorType.AUTH_UNAUTHORIZED;
    case 408:
      return NotificationErrorType.VERIFICATION_TIMEOUT;
    case 429:
      return NotificationErrorType.API_ERROR;
    case 500:
    case 502:
    case 503:
    case 504:
      return NotificationErrorType.SERVER_ERROR;
    default:
      if (status >= 400 && status < 500) {
        return NotificationErrorType.API_ERROR;
      }
      if (status >= 500) {
        return NotificationErrorType.SERVER_ERROR;
      }
      return NotificationErrorType.UNKNOWN_ERROR;
  }
}

/**
 * Genera azioni contestuali automatiche basate sul tipo di errore
 */
export function generateContextualActions(
  errorType: NotificationErrorType,
  context?: string,
  customCallbacks?: {
    onRetry?: () => void | Promise<void>;
    onSignOut?: () => void | Promise<void>;
    onGoHome?: () => void | Promise<void>;
    onRefresh?: () => void | Promise<void>;
  }
): NotificationAction[] {
  const actions: NotificationAction[] = [];

  switch (errorType) {
    case NotificationErrorType.VERIFICATION_POLLING_ERROR:
      if (customCallbacks?.onRetry) {
        actions.push({
          label: 'Riprova verifica',
          onClick: customCallbacks.onRetry,
          variant: 'default'
        });
      }
      break;

    case NotificationErrorType.VERIFICATION_TIMEOUT:
    case NotificationErrorType.VERIFICATION_EXPIRED:
      if (customCallbacks?.onRetry) {
        actions.push({
          label: 'Nuova verifica',
          onClick: customCallbacks.onRetry,
          variant: 'default'
        });
      }
      break;

    case NotificationErrorType.NETWORK_ERROR:
    case NotificationErrorType.CONNECTIVITY_LOST:
      if (customCallbacks?.onRetry) {
        actions.push({
          label: 'Riprova',
          onClick: customCallbacks.onRetry,
          variant: 'default'
        });
      }
      actions.push({
        label: 'Ricarica pagina',
        onClick: customCallbacks?.onRefresh || (() => window.location.reload()),
        variant: 'outline'
      });
      break;

    case NotificationErrorType.AUTH_SESSION_EXPIRED:
    case NotificationErrorType.AUTH_UNAUTHORIZED:
    case NotificationErrorType.AUTH_TOKEN_REFRESH_FAILED:
      if (customCallbacks?.onSignOut) {
        actions.push({
          label: 'Effettua logout',
          onClick: customCallbacks.onSignOut,
          variant: 'destructive'
        });
      }
      break;

    case NotificationErrorType.SERVER_ERROR:
      if (customCallbacks?.onRetry) {
        actions.push({
          label: 'Riprova',
          onClick: customCallbacks.onRetry,
          variant: 'default'
        });
      }
      if (customCallbacks?.onGoHome) {
        actions.push({
          label: 'Torna alla home',
          onClick: customCallbacks.onGoHome,
          variant: 'outline'
        });
      }
      break;

    case NotificationErrorType.API_ERROR:
      if (customCallbacks?.onRetry) {
        actions.push({
          label: 'Riprova',
          onClick: customCallbacks.onRetry,
          variant: 'default'
        });
      }
      break;

    default:
      // Per errori non gestiti, offri un'azione generica
      if (customCallbacks?.onRefresh) {
        actions.push({
          label: 'Ricarica',
          onClick: customCallbacks.onRefresh,
          variant: 'outline'
        });
      }
      break;
  }

  return actions;
}

/**
 * Crea opzioni complete per la notifica di errore basate su error e context
 */
export function createErrorNotificationOptions(
  error: unknown,
  context?: string,
  customActions?: NotificationAction[],
  customCallbacks?: {
    onRetry?: () => void | Promise<void>;
    onSignOut?: () => void | Promise<void>;
    onGoHome?: () => void | Promise<void>;
    onRefresh?: () => void | Promise<void>;
  }
): ErrorNotificationOptions {
  const errorType = mapErrorToNotificationType(error);
  const actions = customActions || generateContextualActions(errorType, context, customCallbacks);

  return {
    errorType,
    context,
    originalError: error,
    customActions: actions.length > 0 ? actions : undefined,
    userSuggestion: getErrorMessage(errorType).userSuggestion
  };
}

/**
 * Utility per determinare se un errore è di tipo network/connectivity
 */
export function isNetworkError(error: unknown): boolean {
  const errorType = mapErrorToNotificationType(error);
  return [
    NotificationErrorType.NETWORK_ERROR,
    NotificationErrorType.CONNECTIVITY_LOST,
    NotificationErrorType.API_ERROR
  ].includes(errorType);
}

/**
 * Utility per determinare se un errore è di tipo auth
 */
export function isAuthError(error: unknown): boolean {
  const errorType = mapErrorToNotificationType(error);
  return [
    NotificationErrorType.AUTH_SESSION_EXPIRED,
    NotificationErrorType.AUTH_UNAUTHORIZED,
    NotificationErrorType.AUTH_TOKEN_REFRESH_FAILED
  ].includes(errorType);
}

/**
 * Utility per determinare se un errore è di tipo verification
 */
export function isVerificationError(error: unknown): boolean {
  const errorType = mapErrorToNotificationType(error);
  return [
    NotificationErrorType.VERIFICATION_POLLING_ERROR,
    NotificationErrorType.VERIFICATION_TIMEOUT,
    NotificationErrorType.VERIFICATION_EXPIRED,
    NotificationErrorType.NONCE_INVALID
  ].includes(errorType);
}

/**
 * Utility per estrarre dettagli utili dall'errore per debugging
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  if (error instanceof Response) {
    details.status = error.status;
    details.statusText = error.statusText;
    details.url = error.url;
    details.type = 'Response';
  } else if (error instanceof Error) {
    details.name = error.name;
    details.message = error.message;
    details.stack = error.stack;
    details.type = 'Error';
  } else {
    details.value = error;
    details.type = typeof error;
  }

  details.timestamp = new Date().toISOString();
  return details;
}