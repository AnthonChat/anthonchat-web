// lib/queries/usage.ts

import { createClient } from "@/lib/db/server";
import { getUserSubscription } from "./subscription";
import type { UsageData } from "@/lib/types/usage";

/**
 * Legacy function for compatibility with existing dashboard components.
 * Gets user usage data in the format expected by SubscriptionCard.
 */
export async function getUserUsage(userId: string): Promise<UsageData> {
  const supabase = await createClient();

  // Fetch subscription details and usage data in parallel for efficiency
  const [subscription, usageResponse] = await Promise.all([
    getUserSubscription(userId),
    supabase.rpc("get_user_usage_and_limits", { user_id: userId }),
  ]);

  // Destructure the response from the RPC call
  const { data: rpcData, error: rpcError } = usageResponse;

  if (rpcError) {
    console.error("Error calling get_user_usage_and_limits RPC:", {
      error: rpcError.message,
      userId,
    });
    // If the RPC fails, we still return a valid default object to prevent UI crashes.
  }

  // Fix: The RPC returns an array with one object, so we need to access the first element
  const usageData = rpcData?.[0];

  // We now use the nullish coalescing operator '??' to ensure that if the RPC
  // data or any nested property is null or undefined, we safely fall back to 0.
  // This completely prevents `undefined` from being passed to the component.

  const tokensUsed = usageData?.tokens_used ?? 0;
  const requestsUsed = usageData?.requests_used ?? 0;

  // Use the actual tier limits from the RPC response, with fallbacks
  const tokensLimit = usageData?.tier_tokens_limit ?? 10000; // Default to 10k tokens
  const requestsLimit = usageData?.tier_requests_limit ?? 100; // Default to 100 requests

  // The period start/end comes from the subscription object, not the usage RPC
  const periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : undefined;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : undefined;

  return {
    tokens_used: tokensUsed,
    requests_used: requestsUsed,
    tokens_limit: tokensLimit,
    requests_limit: requestsLimit,
    period_start: periodStart,
    period_end: periodEnd,
  };
}
