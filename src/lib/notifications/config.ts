/**
 * Configurazione globale per il sistema di notifiche
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import { 
  NotificationType, 
  NotificationErrorType, 
  NotificationConfig 
} from './types';

/**
 * Configurazione globale per il sistema di notifiche
 */
export const NOTIFICATION_CONFIG = {
  // Configurazioni per tipo
  typeDefaults: {
    [NotificationType.SUCCESS]: {
      duration: 4000,
      position: 'top-right' as const,
      dismissible: true,
      showProgress: false,
      autoCloseOnSuccess: true
    },
    [NotificationType.ERROR]: {
      duration: 0, // Infinito
      position: 'top-right' as const,
      dismissible: true,
      showProgress: false,
      autoCloseOnSuccess: false
    },
    [NotificationType.WARNING]: {
      duration: 8000,
      position: 'top-right' as const,
      dismissible: true,
      showProgress: false,
      autoCloseOnSuccess: false
    },
    [NotificationType.INFO]: {
      duration: 6000,
      position: 'top-right' as const,
      dismissible: true,
      showProgress: false,
      autoCloseOnSuccess: false
    },
    [NotificationType.LOADING]: {
      duration: 0,
      position: 'top-right' as const,
      dismissible: false,
      showProgress: true,
      autoCloseOnSuccess: true
    },
    [NotificationType.VERIFICATION]: {
      duration: 0, // Infinito finché non completata
      position: 'top-right' as const,
      dismissible: true,
      showProgress: true,
      autoCloseOnSuccess: true
    }
  },

  // Configurazioni per errori specifici
  errorDefaults: {
    [NotificationErrorType.VERIFICATION_POLLING_ERROR]: {
      duration: 10000,
      autoRetry: {
        enabled: true,
        maxAttempts: 3,
        intervalMs: 5000
      }
    },
    [NotificationErrorType.VERIFICATION_TIMEOUT]: {
      duration: 0,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.VERIFICATION_EXPIRED]: {
      duration: 0,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.NONCE_INVALID]: {
      duration: 8000,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.NETWORK_ERROR]: {
      duration: 8000,
      autoRetry: {
        enabled: true,
        maxAttempts: 2,
        intervalMs: 3000
      }
    },
    [NotificationErrorType.CONNECTIVITY_LOST]: {
      duration: 0,
      autoRetry: {
        enabled: true,
        maxAttempts: 5,
        intervalMs: 2000
      }
    },
    [NotificationErrorType.API_ERROR]: {
      duration: 8000,
      autoRetry: {
        enabled: true,
        maxAttempts: 2,
        intervalMs: 4000
      }
    },
    [NotificationErrorType.AUTH_SESSION_EXPIRED]: {
      duration: 0,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.AUTH_UNAUTHORIZED]: {
      duration: 0,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.AUTH_TOKEN_REFRESH_FAILED]: {
      duration: 0,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    },
    [NotificationErrorType.SERVER_ERROR]: {
      duration: 10000,
      autoRetry: {
        enabled: true,
        maxAttempts: 2,
        intervalMs: 8000
      }
    },
    [NotificationErrorType.UNKNOWN_ERROR]: {
      duration: 8000,
      autoRetry: {
        enabled: false,
        maxAttempts: 0,
        intervalMs: 0
      }
    }
  },

  // Limiti del sistema
  limits: {
    maxActiveToasts: 5,
    maxQueueSize: 10,
    cleanupInterval: 30000 // 30 secondi
  },

  // Configurazioni di sviluppo
  development: {
    showDetailedErrors: true,
    logAllEvents: true,
    debugMode: true
  },

  // Configurazioni di produzione
  production: {
    showDetailedErrors: false,
    logAllEvents: false,
    debugMode: false
  }
} as const;

/**
 * Configurazione di default per tutti i toast
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  duration: 5000,
  position: 'top-right',
  dismissible: true,
  showProgress: false,
  autoCloseOnSuccess: true
};

/**
 * Messaggi localizzati per diversi tipi di errore
 */
export const ERROR_MESSAGES = {
  [NotificationErrorType.VERIFICATION_POLLING_ERROR]: {
    title: 'Errore durante la verifica',
    message: 'Non riusciamo a verificare lo stato della tua richiesta.',
    userSuggestion: 'Assicurati di aver completato l\'azione richiesta e riprova.'
  },
  [NotificationErrorType.VERIFICATION_TIMEOUT]: {
    title: 'Verifica scaduta',
    message: 'Il tempo limite per la verifica è scaduto.',
    userSuggestion: 'Avvia una nuova verifica per continuare.'
  },
  [NotificationErrorType.VERIFICATION_EXPIRED]: {
    title: 'Link di verifica scaduto',
    message: 'Il link di verifica non è più valido.',
    userSuggestion: 'Genera un nuovo link di verifica.'
  },
  [NotificationErrorType.NONCE_INVALID]: {
    title: 'Codice di verifica non valido',
    message: 'Il codice di verifica non è riconosciuto dal sistema.',
    userSuggestion: 'Avvia una nuova verifica con un codice aggiornato.'
  },
  [NotificationErrorType.NETWORK_ERROR]: {
    title: 'Errore di connessione',
    message: 'Non riusciamo a connetterci ai nostri server.',
    userSuggestion: 'Controlla la tua connessione internet e riprova.'
  },
  [NotificationErrorType.CONNECTIVITY_LOST]: {
    title: 'Connessione persa',
    message: 'La connessione internet è stata interrotta.',
    userSuggestion: 'Reconnettiti e riprova l\'operazione.'
  },
  [NotificationErrorType.API_ERROR]: {
    title: 'Errore API',
    message: 'Si è verificato un errore durante la comunicazione con il server.',
    userSuggestion: 'Riprova tra qualche momento.'
  },
  [NotificationErrorType.AUTH_SESSION_EXPIRED]: {
    title: 'Sessione scaduta',
    message: 'La tua sessione è scaduta per motivi di sicurezza.',
    userSuggestion: 'Effettua nuovamente l\'accesso per continuare.'
  },
  [NotificationErrorType.AUTH_UNAUTHORIZED]: {
    title: 'Accesso negato',
    message: 'Non hai i permessi per eseguire questa operazione.',
    userSuggestion: 'Verifica le tue credenziali e riprova.'
  },
  [NotificationErrorType.AUTH_TOKEN_REFRESH_FAILED]: {
    title: 'Errore di autenticazione',
    message: 'Non è stato possibile rinnovare la sessione.',
    userSuggestion: 'Effettua nuovamente l\'accesso.'
  },
  [NotificationErrorType.SERVER_ERROR]: {
    title: 'Errore del server',
    message: 'Si è verificato un problema temporaneo sui nostri server.',
    userSuggestion: 'Riprova tra qualche minuto.'
  },
  [NotificationErrorType.UNKNOWN_ERROR]: {
    title: 'Errore imprevisto',
    message: 'Si è verificato un errore imprevisto.',
    userSuggestion: 'Riprova o contatta il supporto se il problema persiste.'
  },
  [NotificationErrorType.VALIDATION_ERROR]: {
    title: 'Errore di validazione',
    message: 'Alcuni campi non sono stati compilati correttamente.',
    userSuggestion: 'Correggi i campi evidenziati.'
  }
} as const;

/**
 * Configurazione per il polling di verifica
 */
export const VERIFICATION_POLLING_CONFIG = {
  /** Intervallo di polling in ms */
  intervalMs: 3000,
  /** Timeout totale in ms (5 minuti) */
  timeoutMs: 300000,
  /** Massimo numero di tentativi */
  maxAttempts: 100,
  /** Backoff esponenziale */
  exponentialBackoff: true,
  /** Fattore di backoff */
  backoffFactor: 1.2
} as const;

/**
 * Utility per ottenere la configurazione di un tipo specifico
 */
export function getNotificationTypeConfig(type: NotificationType): NotificationConfig {
  return NOTIFICATION_CONFIG.typeDefaults[type];
}

/**
 * Utility per ottenere la configurazione di un errore specifico
 */
export function getErrorTypeConfig(errorType: NotificationErrorType): Partial<NotificationConfig> {
  return errorType in NOTIFICATION_CONFIG.errorDefaults 
    ? NOTIFICATION_CONFIG.errorDefaults[errorType as keyof typeof NOTIFICATION_CONFIG.errorDefaults]
    : {};
}

/**
 * Utility per ottenere il messaggio di errore localizzato
 */
export function getErrorMessage(errorType: NotificationErrorType) {
  return errorType in ERROR_MESSAGES 
    ? ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES]
    : ERROR_MESSAGES[NotificationErrorType.UNKNOWN_ERROR];
}

/**
 * Utility per determinare se siamo in modalità debug
 */
export function isDebugMode(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'development' ? NOTIFICATION_CONFIG.development.debugMode : NOTIFICATION_CONFIG.production.debugMode;
}

/**
 * Utility per determinare se mostrare errori dettagliati
 */
export function shouldShowDetailedErrors(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'development' ? NOTIFICATION_CONFIG.development.showDetailedErrors : NOTIFICATION_CONFIG.production.showDetailedErrors;
}