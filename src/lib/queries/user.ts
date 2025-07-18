import { createClient } from "@/utils/supabase/server";
import {Tables} from "@/utils/supabase/types"


/**
 * Fetches the user data for a given user ID.
 */
export async function getUserData(userId: string): Promise<Tables<"users">> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("users")
		.select("*")
		.eq("id", userId)
		.single();
	if (error) {
		console.error("Error fetching user data:", error);
		throw error;
	}
	return data;
}
