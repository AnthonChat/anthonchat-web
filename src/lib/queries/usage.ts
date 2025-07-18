// lib/queries/usage.ts

import { createClient } from "@/utils/supabase/server";
import { getUserSubscription } from "./subscription"; // We still need this for limits

// The UsageData interface remains the same.
export interface UsageData {
	tokens_used: number;
	requests_used: number;
	tokens_limit?: number | null;
	requests_limit?: number | null;
	period_start?: string;
	period_end?: string;
}

export async function getUserUsage(userId: string): Promise<UsageData> {
	const supabase = await createClient();

	// Fetch subscription details and usage data in parallel for efficiency
	const [subscription, usageResponse] = await Promise.all([
		getUserSubscription(userId),
		supabase.rpc("get_user_tier_and_usage", { p_user_id: userId }),
	]);

	// Destructure the response from the RPC call
	const { data: rpcData, error: rpcError } = usageResponse;

	if (rpcError) {
		console.error(
			"Error calling get_user_tier_and_usage RPC:",
			rpcError.message
		);
		// If the RPC fails, we still return a valid default object to prevent UI crashes.
	}

	// We now use the nullish coalescing operator '??' to ensure that if the RPC
	// data or any nested property is null or undefined, we safely fall back to 0.
	// This completely prevents `undefined` from being passed to the component.

	const tokensUsed = rpcData?.[0]?.tokens_used ?? 0;
	const requestsUsed = rpcData?.[0]?.requests_used ?? 0;

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
		tokens_limit: rpcData?.[0]?.tier_tokens_limit ?? null,
		requests_limit: rpcData?.[0]?.tier_requests_limit ?? null,
		period_start: periodStart,
		period_end: periodEnd,
	};
}

/**
 * ! SCHEMA LIMITATION NOTE !
 *
 * The current database schema for `usage_records` only stores the usage
 * for the CURRENT billing period. It does not store historical data. The `created_at`
 * field is only set once when a user's channel is first used, and the record is
 * then continuously updated.
 *
 * To implement a true usage history (e.g., for the last 6 months), you would need to:
 * 1.  Create a new table, e.g., `usage_history`, with columns like
 *     `user_id`, `period_start`, `period_end`, `tokens_used`, `requests_used`.
 * 2.  Create a scheduled PostgreSQL function (using pg_cron) that runs at the end
 *     of each month. This function would aggregate the data from `usage_records`,
 *     insert it into `usage_history`, and then reset the `usage_records` for the new month.
 *
 */
