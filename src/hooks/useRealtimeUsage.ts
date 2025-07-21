"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/browser";
import type { UsageData } from "@/lib/types/usage";
import { RealtimeChannel } from "@supabase/supabase-js";
import { hookLogger } from "@/lib/utils/loggers";

interface UseRealtimeUsageOptions {
	userId: string;
	initialUsage: UsageData;
	enabled?: boolean;
}

interface UseRealtimeUsageReturn {
	usage: UsageData;
	isConnected: boolean;
	error: string | null;
	reconnect: () => void;
	isInitialLoading: boolean;
}

export function useRealtimeUsage({
	userId,
	initialUsage,
	enabled = true,
}: UseRealtimeUsageOptions): UseRealtimeUsageReturn {
	const [usage, setUsage] = useState<UsageData>(initialUsage);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	const supabase = createClient();

	const fetchLatestUsage = useCallback(async () => {
		try {
			// Add minimum loading time to prevent flashing
			const startTime = Date.now();
			const minLoadingTime = 800; // 800ms minimum loading time

			const { data, error } = await supabase.rpc("get_user_usage_and_limits", {
				user_id: userId,  // Changed from p_user_id to user_id
			});

			if (error) {
				hookLogger.error('USAGE_FETCH_ERROR', 'REALTIME_USAGE', { error: error.message, userId });
				setError("Failed to fetch latest usage data");
				
				// Ensure minimum loading time
				const elapsed = Date.now() - startTime;
				const remainingTime = Math.max(0, minLoadingTime - elapsed);
				setTimeout(() => setIsInitialLoading(false), remainingTime);
				return;
			}

			if (data && data[0]) {
				// Fix: The RPC returns an array with one object, so we need to access the first element
				const usageData = data[0];
				
				setUsage((prev) => ({
					...prev,
					tokens_used: usageData.tokens_used,
					requests_used: usageData.requests_used,
					tokens_limit: usageData.tier_tokens_limit ?? 10000,  // Use tier_tokens_limit
					requests_limit: usageData.tier_requests_limit ?? 100,  // Use tier_requests_limit
				}));
			}
			setError(null);
			
			// Ensure minimum loading time
			const elapsed = Date.now() - startTime;
			const remainingTime = Math.max(0, minLoadingTime - elapsed);
			setTimeout(() => setIsInitialLoading(false), remainingTime);
		} catch (err) {
			hookLogger.error('FETCH_LATEST_USAGE_ERROR', 'REALTIME_USAGE', { error: err instanceof Error ? err.message : String(err), userId });
			setError("Failed to fetch usage data");
			setIsInitialLoading(false);
		}
	}, [userId, supabase]);

	useEffect(() => {
		if (!enabled || !userId) {
			return;
		}

		fetchLatestUsage(); // Fetch initial data

		let channel: RealtimeChannel;

		const setupSubscription = async () => {
			const { data: channelData, error: channelError } = await supabase
				.from("user_channels")
				.select("id")
				.eq("user_id", userId)
				.limit(1)
				.single();

			if (channelError || !channelData) {
				hookLogger.error('USER_CHANNEL_REALTIME_ERROR', 'REALTIME_USAGE', { error: channelError?.message, userId });
				setError("Could not set up real-time connection.");
				return;
			}

			const userChannelId = channelData.id;

			channel = supabase
				.channel(`usage_records_for_${userChannelId}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "usage_records",
						filter: `user_channel_id=eq.${userChannelId}`,
					},
					(payload) => {
						hookLogger.info('REALTIME_USAGE_UPDATE', 'REALTIME_USAGE', { payload, userId });
						if (payload.new && 'tokens_used' in payload.new) {
							const newRecord = payload.new as UsageData;
							setUsage((prev) => ({
								...prev,
								tokens_used: newRecord.tokens_used,
								requests_used: newRecord.requests_used,
							}));
						}
					}
				)
				.subscribe((status) => {
					if (status === "SUBSCRIBED") {
						setIsConnected(true);
						setError(null);
					} else {
						setIsConnected(false);
					}
				});
		};

		setupSubscription();

		return () => {
			if (channel) {
				supabase.removeChannel(channel);
			}
		};
	}, [enabled, userId, supabase, fetchLatestUsage]);

	useEffect(() => {
		setUsage(initialUsage);
	}, [initialUsage]);

	// No reconnect function needed, Supabase handles it.
	return {
		usage,
		isConnected,
		error,
		reconnect: () => { hookLogger.info('USAGE_RECONNECT_ATTEMPT', 'REALTIME_USAGE', { userId }); fetchLatestUsage(); },
		isInitialLoading,
	};
}
