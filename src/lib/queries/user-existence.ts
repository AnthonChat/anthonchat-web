"use server";

import { createClient, createServiceRoleClient } from "@/lib/db/server";
import type { Database } from "@/lib/db/schemas/public";
import type { User, Session } from "@supabase/supabase-js";

// Type aliases for better readability
type UserRow = Database["public"]["Tables"]["users"]["Row"];

/**
 * Checks if a user exists in the database by email address
 * Uses service role client to bypass RLS for user existence checks
 * 
 * @param email - The email address to check
 * @returns Promise<boolean> - True if user exists, false otherwise
 */
export async function checkUserExists(email: string): Promise<boolean> {
  if (!email || typeof email !== 'string') {
    return false;
  }

  try {
    // Use service role client to bypass RLS for existence checks
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error) {
      // If error is "PGRST116" (no rows found), user doesn't exist
      if (error.code === 'PGRST116') {
        return false;
      }
      
      console.error("CHECK_USER_EXISTS_ERROR:", {
        error: error.message,
        email: email.substring(0, 3) + "***", // Privacy-safe logging
      });
      
      // On other errors, assume user doesn't exist to be safe
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("CHECK_USER_EXISTS_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
      email: email.substring(0, 3) + "***", // Privacy-safe logging
    });
    
    // On exceptions, assume user doesn't exist to be safe
    return false;
  }
}

/**
 * Retrieves full user data by email address
 * Uses service role client to bypass RLS for user lookups
 * 
 * @param email - The email address to look up
 * @returns Promise<UserRow | null> - User data if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  if (!email || typeof email !== 'string') {
    return null;
  }

  try {
    // Use service role client to bypass RLS for user lookups
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error) {
      // If error is "PGRST116" (no rows found), user doesn't exist
      if (error.code === 'PGRST116') {
        return null;
      }
      
      console.error("GET_USER_BY_EMAIL_ERROR:", {
        error: error.message,
        email: email.substring(0, 3) + "***", // Privacy-safe logging
      });
      
      return null;
    }

    return data;
  } catch (error) {
    console.error("GET_USER_BY_EMAIL_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
      email: email.substring(0, 3) + "***", // Privacy-safe logging
    });
    
    return null;
  }
}

/**
 * Gets the current authentication state for a user session
 * Uses regular client to respect RLS and get current session
 * 
 * @returns Promise<{ user: User | null; session: Session | null; isAuthenticated: boolean }>
 */
export async function getUserAuthState(): Promise<{
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}> {
  try {
    const supabase = await createClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("GET_USER_AUTH_STATE_ERROR:", {
        error: error.message,
      });
      
      return {
        user: null,
        session: null,
        isAuthenticated: false,
      };
    }

    return {
      user: session?.user ?? null,
      session,
      isAuthenticated: !!session?.user,
    };
  } catch (error) {
    console.error("GET_USER_AUTH_STATE_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return {
      user: null,
      session: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Checks if the current user is logged in by verifying session
 * 
 * @returns Promise<boolean> - True if user is logged in, false otherwise
 */
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const { isAuthenticated } = await getUserAuthState();
    return isAuthenticated;
  } catch (error) {
    console.error("IS_USER_LOGGED_IN_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return false;
  }
}

/**
 * Retrieves the current user's profile data
 * Combines auth session data with database user data
 * 
 * @returns Promise<{ authUser: User | null; profileData: UserRow | null }> - User profile information
 */
export async function getUserProfile(): Promise<{
  authUser: User | null;
  profileData: UserRow | null;
}> {
  try {
    const { user: authUser } = await getUserAuthState();
    
    if (!authUser) {
      return {
        authUser: null,
        profileData: null,
      };
    }

    // Get profile data from database using the existing getUserData function
    // We need to import it from the user.ts file
    const supabase = await createClient();
    
    const { data: profileData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error) {
      console.error("GET_USER_PROFILE_ERROR:", {
        error: error.message,
        userId: authUser.id,
      });
      
      return {
        authUser,
        profileData: null,
      };
    }

    return {
      authUser,
      profileData,
    };
  } catch (error) {
    console.error("GET_USER_PROFILE_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return {
      authUser: null,
      profileData: null,
    };
  }
}

/**
 * Checks if the current user has completed onboarding
 * Uses the existing database function check_onboarding_complete
 * 
 * @param userId - Optional user ID, if not provided will get from current session
 * @returns Promise<boolean> - True if onboarding is complete, false otherwise
 */
export async function hasUserCompletedOnboarding(userId?: string): Promise<boolean> {
  try {
    let targetUserId = userId;
    
    // If no userId provided, get from current session
    if (!targetUserId) {
      const { user } = await getUserAuthState();
      if (!user) {
        return false;
      }
      targetUserId = user.id;
    }

    const supabase = await createClient();
    
    const { data: isComplete, error } = await supabase.rpc(
      "check_onboarding_complete",
      { user_id_param: targetUserId }
    );

    if (error) {
      console.error("HAS_USER_COMPLETED_ONBOARDING_ERROR:", {
        error: error.message,
        userId: targetUserId,
      });
      
      // On error, assume onboarding is not complete to be safe
      return false;
    }

    return !!isComplete;
  } catch (error) {
    console.error("HAS_USER_COMPLETED_ONBOARDING_EXCEPTION:", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });
    
    // On exception, assume onboarding is not complete to be safe
    return false;
  }
}