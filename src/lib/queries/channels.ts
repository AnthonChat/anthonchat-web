// lib/queries/channels.ts

import { createClient } from "@/utils/supabase/server";
import type { 
  Channel, 
  UserChannel, 
  UserChannelInsert, 
  UserChannelUpdate, 
  UserChannelWithChannel 
} from "@/lib/types/channels";

/**
 * Fetches the channels a user is connected to, along with details
 * about the channel from the 'channels' table.
 */
export async function getUserChannels(userId: string): Promise<UserChannelWithChannel[]> {
	const supabase = await createClient();

	// Use a manual join to get the correct data structure
	const { data, error } = await supabase
		.from("user_channels")
		.select(`
			id,
			link,
			verified_at,
			channel_id,
			channels!user_channels_channel_id_fkey (
				id,
				link_method,
				is_active,
				created_at
			)
		`)
		.eq("user_id", userId);

	if (error) {
		console.error("Error fetching user channels:", error);
		throw error;
	}

	// Transform the data to match the expected structure
	const transformedData = data?.map(item => ({
		id: item.id,
		link: item.link,
		verified_at: item.verified_at,
		channel_id: item.channel_id,
		channels: Array.isArray(item.channels) ? item.channels[0] : item.channels
	})) || [];

	return transformedData;
}

/**
 * Fetches all currently active channels.
 */
export async function getAllChannels(): Promise<Channel[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("channels")
		.select("*")
		.eq("is_active", true);

	if (error) {
		console.error("Error fetching all channels:", error);
		throw error;
	}

	return data || [];
}

/**
 * Checks if a specific user is connected to a specific channel.
 */
export async function getChannelConnectionStatus(
	userId: string,
	channelId: string
): Promise<Pick<UserChannel, "id" | "verified_at"> | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_channels")
		.select("id, verified_at") // Selecting specific columns is better than '*'
		.eq("user_id", userId)
		.eq("channel_id", channelId)
		.single();

	if (error && error.code !== "PGRST116") {
		// PGRST116 means 'no rows found', which is a valid result here.
		console.error("Error getting channel connection status:", error);
		throw error;
	}

	return data;
}

/**
 * Creates a new user channel connection.
 */
export async function createUserChannel(userChannelData: UserChannelInsert): Promise<UserChannel> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_channels")
		.insert(userChannelData)
		.select("*")
		.single();

	if (error) {
		console.error("Error creating user channel:", error);
		throw error;
	}

	return data;
}

/**
 * Updates a user channel connection.
 */
export async function updateUserChannel(
	userChannelId: string, 
	updates: UserChannelUpdate
): Promise<UserChannel> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_channels")
		.update(updates)
		.eq("id", userChannelId)
		.select("*")
		.single();

	if (error) {
		console.error("Error updating user channel:", error);
		throw error;
	}

	return data;
}
