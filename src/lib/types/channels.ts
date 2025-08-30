// lib/types/channels.ts

import type { Database as PublicDatabase } from "@/lib/db/schemas/public";

// Type aliases for better readability
export type Channel = PublicDatabase["public"]["Tables"]["channels"]["Row"];
export type UserChannel =
  PublicDatabase["public"]["Tables"]["user_channels"]["Row"];
export type UserChannelInsert =
  PublicDatabase["public"]["Tables"]["user_channels"]["Insert"];
export type UserChannelUpdate =
  PublicDatabase["public"]["Tables"]["user_channels"]["Update"];

// Return type for getUserChannels with joined channel data
export interface UserChannelWithChannel {
  id: string;
  link: string;
  verified_at: string | null;
  channel_id: string;
  channels: Channel;
}
