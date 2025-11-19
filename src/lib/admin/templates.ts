import { createServiceRoleClient } from "@/lib/db/server";
import { normalizeSubscriptionStatus, type NormalizedSubscriptionStatus } from "@/lib/admin/subscriptions";

type UserRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  created_at: string;
  signup_source: string | null;
  stripe_customer_id: string | null;
};

type UserChannelRow = {
  id: string;
  user_id: string;
  channel_id: string;
  link: string;
  verified_at: string | null;
  created_at: string;
};

type UsageRecordRow = {
  user_channel_id: string;
  requests_used: number;
  tokens_used: number;
};

type StripeSubscription = {
  id: string;
  status: string | null;
  customer: string;
  created: number;
  cancel_at_period_end: boolean | null;
  current_period_start: number | null;
  current_period_end: number | null;
  trial_end: number | null;
};

export interface TemplateRecipientFilter {
  search?: string;
  subscriptionStatuses?: NormalizedSubscriptionStatus[];
  channelIds?: string[];
  verifiedOnly?: boolean;
  userIds?: string[];
  limit?: number;
  offset?: number;
}

export interface TemplateRecipientChannel {
  userChannelId: string;
  channelId: string;
  link: string;
  createdAt: string;
  verifiedAt: string | null;
  usage: {
    requestsUsed: number;
    tokensUsed: number;
  };
  isVerified: boolean;
}

export interface TemplateRecipient {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  signupSource: string | null;
  createdAt: string;
  subscription: {
    normalizedStatus: NormalizedSubscriptionStatus;
    stripeStatus: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: number | null;
    currentPeriodEnd: number | null;
    trialEnd: number | null;
  };
  channels: TemplateRecipientChannel[];
  totalRequestsUsed: number;
  totalTokensUsed: number;
  verifiedChannelsCount: number;
}

export interface ChannelOption {
  id: string;
  label: string;
  isActive: boolean;
  linkMethod: string;
}

const escapeILike = (value: string) =>
  value.replace(/[%_]/g, "\\$&");

export async function getAdminChannelOptions(): Promise<ChannelOption[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("channels")
    .select("id,is_active,link_method");

  if (error) {
    console.error("[ADMIN_TEMPLATE_CHANNELS_FETCH_ERROR]", { error });
    return [];
  }

  return (data || []).map((channel) => ({
    id: channel.id,
    label: `${channel.id} (${channel.link_method})`,
    isActive: !!channel.is_active,
    linkMethod: channel.link_method,
  }));
}

export async function fetchTemplateRecipients(
  filters: TemplateRecipientFilter = {}
): Promise<{ recipients: TemplateRecipient[]; total: number }> {
  const service = createServiceRoleClient();
  const requestedLimit = Math.min(500, Math.max(10, filters.limit ?? 200));
  const offset = Math.max(0, filters.offset ?? 0);
  const search = filters.search?.trim();
  // We fetch more than needed to handle post-filtering, but we need a better strategy for total count
  // For now, we'll fetch a larger batch to support basic pagination
  const queryLimit = 1000;

  let query = service
    .from("users")
    .select("id,email,first_name,last_name,nickname,created_at,signup_source,stripe_customer_id", { count: 'exact' })
    .order("created_at", { ascending: false });

  if (search) {
    const token = `%${escapeILike(search)}%`;
    query.or(
      `email.ilike.${token},first_name.ilike.${token},last_name.ilike.${token},nickname.ilike.${token}`
    );
  }

  if (filters.userIds?.length) {
    query = query.in("id", filters.userIds);
  }

  // Apply range for initial fetching
  // Note: This pagination is imperfect because we filter in memory afterwards
  // A true database-level filtering would require joining tables which Supabase JS client supports but is complex here
  const { data: users, error: userError, count } = await query.range(0, queryLimit);

  if (userError) {
    console.error("[ADMIN_TEMPLATE_USERS_FETCH_ERROR]", { error: userError });
    return { recipients: [], total: 0 };
  }

  const userList = (users || []) as UserRecord[];
  if (userList.length === 0) return { recipients: [], total: 0 };
  const userIds = userList.map((user) => user.id);

  const { data: userChannels } = await service
    .from("user_channels")
    .select("id,user_id,channel_id,link,verified_at,created_at")
    .in("user_id", userIds);

  const channelRows = (userChannels || []) as UserChannelRow[];
  const userChannelIds = channelRows.map((row) => row.id);

  const { data: usageRecords } =
    userChannelIds.length > 0
      ? await service
          .from("usage_records")
          .select("user_channel_id,requests_used,tokens_used")
          .in("user_channel_id", userChannelIds)
      : { data: [] };

  const usageMap = new Map<string, UsageRecordRow>();
  for (const record of (usageRecords || []) as UsageRecordRow[]) {
    usageMap.set(record.user_channel_id, record);
  }

  const customerIds = Array.from(
    new Set(userList.map((user) => user.stripe_customer_id).filter(Boolean))
  ) as string[];

  const latestSubs = new Map<string, StripeSubscription>();
  if (customerIds.length > 0) {
    const { data: subs, error: subsError } = await service
      .schema("stripe")
      .from("subscriptions")
      .select("id,status,customer,created,cancel_at_period_end,current_period_start,current_period_end,trial_end")
      .in("customer", customerIds)
      .order("created", { ascending: false });

    if (subsError) {
      console.error("[ADMIN_TEMPLATE_SUBSCRIPTIONS_FETCH_ERROR]", { error: subsError });
    } else {
      for (const subscription of (subs || []) as StripeSubscription[]) {
        const customer = String(subscription.customer);
        if (!latestSubs.has(customer)) {
          latestSubs.set(customer, subscription);
        }
      }
    }
  }

  const channelsByUser = channelRows.reduce<Record<string, UserChannelRow[]>>((acc, row) => {
    acc[row.user_id] = acc[row.user_id] || [];
    acc[row.user_id].push(row);
    return acc;
  }, {});

  const recipients = userList.map((user) => {
    const channels = (channelsByUser[user.id] || []).map((row) => {
      const usage = usageMap.get(row.id);
      const requestsUsed = usage?.requests_used ?? 0;
      const tokensUsed = usage?.tokens_used ?? 0;
      return {
        userChannelId: row.id,
        channelId: row.channel_id,
        link: row.link,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
        isVerified: !!row.verified_at,
        usage: {
          requestsUsed,
          tokensUsed,
        },
      };
    });

    let totalRequestsUsed = 0;
    let totalTokensUsed = 0;
    let verifiedChannelsCount = 0;
    for (const channel of channels) {
      totalRequestsUsed += channel.usage.requestsUsed;
      totalTokensUsed += channel.usage.tokensUsed;
      if (channel.isVerified) {
        verifiedChannelsCount += 1;
      }
    }

    const subscription = user.stripe_customer_id
      ? latestSubs.get(user.stripe_customer_id) ?? null
      : null;
    const stripeStatus = subscription?.status ?? null;
    const normalizedStatus = normalizeSubscriptionStatus(stripeStatus);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      nickname: user.nickname,
      signupSource: user.signup_source,
      createdAt: user.created_at,
      subscription: {
        normalizedStatus,
        stripeStatus,
        cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
        currentPeriodStart: subscription?.current_period_start ?? null,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        trialEnd: subscription?.trial_end ?? null,
      },
      channels,
      totalRequestsUsed,
      totalTokensUsed,
      verifiedChannelsCount,
    };
  });

  const filteredRecipients = recipients.filter((recipient) => {
    if (filters.subscriptionStatuses?.length) {
      if (!filters.subscriptionStatuses.includes(recipient.subscription.normalizedStatus)) {
        return false;
      }
    }
    if (filters.verifiedOnly && recipient.verifiedChannelsCount === 0) {
      return false;
    }
    if (filters.channelIds?.length) {
      if (!recipient.channels.some((ch) => filters.channelIds!.includes(ch.channelId))) {
        return false;
      }
    }
    return true;
  });

  // Since we filter in memory, the total count from DB might be inaccurate if filters are applied
  // For this implementation, we'll use the filtered length as total if filters are applied,
  // otherwise we use the DB count. This is a compromise.
  const effectiveTotal = (filters.subscriptionStatuses?.length || filters.verifiedOnly || filters.channelIds?.length)
    ? filteredRecipients.length
    : (count ?? filteredRecipients.length);

  return {
    recipients: filteredRecipients.slice(offset, offset + requestedLimit),
    total: effectiveTotal
  };
}

export async function fetchTemplateRecipientsByIds(
  userIds: string[]
): Promise<TemplateRecipient[]> {
  if (userIds.length === 0) return [];
  const result = await fetchTemplateRecipients({ userIds, limit: userIds.length, offset: 0 });
  return result.recipients;
}
