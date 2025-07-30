import { createClient } from "@/lib/db/server";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";

// Type aliases for better readability
type User = PublicDatabase["public"]["Tables"]["users"]["Row"];
type UserInsert = PublicDatabase["public"]["Tables"]["users"]["Insert"];
type UserUpdate = PublicDatabase["public"]["Tables"]["users"]["Update"];

/**
 * Fetches the user data for a given user ID.
 */
export async function getUserData(userId: string): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("USER_DATA_FETCH:", {
      error: error.message,
      userId,
    });
    throw error;
  }

  return data;
}

/**
 * Updates user data for a given user ID.
 */
export async function updateUserData(
  userId: string,
  updates: UserUpdate
): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("USER_DATA_UPDATE:", {
      error: error.message,
      userId,
      updates,
    });
    throw error;
  }

  return data;
}

/**
 * Creates a new user record.
 */
export async function createUser(userData: UserInsert): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .insert(userData)
    .select("*")
    .single();

  if (error) {
    console.error("USER_CREATE:", {
      error: error.message,
      userData,
    });
    throw error;
  }

  return data;
}
