// lib/queries/channels.ts

import { createClient } from "@/lib/db/server";
import type { Channel, UserChannelWithChannel } from "@/lib/types/channels";

/**
 * Fetches the channels a user is connected to, along with details
 * about the channel from the 'channels' table.
 */
export async function getUserChannels(
  userId: string
): Promise<UserChannelWithChannel[]> {
  const supabase = await createClient();

  // Use a manual join to get the correct data structure
  const { data, error } = await supabase
    .from("user_channels")
    .select(
      `
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
		`
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user channels", { error, userId });
    throw error;
  }

  // Transform the data to match the expected structure
  const transformedData =
    data?.map((item) => ({
      id: item.id,
      link: item.link,
      verified_at: item.verified_at,
      channel_id: item.channel_id,
      channels: Array.isArray(item.channels) ? item.channels[0] : item.channels,
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
    console.error("Error fetching all channels", { error });
    throw error;
  }

  return data || [];
}

/**
 * Deletes a user channel connection.
 */
export async function deleteUserChannel(
  userChannelId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_channels")
    .delete()
    .eq("id", userChannelId)
    .eq("user_id", userId); // Ensure user can only delete their own channels

  if (error) {
    console.error("Error deleting user channel", {
      error,
      userChannelId,
      userId,
    });
    throw error;
  }

  console.info("User channel deleted successfully", { userChannelId, userId });
}
