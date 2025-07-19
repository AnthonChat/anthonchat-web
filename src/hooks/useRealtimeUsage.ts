"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/browser";
import type { UsageData } from "@/lib/types/usage";
import { RealtimeChannel } from "@supabase/supabase-js";

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
}

export function useRealtimeUsage({
	userId,
	initialUsage,
	enabled = true,
}: UseRealtimeUsageOptions): UseRealtimeUsageReturn {
	const [usage, setUsage] = useState<UsageData>(initialUsage);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const supabase = createClient();

	const fetchLatestUsage = useCallback(async () => {
		try {
			const { data, error } = await supabase.rpc("get_user_tier_and_usage", {
				user_id: userId,  // Changed from p_user_id to user_id
			});

			if (error) {
				console.error("Error fetching usage:", error);
				setError("Failed to fetch latest usage data");
				return;
			}

			if (data && data.length > 0) {
				const latestUsage = data[0];
				setUsage((prev) => ({
					...prev,
					tokens_used: latestUsage.tokens_used,
					requests_used: latestUsage.requests_used,
					tokens_limit: latestUsage.tier_tokens_limit,
					requests_limit: latestUsage.tier_requests_limit,
				}));
			}
			setError(null);
		} catch (err) {
			console.error("Error in fetchLatestUsage:", err);
			setError("Failed to fetch usage data");
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
				console.error("Error finding user channel for real-time:", channelError?.message);
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
						console.log("Realtime usage update:", payload);
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
		reconnect: () => { console.log("Attempting to reconnect..."); fetchLatestUsage(); },
	};
}
