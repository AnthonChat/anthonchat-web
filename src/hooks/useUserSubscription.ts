"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/browser";
import { getUserSubscription, UserSubscription } from "@/lib/queries/subscription";
import type { User } from "@supabase/supabase-js";

interface UseUserSubscriptionOptions {
  autoRefetch?: boolean;
  userId?: string; // Allow passing userId directly
}

interface UseUserSubscriptionState {
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user subscription data with optimized performance
 * @param options - Configuration options for the hook
 * @returns Subscription state and actions
 */
export function useUserSubscription(
  options: UseUserSubscriptionOptions = {}
): UseUserSubscriptionState {
  const { autoRefetch = true, userId: providedUserId } = options;
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get user from Supabase only if userId is not provided
  useEffect(() => {
    if (providedUserId) {
      setUser({ id: providedUserId } as User);
      return;
    }

    let mounted = true;
    
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (mounted) {
          if (error) {
            setError(error);
          } else {
            setUser(user);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    getUser();

    // Listen for auth changes only if userId is not provided
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          // Clear subscription when user changes
          if (!session?.user) {
            setSubscription(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [supabase, providedUserId]);

  const fetchSubscription = useCallback(async () => {
    const currentUserId = providedUserId || user?.id;
    
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sub = await getUserSubscription(currentUserId);
      setSubscription(sub);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch subscription");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, providedUserId]);

  useEffect(() => {
    if (autoRefetch) {
      fetchSubscription();
    }
  }, [autoRefetch, fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    clearError,
  };
}