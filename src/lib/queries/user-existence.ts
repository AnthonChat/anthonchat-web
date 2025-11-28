"use server";

import { createServiceRoleClient } from "@/lib/db/server";

/**
 * Checks if a user exists in the database by email address
 * Uses service role client to bypass RLS for user existence checks
 *
 * @param email - The email address to check
 * @returns Promise<boolean> - True if user exists, false otherwise
 */
export async function checkUserExists(email: string): Promise<boolean> {
  if (!email || typeof email !== "string") {
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
      if (error.code === "PGRST116") {
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
