/**
 * Sistema di tipi per il sistema di notifiche toast
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import React from 'react';

/**
 * Tipi di notifica per categorizzazione e styling
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error', 
  WARNING = 'warning',
  INFO = 'info',
  LOADING = 'loading',
  VERIFICATION = 'verification'
}

/**
 * Tipi di errore specifici per notifiche
 */
export enum NotificationErrorType {
  // Errori di verifica
  VERIFICATION_POLLING_ERROR = 'VERIFICATION_POLLING_ERROR',
  VERIFICATION_TIMEOUT = 'VERIFICATION_TIMEOUT',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED',
  NONCE_INVALID = 'NONCE_INVALID',
  
  // Errori di rete
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  CONNECTIVITY_LOST = 'CONNECTIVITY_LOST',
  
  // Errori di autenticazione
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_TOKEN_REFRESH_FAILED = 'AUTH_TOKEN_REFRESH_FAILED',
  
  // Errori generici
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * Azioni contestuali disponibili nei toast
 */
export interface NotificationAction {
  /** Etichetta del pulsante */
  label: string;
  /** Funzione da eseguire al click */
  onClick: () => void | Promise<void>;
  /** Variante visiva del pulsante */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  /** Icona opzionale */
  icon?: React.ComponentType<{ className?: string }>;
  /** Disabilita il pulsante */
  disabled?: boolean;
}

/**
 * Configurazione del toast
 */
export interface NotificationConfig {
  /** Durata in millisecondi (0 = infinito) */
  duration?: number;
  /** Posizione del toast */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** Dismissible dall'utente */
  dismissible?: boolean;
  /** Mostra progress bar per operazioni lunghe */
  showProgress?: boolean;
  /** Chiudi automaticamente al successo */
  autoCloseOnSuccess?: boolean;
  /** Riprova automaticamente */
  autoRetry?: {
    enabled: boolean;
    maxAttempts: number;
    intervalMs: number;
  };
}

/**
 * Dati del toast di notifica
 */
export interface NotificationData {
  /** ID univoco del toast */
  id: string;
  /** Tipo di notifica */
  type: NotificationType;
  /** Titolo del toast */
  title: string;
  /** Messaggio dettagliato */
  message?: string;
  /** Azioni contestuali */
  actions?: NotificationAction[];
  /** Configurazione del toast */
  config?: NotificationConfig;
  /** Metadati per tracking e debugging */
  metadata?: {
    /** Tipo di errore specifico */
    errorType?: NotificationErrorType;
    /** Context dell'operazione */
    context?: string;
    /** ID dell'operazione correlata */
    operationId?: string;
    /** Timestamp di creazione */
    timestamp: Date;
    /** Dati aggiuntivi per debugging */
    details?: Record<string, unknown>;
  };
}

/**
 * Opzioni per la creazione di toast di errore
 */
export interface ErrorNotificationOptions {
  /** Tipo di errore specifico */
  errorType: NotificationErrorType;
  /** Context dell'operazione */
  context?: string;
  /** Errore originale per debugging */
  originalError?: unknown;
  /** Azioni personalizzate */
  customActions?: NotificationAction[];
  /** Configurazione specifica */
  config?: Partial<NotificationConfig>;
  /** Suggerimenti per l'utente */
  userSuggestion?: string;
}