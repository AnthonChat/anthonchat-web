"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "./AuthProvider";
import { checkUserExists } from "@/lib/queries/user-existence";
import type { User } from "@supabase/supabase-js";

/**
 * Props for AuthStateDetector component
 */
export interface AuthStateDetectorProps {
  searchParams: {
    link?: string;
    channel?: string;
    message?: string;
  };
  children?: React.ReactNode;
  onStateDetected?: (state: AuthState) => void;
}

/**
 * Enhanced auth state interface that includes user existence detection
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  userExists: boolean; // New property to track if user exists but is logged out
  hasChannelParams: boolean;
  channelLinkingRequired: boolean;
  redirectPath?: string;
  shouldSkipOnboarding: boolean;
}

/**
 * AuthStateDetector component that determines user authentication state and routes accordingly
 * Handles three distinct user states:
 * 1. New users (not authenticated, user doesn't exist)
 * 2. Existing logged-in users (authenticated)
 * 3. Existing logged-out users (not authenticated, but user exists)
 */
export function AuthStateDetector({ 
  searchParams, 
  children, 
  onStateDetected 
}: AuthStateDetectorProps) {
  const { user, isLoading, isAuthenticated } = useAuthState();
  const router = useRouter();
  
  // Track state internally for routing decisions
  const [, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    userExists: false,
    hasChannelParams: false,
    channelLinkingRequired: false,
    shouldSkipOnboarding: false,
  });

  const [userExistenceChecked, setUserExistenceChecked] = useState(false);
  const [channelParamsValidated, setChannelParamsValidated] = useState(false);

  /**
   * Detects the current user state based on authentication and user existence
   * Implements the core logic for determining user flow scenarios
   */
  const detectUserState = useCallback(async (email?: string): Promise<AuthState> => {
    const hasChannelParams = !!(searchParams.link && searchParams.channel);
    
    // Scenario 1: User is authenticated (logged in)
    if (isAuthenticated && user) {
      return {
        isAuthenticated: true,
        isLoading: false,
        user: user as User,
        userExists: true, // If authenticated, user definitely exists
        hasChannelParams,
        channelLinkingRequired: hasChannelParams,
        shouldSkipOnboarding: false, // Existing authenticated users don't need onboarding
      };
    }

    // Scenario 2: User is not authenticated - need to check if they exist
    let userExists = false;
    
    // Only check user existence if we have an email to check
    if (email && email.trim()) {
      try {
        console.log('AuthStateDetector: Checking user existence for email');
        userExists = await checkUserExists(email.trim().toLowerCase());
        console.log('AuthStateDetector: User existence check result:', userExists);
      } catch (error) {
        console.error("AuthStateDetector: Error checking user existence:", error);
        // On error, assume user doesn't exist to allow signup flow
        userExists = false;
      }
    }

    // Determine if onboarding should be skipped
    // Skip onboarding for new users with successful channel linking
    const shouldSkipOnboarding = hasChannelParams && !userExists;

    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      userExists,
      hasChannelParams,
      channelLinkingRequired: hasChannelParams,
      shouldSkipOnboarding,
    };
  }, [isAuthenticated, user, searchParams]);

  /**
   * Routes the user based on their detected state
   * Implements the decision matrix from the design document
   */
  const routeBasedOnState = useCallback((state: AuthState) => {
    const { link, channel, message } = searchParams;
    
    // Preserve parameters in URL
    const params = new URLSearchParams();
    if (link) params.set('link', link);
    if (channel) params.set('channel', channel);
    if (message) params.set('message', message);
    const paramString = params.toString();
    const paramSuffix = paramString ? `?${paramString}` : '';

    const currentPath = window.location.pathname;

    // Scenario 1: New user with channel params - go to signup
    if (!state.isAuthenticated && !state.userExists && state.hasChannelParams) {
      const redirectPath = `/signup${paramSuffix}`;
      if (state.redirectPath !== redirectPath && !currentPath.includes('/signup')) {
        console.log('AuthStateDetector: Routing new user to signup with channel params');
        setAuthState(prev => ({ ...prev, redirectPath }));
        router.push(redirectPath);
      }
      return;
    }

    // Scenario 2: Existing logged-in user with channel params - go to dashboard for channel linking
    if (state.isAuthenticated && state.hasChannelParams) {
      // Always redirect logged-in users with channel params to dashboard
      // The dashboard will handle the channel linking
      const redirectPath = `/dashboard${paramSuffix}`;
      if (state.redirectPath !== redirectPath && !currentPath.includes('/dashboard')) {
        console.log('AuthStateDetector: Routing logged-in user to dashboard for channel linking');
        setAuthState(prev => ({ ...prev, redirectPath }));
        router.push(redirectPath);
      }
      return;
    }

    // Scenario 3: Existing logged-out user with channel params - go to login
    if (!state.isAuthenticated && state.userExists && state.hasChannelParams) {
      const redirectPath = `/login${paramSuffix}`;
      if (state.redirectPath !== redirectPath && !currentPath.includes('/login')) {
        console.log('AuthStateDetector: Routing existing user to login with channel params');
        setAuthState(prev => ({ ...prev, redirectPath }));
        router.push(redirectPath);
      }
      return;
    }

    // Scenario 4: Authenticated user without channel params - go to dashboard
    if (state.isAuthenticated && !state.hasChannelParams) {
      if (currentPath.includes('/signup') || currentPath.includes('/login')) {
        const redirectPath = '/dashboard';
        console.log('AuthStateDetector: Routing authenticated user to dashboard');
        setAuthState(prev => ({ ...prev, redirectPath }));
        router.push(redirectPath);
      }
      return;
    }

    // Scenario 5: No channel params and not authenticated - let normal routing handle
    if (!state.hasChannelParams && !state.isAuthenticated) {
      // Don't interfere with normal auth flows
      return;
    }
  }, [searchParams, router]);

  /**
   * Handles auth state changes and triggers routing decisions
   * This is the main orchestrator function that coordinates state detection and routing
   */
  const handleAuthStateChange = useCallback(async (email?: string) => {
    if (isLoading) {
      return; // Wait for auth to finish loading
    }

    try {
      console.log('AuthStateDetector: Detecting user state', { 
        isAuthenticated, 
        hasEmail: !!email,
        hasChannelParams: !!(searchParams.link && searchParams.channel)
      });

      const detectedState = await detectUserState(email);
      
      console.log('AuthStateDetector: State detected', {
        isAuthenticated: detectedState.isAuthenticated,
        userExists: detectedState.userExists,
        hasChannelParams: detectedState.hasChannelParams,
        shouldSkipOnboarding: detectedState.shouldSkipOnboarding
      });

      setAuthState(detectedState);
      
      // Notify parent component of state detection
      if (onStateDetected) {
        onStateDetected(detectedState);
      }

      // Route based on detected state only if we have channel params or need to redirect authenticated users
      if (detectedState.hasChannelParams || (detectedState.isAuthenticated && window.location.pathname.includes('/signup'))) {
        routeBasedOnState(detectedState);
      }
      
      setUserExistenceChecked(true);
    } catch (error) {
      console.error("AuthStateDetector: Error in handleAuthStateChange:", error);
      
      // Fallback state on error - be conservative and assume user doesn't exist
      const fallbackState: AuthState = {
        isAuthenticated: !!user,
        isLoading: false,
        user: user as User | null,
        userExists: false, // Conservative assumption on error
        hasChannelParams: !!(searchParams.link && searchParams.channel),
        channelLinkingRequired: !!(searchParams.link && searchParams.channel),
        shouldSkipOnboarding: false, // Conservative assumption on error
      };
      
      console.log('AuthStateDetector: Using fallback state due to error', fallbackState);
      setAuthState(fallbackState);
      
      // Still notify parent of fallback state
      if (onStateDetected) {
        onStateDetected(fallbackState);
      }
      
      setUserExistenceChecked(true);
    }
  }, [isLoading, detectUserState, onStateDetected, routeBasedOnState, user, searchParams, isAuthenticated]);

  /**
   * Validates channel parameters to ensure they're properly formatted
   */
  const validateChannelParams = useCallback(() => {
    const { link, channel } = searchParams;
    
    if (!link || !channel) {
      return false;
    }

    // Basic validation - ensure they're non-empty strings
    if (typeof link !== 'string' || typeof channel !== 'string') {
      return false;
    }

    if (link.trim().length === 0 || channel.trim().length === 0) {
      return false;
    }

    // Additional validation could be added here (e.g., format checks)
    return true;
  }, [searchParams]);

  /**
   * Effect to validate channel parameters on mount
   */
  useEffect(() => {
    const isValid = validateChannelParams();
    setChannelParamsValidated(true);
    
    if (searchParams.link && searchParams.channel && !isValid) {
      console.warn('AuthStateDetector: Invalid channel parameters detected', searchParams);
    }
  }, [validateChannelParams, searchParams]);

  /**
   * Effect to handle initial state detection and auth changes
   */
  useEffect(() => {
    if (channelParamsValidated) {
      handleAuthStateChange();
    }
  }, [handleAuthStateChange, channelParamsValidated]);

  // Auth state is managed internally and communicated via onStateDetected callback

  // Show loading state while detecting auth state
  if (isLoading || !userExistenceChecked || !channelParamsValidated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Render children with detected auth state
  return (
    <>
      {children}
    </>
  );
}

