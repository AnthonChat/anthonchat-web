import { createServiceRoleClient } from "@/lib/db/server";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";
import type { Database as StripeDatabase } from "@/lib/db/schemas/stripe";

/**
 * Types
 */
type UserRow = PublicDatabase["public"]["Tables"]["users"]["Row"];
type UserChannelRow = PublicDatabase["public"]["Tables"]["user_channels"]["Row"];
type UsageRecordRow = PublicDatabase["public"]["Tables"]["usage_records"]["Row"];
type StripeSubscription = StripeDatabase["stripe"]["Tables"]["subscriptions"]["Row"];

export type NormalizedSubscriptionStatus =
  | "trialing"
  | "subscribed"
  | "unsubscribed"
  | "canceled"
  | "past_due";

export interface AdminUserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  created_at: string;
  channels: string[]; // channel_id list
  channels_count: number;
  messages_count: number; // computed from usage records as requests_used (current period proxy)
  subscription: {
    normalized_status: NormalizedSubscriptionStatus;
    stripe_status: string | null;
    cancel_at_period_end: boolean;
    current_period_start: number | null;
    current_period_end: number | null;
    trial_end: number | null;
  };
}

export interface FetchAdminUsersSummaryInput {
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "email";
  ascending?: boolean;
}

/**
 * Normalize Stripe subscription status to a compact set used across the app.
 * Mirrors logic in API route [normalizeStatus] to preserve behavior.
 */
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
    // Stripe other states
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    default:
      return "unsubscribed";
  }
}

/**
 * Fetch a concise admin overview for users:
 * - Connected channels (list + count)
 * - Messages sent (proxy: sum of requests_used from usage_records per user_channel)
 * - Creation date
 * - Subscription status (latest by created for each customer)
 *
 * Notes:
 * - Uses the service role client to bypass RLS for admin-only aggregation.
 * - Uses batched queries and in-memory reduction (no N+1).
 * - The "messages_count" uses usage_records.requests_used as a proxy for messages in the current period.
 */
export async function fetchAdminUsersSummary(
  params: FetchAdminUsersSummaryInput = {}
): Promise<AdminUserSummary[]> {
  const {
    limit = 100,
    offset = 0,
    orderBy = "created_at",
    ascending = false,
  } = params;

  const service = createServiceRoleClient();

  // 1) Fetch a page of users (admin scope)
  const { data: users, error: usersError } = await service
    .from("users")
    .select("id,email,first_name,last_name,nickname,created_at,stripe_customer_id")
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  if (usersError) {
    console.error("[ADMIN_USERS_FETCH_ERROR]", { error: usersError });
    return [];
  }

  const userList = (users || []) as (UserRow & { stripe_customer_id: string | null })[];
  if (userList.length === 0) return [];

  const userIds = userList.map((u) => u.id);

  // 2) Fetch user_channels for these users
  const { data: userChannels, error: userChannelsError } = await service
    .from("user_channels")
    .select("id,user_id,channel_id")
    .in("user_id", userIds);

  if (userChannelsError) {
    console.error("[ADMIN_USER_CHANNELS_FETCH_ERROR]", { error: userChannelsError });
    return [];
  }

  const channels = (userChannels || []) as Pick<UserChannelRow, "id" | "user_id" | "channel_id">[];
  const channelsByUser = new Map<string, string[]>(); // user_id -> channel_id[]
  const userChannelIdsForUsage: string[] = [];

  for (const ch of channels) {
    if (!channelsByUser.has(ch.user_id)) channelsByUser.set(ch.user_id, []);
    channelsByUser.get(ch.user_id)!.push(ch.channel_id);
    userChannelIdsForUsage.push(ch.id); // for usage_records join (user_channel_id)
  }

  // 3) Fetch usage_records (requests_used proxy for messages), only for channel IDs in page
  const usageByUserChannel = new Map<string, number>(); // user_channel_id -> requests_used
  if (userChannelIdsForUsage.length > 0) {
    const { data: usageRecords, error: usageError } = await service
      .from("usage_records")
      .select("user_channel_id,requests_used")
      .in("user_channel_id", userChannelIdsForUsage);

    if (usageError) {
      console.error("[ADMIN_USAGE_RECORDS_FETCH_ERROR]", { error: usageError });
    } else {
      for (const u of (usageRecords || []) as Pick<UsageRecordRow, "user_channel_id" | "requests_used">[]) {
        usageByUserChannel.set(u.user_channel_id, u.requests_used ?? 0);
      }
    }
  }

  // 4) Fetch latest subscriptions for involved customers
  const customerIds = Array.from(
    new Set(userList.map((u) => u.stripe_customer_id).filter(Boolean))
  ) as string[];

  // Map customer -> latest subscription by created
  const latestSubByCustomer = new Map<string, StripeSubscription>();

  if (customerIds.length > 0) {
    const { data: subs, error: subsError } = await service
      .schema("stripe")
      .from("subscriptions")
      .select("id,status,customer,created,cancel_at_period_end,current_period_start,current_period_end,trial_end")
      .in("customer", customerIds)
      .order("created", { ascending: false });

    if (subsError) {
      console.error("[ADMIN_STRIPE_SUBSCRIPTIONS_FETCH_ERROR]", { error: subsError });
    } else {
      for (const s of (subs || []) as StripeSubscription[]) {
        const cust = (s.customer as unknown as string) || "";
        if (!cust) continue;
        // First encountered is latest due to order by created desc
        if (!latestSubByCustomer.has(cust)) {
          latestSubByCustomer.set(cust, s);
        }
      }
    }
  }

  // 5) Build result
  const results: AdminUserSummary[] = userList.map((u) => {
    const userChIds = channels.filter((c) => c.user_id === u.id).map((c) => c.id);
    const userChannelNames = channelsByUser.get(u.id) || [];
    const channels_count = userChannelNames.length;

    // Sum usage across this user's user_channel ids (requests_used proxy)
    let messages_count = 0;
    for (const ucId of userChIds) {
      messages_count += usageByUserChannel.get(ucId) ?? 0;
    }

    const sub = u.stripe_customer_id ? latestSubByCustomer.get(u.stripe_customer_id) : undefined;
    const stripe_status = (sub?.status as string | null) ?? null;
    const normalized_status = normalizeStatus(stripe_status);

    return {
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      nickname: u.nickname,
      created_at: u.created_at,
      channels: userChannelNames,
      channels_count,
      messages_count,
      subscription: {
        normalized_status,
        stripe_status,
        cancel_at_period_end: !!sub?.cancel_at_period_end,
        current_period_start: (sub?.current_period_start as number | null) ?? null,
        current_period_end: (sub?.current_period_end as number | null) ?? null,
        trial_end: (sub?.trial_end as number | null) ?? null,
      },
    };
  });

  return results;
}