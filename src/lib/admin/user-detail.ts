import { createServiceRoleClient } from "@/lib/db/server";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";
import type { Database as StripeDatabase } from "@/lib/db/schemas/stripe";

type UserRow = PublicDatabase["public"]["Tables"]["users"]["Row"];
type UserChannelRow = PublicDatabase["public"]["Tables"]["user_channels"]["Row"];
type ChatMessageRow = PublicDatabase["public"]["Tables"]["chat_messages"]["Row"];
type StripeSubscription = StripeDatabase["stripe"]["Tables"]["subscriptions"]["Row"];

export type NormalizedSubscriptionStatus =
  | "trialing"
  | "subscribed"
  | "unsubscribed"
  | "canceled"
  | "past_due";

function normalizeStatus(stripeStatus: string | null | undefined): NormalizedSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "subscribed";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    // extra Stripe states default to unsubscribed
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    default:
      return "unsubscribed";
  }
}

export interface AdminUserOverview {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  created_at: string;
  channels: string[]; // channel_id list
  channels_count: number;
  messages_count: number; // exact (all-time) messages across user's channels
  subscription: {
    normalized_status: NormalizedSubscriptionStatus;
    stripe_status: string | null;
    cancel_at_period_end: boolean;
    current_period_start: number | null;
    current_period_end: number | null;
    trial_end: number | null;
  };
}

export interface AdminUserMessage {
  id: number;
  created_at: string;
  role: PublicDatabase["public"]["Enums"]["chat_role"]; // "user" | "assistant"
  content: string;
  user_channel: string;
  channel_id: string;
}

async function fetchLatestSubscriptionForCustomer(customerId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .schema("stripe")
    .from("subscriptions")
    .select(
      "id,status,customer,created,cancel_at_period_end,current_period_start,current_period_end,trial_end"
    )
    .eq("customer", customerId)
    .order("created", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[ADMIN_USER_DETAIL_SUBS_ERROR]", { error, customerId });
    return null;
  }
  return Array.isArray(data) && data.length > 0 ? (data[0] as StripeSubscription) : null;
}

/**
 * Fetch an admin overview for a single user.
 * - Basic profile
 * - Connected channels (ids + count)
 * - Exact total messages across all user channels (all-time)
 * - Latest Stripe subscription summary (normalized)
 */
export async function fetchAdminUserOverview(userId: string): Promise<AdminUserOverview | null> {
  const service = createServiceRoleClient();

  // 1) user
  const { data: user, error: userErr } = await service
    .from("users")
    .select("id,email,first_name,last_name,nickname,created_at,stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !user) {
    console.error("[ADMIN_USER_DETAIL_USER_ERROR]", { error: userErr, userId });
    return null;
  }

  // 2) channels
  const { data: userChannels, error: chErr } = await service
    .from("user_channels")
    .select("id,channel_id")
    .eq("user_id", userId);

  if (chErr) {
    console.error("[ADMIN_USER_DETAIL_CHANNELS_ERROR]", { error: chErr, userId });
    return null;
  }

  const chRows = (userChannels || []) as Pick<UserChannelRow, "id" | "channel_id">[];
  const channels = chRows.map((c) => c.channel_id);
  const userChannelIds = chRows.map((c) => c.id);
  const channels_count = channels.length;

  // 3) all-time messages count across user's channels
  let messages_count = 0;
  if (userChannelIds.length > 0) {
    const { count, error: msgCountErr } = await service
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .in("user_channel", userChannelIds);

    if (msgCountErr) {
      console.error("[ADMIN_USER_DETAIL_MSGCOUNT_ERROR]", { error: msgCountErr, userId });
    } else {
      messages_count = count ?? 0;
    }
  }

  // 4) latest subscription
  let normalized_status: NormalizedSubscriptionStatus = "unsubscribed";
  let stripe_status: string | null = null;
  let cancel_at_period_end = false;
  let current_period_start: number | null = null;
  let current_period_end: number | null = null;
  let trial_end: number | null = null;

  const customerId = (user as unknown as { stripe_customer_id?: string | null })?.stripe_customer_id ?? null;
  if (customerId) {
    const sub = await fetchLatestSubscriptionForCustomer(customerId);
    if (sub) {
      stripe_status = (sub.status as string | null) ?? null;
      normalized_status = normalizeStatus(stripe_status);
      cancel_at_period_end = !!sub.cancel_at_period_end;
      current_period_start = (sub.current_period_start as number | null) ?? null;
      current_period_end = (sub.current_period_end as number | null) ?? null;
      trial_end = (sub.trial_end as number | null) ?? null;
    }
  }

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    nickname: user.nickname,
    created_at: user.created_at,
    channels,
    channels_count,
    messages_count,
    subscription: {
      normalized_status,
      stripe_status,
      cancel_at_period_end,
      current_period_start,
      current_period_end,
      trial_end,
    },
  };
}

/**
 * Fetch messages for a user across all their channels ordered chronologically.
 * Default: limit 200, ascending by created_at.
 */
export async function fetchAdminUserMessages(
  userId: string,
  opts?: { limit?: number; order?: "asc" | "desc" }
): Promise<AdminUserMessage[]> {
  const service = createServiceRoleClient();
  const limit = Math.min(2000, Math.max(1, opts?.limit ?? 200));
  const ascending = (opts?.order ?? "asc") !== "desc";

  // 1) collect user's user_channel ids and channel ids
  const { data: userChannels, error: chErr } = await service
    .from("user_channels")
    .select("id,channel_id")
    .eq("user_id", userId);

  if (chErr) {
    console.error("[ADMIN_USER_DETAIL_FETCH_CH_ERR]", { error: chErr, userId });
    return [];
  }

  const chRows = (userChannels || []) as Pick<UserChannelRow, "id" | "channel_id">[];
  const byUserChannel = new Map<string, string>(); // user_channel_id -> channel_id
  const userChannelIds: string[] = [];
  for (const ch of chRows) {
    byUserChannel.set(ch.id, ch.channel_id);
    userChannelIds.push(ch.id);
  }
  if (userChannelIds.length === 0) return [];

  // 2) fetch messages across those channels
  const { data: messages, error: msgErr } = await service
    .from("chat_messages")
    .select("id,content,created_at,role,user_channel")
    .in("user_channel", userChannelIds)
    .order("created_at", { ascending })
    .limit(limit);

  if (msgErr) {
    console.error("[ADMIN_USER_DETAIL_FETCH_MSG_ERR]", { error: msgErr, userId });
    return [];
  }

  const rows = (messages || []) as Pick<ChatMessageRow, "id" | "content" | "created_at" | "role" | "user_channel">[];
  return rows.map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    role: m.role,
    user_channel: m.user_channel,
    channel_id: byUserChannel.get(m.user_channel) ?? "",
  }));
}