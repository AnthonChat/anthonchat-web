"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  AuthContextValue,
  AuthError
} from "@/lib/auth/types";

// Import delle utility functions e enums dai tipi
import {
  AuthErrorType,
  createAuthError as createError,
  supabaseErrorToAuthError as convertSupabaseError
} from "@/lib/auth/types";

/**
 * Context di autenticazione per state management globale
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Props per AuthProvider
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider che wrappa l'app e fornisce auth state globale
 * Utilizza il robusto useAuth hook esistente e aggiunge error handling strutturato
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    error: hookError,
    signOut: hookSignOut,
    refreshSession: hookRefreshSession,
    clearError: hookClearError,
  } = useAuth();

  /**
   * Converte errore string del hook in AuthError strutturato
   */
  const structuredError: AuthError | null = useMemo(() => {
    if (!hookError) return null;
    
    // Se è già un AuthError strutturato, restituiscilo
    if (typeof hookError === 'object' && 'type' in hookError) {
      return hookError as AuthError;
    }
    
    // Converte errore string in AuthError strutturato
    return createError(
      AuthErrorType.UNKNOWN_ERROR,
      hookError,
      { details: { source: 'useAuth_hook' } }
    );
  }, [hookError]);

  /**
   * Versione enhanced del signOut con error handling strutturato
   */
  const signOut = useCallback(async () => {
    try {
      await hookSignOut();
    } catch (error) {
      // L'errore è già gestito dal hook, ma possiamo aggiungere logging
      console.error('AuthProvider: SignOut error:', error);
      throw convertSupabaseError(error);
    }
  }, [hookSignOut]);

  /**
   * Versione enhanced del refreshSession con error handling strutturato
   */
  const refreshSession = useCallback(async () => {
    try {
      return await hookRefreshSession();
    } catch (error) {
      console.error('AuthProvider: RefreshSession error:', error);
      throw convertSupabaseError(error);
    }
  }, [hookRefreshSession]);

  /**
   * Funzione per settare errore strutturato (placeholder per future implementazioni)
   */
  const setError = useCallback((error: AuthError) => {
    console.error('AuthProvider: Manual error set:', error);
    // Per ora loggiamo, in futuro potremmo estendere useAuth per supportare questo
  }, []);

  /**
   * Clear error function del hook
   */
  const clearError = useCallback(() => {
    hookClearError();
  }, [hookClearError]);

  /**
   * Context value con tutti i valori e azioni
   */
  const contextValue: AuthContextValue = useMemo(
    () => ({
      // State
      user,
      session,
      isLoading,
      isAuthenticated,
      error: structuredError,
      isInitialized: !isLoading, // Considera inizializzato quando non è in loading
      
      // Actions
      signOut,
      refreshSession,
      clearError,
      setError,
    }),
    [
      user,
      session,
      isLoading,
      isAuthenticated,
      structuredError,
      signOut,
      refreshSession,
      clearError,
      setError,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook per accedere al context di autenticazione
 * @returns AuthContextValue con state e actions
 * @throws Error se usato fuori da AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error(
      'useAuthContext deve essere usato all\'interno di un AuthProvider'
    );
  }
  
  return context;
}

/**
 * Hook per accedere solo allo stato di autenticazione (senza actions)
 * Utile per componenti che hanno solo bisogno di leggere lo stato
 */
export function useAuthState() {
  const { 
    user, 
    session, 
    isLoading, 
    isAuthenticated, 
    error, 
    isInitialized 
  } = useAuthContext();
  
  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    isInitialized,
  };
}

/**
 * Hook per accedere solo alle azioni di autenticazione
 * Utile per componenti che hanno solo bisogno di eseguire azioni
 */
export function useAuthActions() {
  const { 
    signOut, 
    refreshSession, 
    clearError, 
    setError 
  } = useAuthContext();
  
  return {
    signOut,
    refreshSession,
    clearError,
    setError,
  };
}

/**
 * HOC per proteggere componenti che richiedono autenticazione
 * @param Component - Componente da proteggere
 * @returns Componente wrappato con protezione auth
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthProtectedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthState();
    
    if (isLoading) {
      return <div>Caricamento...</div>;
    }
    
    if (!isAuthenticated) {
      return <div>Accesso richiesto</div>;
    }
    
    return <Component {...props} />;
  };
}