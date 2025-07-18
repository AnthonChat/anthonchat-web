"use client";

import { useRouter } from "next/navigation";
import {
	Clock,
	Zap,
	Activity,
	TrendingUp,
	Wifi,
	WifiOff,
	RefreshCw,
} from "lucide-react";

// --- Step 1: Import the new data types and utility functions ---
import { UserSubscription } from "@/lib/queries/subscription"; // The new, accurate type for the subscription object
import { UsageData } from "@/lib/queries/usage";
import { useRealtimeUsage } from "@/hooks/useRealtimeUsage";
import { formatTrialTimeRemaining } from "@/lib/utils/time-formatting";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedProgress } from "@/components/ui/animated-progress";

// --- Step 2: Update the component's props interface ---
// The `subscription` prop now uses the precise `UserSubscription` type.
// The `userId` is still required for the real-time usage hook.
interface SubscriptionCardProps {
	subscription: UserSubscription;
	usage: UsageData;
	userId: string;
}

export function SubscriptionCard({
	subscription,
	usage,
	userId,
}: SubscriptionCardProps) {
	const router = useRouter();

	// The real-time hook is initialized with the server-fetched usage data.
	// This hook is responsible for listening to Supabase real-time updates for the `usage_records` table.
	const {
		usage: realtimeUsage,
		isConnected,
		error: realtimeError,
		reconnect,
	} = useRealtimeUsage({
		userId,
		initialUsage: usage,
		enabled: true,
	});

	const isTrialing = subscription?.status === "trialing";
	const isActive = subscription?.status === "active";

	const getStatusBadge = () => {
		switch (subscription?.status) {
			case "trialing":
				return <Badge variant="warning">Trial</Badge>;
			case "active":
				return <Badge variant="success">Active</Badge>;
			case "past_due":
				return <Badge variant="destructive">Past Due</Badge>;
			case "canceled":
				return <Badge variant="secondary">Canceled</Badge>;
			default:
				return <Badge variant="outline">No Subscription</Badge>;
		}
	};

	// --- Step 3: Handle numeric timestamps ---
	// Stripe provides timestamps as seconds since epoch. We convert them to ISO strings
	// for the formatting utility function.
	const trialTimeDisplay = formatTrialTimeRemaining(
		subscription?.current_period_start
			? new Date(subscription.current_period_start * 1000).toISOString()
			: undefined,
		subscription?.current_period_end
			? new Date(subscription.current_period_end * 1000).toISOString()
			: undefined
	);

	// Usage percentages are calculated using the real-time data from our hook.
	// The limits are correctly sourced from the initial `usage` prop.
	const tokensUsagePercent = realtimeUsage.tokens_limit
		? (realtimeUsage.tokens_used / realtimeUsage.tokens_limit) * 100
		: 0;

	const requestsUsagePercent = realtimeUsage.requests_limit
		? (realtimeUsage.requests_used / realtimeUsage.requests_limit) * 100
		: 0;

	const getProgressColor = (percent: number) => {
		if (percent >= 90) return "bg-destructive";
		if (percent >= 75) return "bg-yellow-500";
		return "bg-primary";
	};

	return (
		<Card className="hover-lift overflow-hidden relative border-2">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />

			<CardHeader className="relative">
				<div className="flex items-center justify-between">
					<CardTitle className="flex flex-col items-start gap-2">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary rounded-lg shadow-lg">
								<Zap className="h-6 w-6 text-primary-foreground" />
							</div>
							<span className="text-xl font-bold text-foreground">
								Subscription Status
							</span>
						</div>
					</CardTitle>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							{isConnected ? (
								<div className="flex items-center gap-1 text-green-600">
									<Wifi className="h-4 w-4" />
									<span className="text-xs font-medium">
										Live
									</span>
								</div>
							) : (
								<div className="flex items-center gap-1 text-gray-500">
									<WifiOff className="h-4 w-4" />
									<span className="text-xs font-medium">
										Offline
									</span>
									{realtimeError && (
										<Button
											variant="ghost"
											size="sm"
											onClick={reconnect}
											className="h-6 w-6 p-0 ml-1"
											title="Reconnect">
											<RefreshCw className="h-3 w-3" />
										</Button>
									)}
								</div>
							)}
						</div>
						<div className="animate-bounce-subtle">
							{getStatusBadge()}
						</div>
					</div>
				</div>
				{/* --- Step 4: Update the UI to use the new data structure --- */}
				{/* We now display the product name instead of the old tier name. */}
				<CardDescription className="text-base font-semibold mt-2 text-muted-foreground">
					{subscription?.product?.name || "No active subscription"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 relative">
				{isTrialing && trialTimeDisplay && (
					<div className="flex items-center gap-3 p-4 bg-yellow-100 border-2 border-yellow-500 rounded-xl text-yellow-900 shadow-warning animate-scale-in">
						<div className="p-2 bg-yellow-500 rounded-lg">
							<Clock className="h-4 w-4 text-white" />
						</div>
						<div>
							<p className="font-semibold text-yellow-900">
								Trial Period Active
							</p>
							<p className="text-sm text-yellow-800">
								{trialTimeDisplay}
							</p>
						</div>
					</div>
				)}

				{/* The rest of the component logic for displaying usage remains the same, */}
				{/* as `realtimeUsage` provides a consistent interface. */}
				{realtimeUsage.tokens_limit != null && (
					<div className="space-y-4 p-5 bg-card border-2 border-border rounded-xl relative">
						{isConnected && (
							<div
								className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"
								title="Real-time updates active"
							/>
						)}
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary rounded-lg">
									<Zap className="h-5 w-5 text-primary-foreground" />
								</div>
								<span className="font-bold text-foreground text-lg">
									Tokens Used
								</span>
							</div>
							<div className="text-right">
								<div className="font-bold text-2xl text-foreground transition-all duration-300">
									<AnimatedNumber
										value={realtimeUsage.tokens_used}
									/>
								</div>
								<div className="text-sm font-medium text-muted-foreground">
									of{" "}
									{realtimeUsage.tokens_limit.toLocaleString(
										"en-US"
									)}
								</div>
							</div>
						</div>
						<div className="relative">
							<div className="h-3 bg-border rounded-full overflow-hidden">
								<AnimatedProgress
									value={tokensUsagePercent}
									className={getProgressColor(
										tokensUsagePercent
									)}
								/>
							</div>
							{/* ... (percentage display logic) ... */}
						</div>
					</div>
				)}

				{realtimeUsage.requests_limit != null && (
					<div className="space-y-4 p-5 bg-card border-2 border-border rounded-xl relative">
						{/* ... (similar structure for requests used) ... */}
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-secondary rounded-lg">
									<Activity className="h-5 w-5 text-secondary-foreground" />
								</div>
								<span className="font-bold text-foreground text-lg">
									Requests Used
								</span>
							</div>
							<div className="text-right">
								<div className="font-bold text-2xl text-foreground transition-all duration-300">
									<AnimatedNumber
										value={realtimeUsage.requests_used}
									/>
								</div>
								<div className="text-sm font-medium text-muted-foreground">
									of{" "}
									{realtimeUsage.requests_limit.toLocaleString(
										"en-US"
									)}
								</div>
							</div>
						</div>
						<div className="relative">
							<div className="h-3 bg-border rounded-full overflow-hidden">
								<AnimatedProgress
									value={requestsUsagePercent}
									className={getProgressColor(
										requestsUsagePercent
									)}
								/>
							</div>
							{/* ... (percentage display logic) ... */}
						</div>
					</div>
				)}

				{/* Button logic for upgrading or managing subscription remains the same */}
				{(isTrialing || !subscription) && (
					<div className="pt-6 border-t border-border/50">
						<Button
							className="w-full h-12 text-base font-semibold"
							onClick={() =>
								router.push("/dashboard/subscription")
							}>
							<Zap className="h-5 w-5 mr-2 group-hover:animate-bounce" />
							Upgrade Subscription
						</Button>
					</div>
				)}

				{isActive && (
					<div className="pt-6 border-t border-border/50">
						<Button
							variant="outline"
							className="w-full h-12 text-base font-semibold bg-card border-2 border-primary hover:bg-primary/10"
							onClick={() =>
								router.push("/dashboard/subscription")
							}>
							<TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110" />
							Manage Subscription
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
