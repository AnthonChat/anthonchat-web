"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
	Clock,
	Zap,
	Activity,
	TrendingUp,
	Wifi,
	WifiOff,
	RefreshCw,
	AlertTriangle,
} from "lucide-react";

// --- Step 1: Import the new data types and utility functions ---
import { UserSubscription } from "@/lib/queries/subscription";
import type { UsageData } from "@/lib/types/usage";
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
import { ErrorBoundary } from "@/components/ui/error-boundary";

// --- Step 2: Update the component's props interface ---
interface SubscriptionCardProps {
	subscription: UserSubscription | null;
	usage: UsageData;
	userId: string;
}

// Memoized usage display component for better performance
const UsageDisplay = React.memo(({ 
	title, 
	icon: Icon, 
	used, 
	limit, 
	percent, 
	getProgressColor,
	isConnected 
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	used: number;
	limit: number;
	percent: number;
	getProgressColor: (percent: number) => string;
	isConnected: boolean;
}) => (
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
					<Icon className="h-5 w-5 text-primary-foreground" />
				</div>
				<span className="font-bold text-foreground text-lg">
					{title}
				</span>
			</div>
			<div className="text-right">
				<div className="font-bold text-2xl text-foreground transition-all duration-300">
					<AnimatedNumber value={used} />
				</div>
				<div className="text-sm font-medium text-muted-foreground">
					of {limit.toLocaleString("en-US")}
				</div>
			</div>
		</div>
		<div className="relative">
			<div className="h-3 bg-border rounded-full overflow-hidden">
				<AnimatedProgress
					value={percent}
					className={getProgressColor(percent)}
				/>
			</div>
			<div className="flex justify-between items-center mt-2">
				<span className="text-xs text-muted-foreground">
					{percent.toFixed(1)}% used
				</span>
				{percent >= 90 && (
					<span className="text-xs text-destructive font-medium flex items-center gap-1">
						<AlertTriangle className="h-3 w-3" />
						Near limit
					</span>
				)}
			</div>
		</div>
	</div>
));

UsageDisplay.displayName = "UsageDisplay";

// Main component with error boundary and optimizations
function SubscriptionCardContent({
	subscription,
	usage,
	userId,
}: SubscriptionCardProps) {
	const router = useRouter();

	// The real-time hook is initialized with the server-fetched usage data.
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

	const getStatusBadge = React.useCallback(() => {
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
	}, [subscription?.status]);

	// --- Step 3: Handle numeric timestamps ---
	const trialTimeDisplay = React.useMemo(() => {
		return formatTrialTimeRemaining(
			subscription?.current_period_start
				? new Date(subscription.current_period_start * 1000).toISOString()
				: undefined,
			subscription?.current_period_end
				? new Date(subscription.current_period_end * 1000).toISOString()
				: undefined
		);
	}, [subscription?.current_period_start, subscription?.current_period_end]);

	// Usage percentages are calculated using the real-time data from our hook.
	const tokensUsagePercent = React.useMemo(() => 
		realtimeUsage.tokens_limit
			? (realtimeUsage.tokens_used / realtimeUsage.tokens_limit) * 100
			: 0,
		[realtimeUsage.tokens_used, realtimeUsage.tokens_limit]
	);

	const requestsUsagePercent = React.useMemo(() =>
		realtimeUsage.requests_limit
			? (realtimeUsage.requests_used / realtimeUsage.requests_limit) * 100
			: 0,
		[realtimeUsage.requests_used, realtimeUsage.requests_limit]
	);

	const getProgressColor = React.useCallback((percent: number) => {
		if (percent >= 90) return "bg-destructive";
		if (percent >= 75) return "bg-yellow-500";
		return "bg-primary";
	}, []);

	const handleUpgradeClick = React.useCallback(() => {
		router.push("/dashboard/subscription");
	}, [router]);

	// Show error state if realtime connection fails
	if (realtimeError && !isConnected) {
		return (
			<Card className="border-destructive/50">
				<CardContent className="p-6">
					<div className="flex items-center gap-3 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						<div>
							<p className="font-medium">Connection Error</p>
							<p className="text-sm text-muted-foreground">
								Unable to load real-time data. {realtimeError}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={reconnect}
							className="ml-auto"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

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

				{realtimeUsage.tokens_limit != null && (
					<UsageDisplay
						title="Tokens Used"
						icon={Zap}
						used={realtimeUsage.tokens_used}
						limit={realtimeUsage.tokens_limit}
						percent={tokensUsagePercent}
						getProgressColor={getProgressColor}
						isConnected={isConnected}
					/>
				)}

				{realtimeUsage.requests_limit != null && (
					<UsageDisplay
						title="Requests Used"
						icon={Activity}
						used={realtimeUsage.requests_used}
						limit={realtimeUsage.requests_limit}
						percent={requestsUsagePercent}
						getProgressColor={getProgressColor}
						isConnected={isConnected}
					/>
				)}

				{(isTrialing || !subscription) && (
					<div className="pt-6 border-t border-border/50">
						<Button
							className="w-full h-12 text-base font-semibold"
							onClick={handleUpgradeClick}>
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
							onClick={handleUpgradeClick}>
							<TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110" />
							Manage Subscription
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Export the component wrapped with error boundary
export const SubscriptionCard = React.memo(function SubscriptionCard(props: SubscriptionCardProps) {
	return (
		<ErrorBoundary
			fallback={
				<Card className="border-destructive/50">
					<CardContent className="p-6">
						<div className="flex items-center gap-3 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							<div>
								<p className="font-medium">Failed to load subscription data</p>
								<p className="text-sm text-muted-foreground">
									Please refresh the page or contact support if the problem persists.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			}
		>
			<SubscriptionCardContent {...props} />
		</ErrorBoundary>
	);
});
