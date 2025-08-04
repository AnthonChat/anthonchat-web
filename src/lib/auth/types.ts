/**
 * Tipi TypeScript per il flusso di autenticazione e signup
 * Definisce interfacce per la gestione dello stato del form, validazione, e errori
 */

/**
 * Stato del form per la gestione delle Server Actions
 * Utilizzato per comunicare stato, errori e successo tra client e server
 */
export interface FormState {
  /** Messaggio generale di errore o successo */
  message?: string;
  /** Errori specifici per campo */
  errors?: ValidationError[];
  /** Flag di successo dell'operazione */
  success?: boolean;
  /** ID utente creato (solo su successo) */
  userId?: string;
}

/**
 * Dati del form di signup validati
 * Rappresenta i dati puliti e validati dal FormData
 */
export interface SignupFormData {
  /** Email dell'utente (validata) */
  email: string;
  /** Password dell'utente (validata) */
  password: string;
}

/**
 * Errore di validazione per campo specifico
 * Utilizzato per mostrare errori specifici sui campi del form
 */
export interface ValidationError {
  /** Campo che ha generato l'errore */
  field: string;
  /** Messaggio di errore da mostrare all'utente */
  message: string;
}

/**
 * Risultato della validazione dei dati del form
 * Contiene i dati validati o gli errori di validazione
 */
export interface ValidationResult {
  /** Indica se la validazione è passata */
  isValid: boolean;
  /** Dati validati (solo se isValid = true) */
  data?: SignupFormData;
  /** Errori di validazione (solo se isValid = false) */
  errors?: ValidationError[];
}

/**
 * Schema di validazione per l'email
 * Pattern regex per validare formato email
 */
export const EMAIL_VALIDATION = {
  /** Regex pattern per validazione email */
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Messaggio di errore per email non valida */
  message: "Inserisci un indirizzo email valido",
  /** Messaggio di errore per email mancante */
  required: "L'email è richiesta",
} as const;

/**
 * Schema di validazione per la password
 * Requisiti minimi di sicurezza per la password
 */
export const PASSWORD_VALIDATION = {
  /** Lunghezza minima password */
  minLength: 8,
  /** Regex pattern per validazione password (almeno 8 caratteri, una maiuscola, una minuscola, un numero) */
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  /** Messaggio di errore per password non valida */
  message: "La password deve contenere almeno 8 caratteri, una maiuscola, una minuscola e un numero",
  /** Messaggio di errore per password mancante */
  required: "La password è richiesta",
} as const;

/**
 * Tipi di errore per categorizzare gli errori durante il signup
 */
export enum SignupErrorType {
  /** Errore di validazione input */
  VALIDATION = "VALIDATION",
  /** Errore di autenticazione Supabase */
  AUTH = "AUTH",
  /** Errore di creazione customer Stripe */
  STRIPE = "STRIPE",
  /** Errore di sincronizzazione database */
  SYNC = "SYNC",
  /** Errore interno del server */
  INTERNAL = "INTERNAL",
}

/**
 * Tipi di errore per la gestione unificata degli errori di autenticazione
 */
export enum AuthErrorType {
  /** Errore di sessione scaduta o non valida */
  SESSION_EXPIRED = "SESSION_EXPIRED",
  /** Errore di permessi insufficienti */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** Errore di autenticazione fallita */
  AUTH_FAILED = "AUTH_FAILED",
  /** Errore di refresh token */
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  /** Errore di connessione */
  NETWORK_ERROR = "NETWORK_ERROR",
  /** Errore di server */
  SERVER_ERROR = "SERVER_ERROR",
  /** Errore generico */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Interfaccia per errori di autenticazione strutturati
 */
export interface AuthError {
  /** Tipo di errore */
  type: AuthErrorType;
  /** Messaggio di errore per l'utente */
  message: string;
  /** Codice di errore interno (opzionale) */
  code?: string;
  /** Dettagli aggiuntivi per debugging (opzionale) */
  details?: Record<string, unknown>;
  /** Timestamp dell'errore */
  timestamp: Date;
  /** Indica se l'utente deve essere reindirizzato al login */
  requiresReauth?: boolean;
}

/**
 * Stato di autenticazione per il provider globale
 */
export interface AuthState {
  /** Utente autenticato */
  user: unknown | null;
  /** Sessione attiva */
  session: unknown | null;
  /** Stato di caricamento */
  isLoading: boolean;
  /** Stato di autenticazione */
  isAuthenticated: boolean;
  /** Errore di autenticazione strutturato */
  error: AuthError | null;
  /** Stato di inizializzazione completata */
  isInitialized: boolean;
}

/**
 * Azioni disponibili nel context di autenticazione
 */
export interface AuthActions {
  /** Funzione di logout */
  signOut: () => Promise<void>;
  /** Funzione di refresh sessione */
  refreshSession: () => Promise<{ user: unknown | null; session: unknown | null }>;
  /** Funzione per pulire errori */
  clearError: () => void;
  /** Funzione per settare errore strutturato */
  setError: (error: AuthError) => void;
}

/**
 * Context value combinato per AuthProvider
 */
export interface AuthContextValue extends AuthState, AuthActions {}

/**
 * Configurazione per il processo di signup
 * Contiene timeout e altre configurazioni del processo
 */
export const SIGNUP_CONFIG = {
  /** Timeout per la sincronizzazione Stripe customer (in ms) */
  STRIPE_SYNC_TIMEOUT: 20000,
  /** Intervallo di check per la sincronizzazione (in ms) */
  STRIPE_SYNC_INTERVAL: 100,
  /** URL di redirect dopo signup completato */
  COMPLETION_REDIRECT: '/signup/complete',
} as const;

/**
 * Funzione di utilità per validare FormData di signup
 * @param formData - FormData da validare
 * @returns Risultato della validazione con dati o errori
 */
export function validateSignupFormData(formData: FormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Estrazione e pulizia dati
  const email = formData.get("email")?.toString()?.trim();
  const password = formData.get("password")?.toString();

  // Validazione email
  if (!email) {
    errors.push({
      field: "email",
      message: EMAIL_VALIDATION.required,
    });
  } else if (!EMAIL_VALIDATION.pattern.test(email)) {
    errors.push({
      field: "email",
      message: EMAIL_VALIDATION.message,
    });
  }

  // Validazione password
  if (!password) {
    errors.push({
      field: "password",
      message: PASSWORD_VALIDATION.required,
    });
  } else if (!PASSWORD_VALIDATION.pattern.test(password)) {
    errors.push({
      field: "password",
      message: PASSWORD_VALIDATION.message,
    });
  }

  // Ritorna risultato
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    data: {
      email: email!,
      password: password!,
    },
  };
}

/**
 * Funzione di utilità per creare FormState di errore
 * @param message - Messaggio di errore generale
 * @param errors - Errori specifici per campo (opzionale)
 * @returns FormState con errore
 */
export function createErrorFormState(
  message: string,
  errors?: ValidationError[]
): FormState {
  return {
    message,
    errors,
    success: false,
  };
}

/**
 * Funzione di utilità per creare FormState di successo
 * @param message - Messaggio di successo
 * @param userId - ID utente creato (opzionale)
 * @returns FormState con successo
 */
export function createSuccessFormState(
  message: string,
  userId?: string
): FormState {
  return {
    message,
    success: true,
    userId,
  };
}

/**
 * Funzione di utilità per creare errori di autenticazione strutturati
 * @param type - Tipo di errore
 * @param message - Messaggio di errore
 * @param options - Opzioni aggiuntive per l'errore
 * @returns AuthError strutturato
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    requiresReauth?: boolean;
  } = {}
): AuthError {
  return {
    type,
    message,
    code: options.code,
    details: options.details,
    timestamp: new Date(),
    requiresReauth: options.requiresReauth ?? false,
  };
}

/**
 * Funzione di utilità per convertire errori Supabase in AuthError
 * @param error - Errore Supabase o generico
 * @returns AuthError strutturato
 */
export function supabaseErrorToAuthError(error: unknown): AuthError {
  if (!error) {
    return createAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      "Si è verificato un errore sconosciuto"
    );
  }

  // Type guard per oggetti con proprietà message/code
  const errorObj = error as Record<string, unknown>;
  const message = (typeof errorObj.message === 'string' ? errorObj.message : null) || "Errore di autenticazione";
  const code = typeof errorObj.code === 'string' ? errorObj.code : undefined;
  
  // Mapping specifico per errori Supabase comuni
  if (message.includes("Invalid login credentials")) {
    return createAuthError(
      AuthErrorType.AUTH_FAILED,
      "Credenziali di accesso non valide",
      { code, details: { originalError: error } }
    );
  }
  
  if (message.includes("session_expired") || message.includes("token")) {
    return createAuthError(
      AuthErrorType.SESSION_EXPIRED,
      "La sessione è scaduta, effettua nuovamente l'accesso",
      {
        code,
        details: { originalError: error },
        requiresReauth: true
      }
    );
  }
  
  if (message.includes("network") || message.includes("fetch")) {
    return createAuthError(
      AuthErrorType.NETWORK_ERROR,
      "Errore di connessione, riprova",
      { code, details: { originalError: error } }
    );
  }
  
  // Errore generico
  return createAuthError(
    AuthErrorType.SERVER_ERROR,
    message,
    { code, details: { originalError: error } }
  );
}

/**
 * Messaggi di errore localizzati per i tipi di errore
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorType, string> = {
  [AuthErrorType.SESSION_EXPIRED]: "La sessione è scaduta, effettua nuovamente l'accesso",
  [AuthErrorType.UNAUTHORIZED]: "Non hai i permessi per accedere a questa risorsa",
  [AuthErrorType.AUTH_FAILED]: "Autenticazione fallita, controlla le credenziali",
  [AuthErrorType.TOKEN_REFRESH_FAILED]: "Errore nel rinnovo della sessione",
  [AuthErrorType.NETWORK_ERROR]: "Errore di connessione, controlla la tua connessione",
  [AuthErrorType.SERVER_ERROR]: "Errore del server, riprova più tardi",
  [AuthErrorType.UNKNOWN_ERROR]: "Si è verificato un errore sconosciuto",
};

/**
 * Funzione per ottenere messaggio localizzato da tipo errore
 * @param type - Tipo di errore
 * @returns Messaggio localizzato
 */
export function getAuthErrorMessage(type: AuthErrorType): string {
  return AUTH_ERROR_MESSAGES[type] || AUTH_ERROR_MESSAGES[AuthErrorType.UNKNOWN_ERROR];
}