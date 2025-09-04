"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/db/client";
import type { User, Session } from "@supabase/supabase-js";

interface UseAuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface UseAuthActions {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ user: User | null; session: Session | null }>;
  clearError: () => void;
}

interface UseAuthReturn extends UseAuthState, UseAuthActions {}

/**
 * Centralized authentication hook for managing user state
 * Provides real-time auth state updates and common auth actions
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        const msg =
          typeof (error as any).message === "string" && (error as any).message.trim()
            ? (error as any).message
            : (() => {
                try {
                  return JSON.stringify(error);
                } catch {
                  return "Failed to sign out";
                }
              })();
        setError(msg);
        throw error;
      }
    } catch (err) {
      let errorMessage = "Failed to sign out";
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      } else {
        try {
          errorMessage = JSON.stringify(err) || errorMessage;
        } catch {
          /* ignore */
        }
      }
      setError(errorMessage);
      throw err;
    }
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const msg =
          typeof (error as any).message === "string" && (error as any).message.trim()
            ? (error as any).message
            : (() => {
                try {
                  return JSON.stringify(error);
                } catch {
                  return "Failed to refresh session";
                }
              })();
        setError(msg);
        throw error;
      }
      return data;
    } catch (err) {
      let errorMessage = "Failed to refresh session";
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      } else {
        try {
          errorMessage = JSON.stringify(err) || errorMessage;
        } catch {
          /* ignore */
        }
      }
      setError(errorMessage);
      throw err;
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          const msg =
            typeof (error as any).message === "string" && (error as any).message.trim()
              ? (error as any).message
              : (() => {
                  try {
                    return JSON.stringify(error);
                  } catch {
                    return "Failed to get session";
                  }
                })();
          setError(msg);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        if (!mounted) return;
        let errorMessage = "Failed to get session";
        if (err instanceof Error && err.message) {
          errorMessage = err.message;
        } else {
          try {
            errorMessage = JSON.stringify(err) || errorMessage;
          } catch {
            /* ignore */
          }
        }
        setError(errorMessage);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Clear errors on successful auth state changes
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    error,
    signOut,
    refreshSession,
    clearError,
  };
}
