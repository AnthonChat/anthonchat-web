// app/dashboard/page.tsx:

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { getUserTierAndUsage, getUserSubscription } from "@/lib/queries";
import { SubscriptionCard } from "@/components/features/subscription/SubscriptionCard";
import { ChannelsOverview } from "@/components/features/channels/ChannelsOverview";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/layouts/ThemeToggle";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { DashboardLayout } from "@/components/shared/layouts/DashboardLayout";
import { uiLogger } from "@/lib/logging/loggers";

export default async function DashboardPage() {
	const supabase = await createClient();

	const {
		data: claims,
	} = await supabase.auth.getClaims();

	if (!claims) {
		return redirect("/login");
	}

	const userId = claims.claims.sub;
	const userEmail = claims.claims.email;

	// This RPC call remains unchanged and is a robust way to enforce profile completion.
	const { data: isOnboarded, error: rpcError } = await supabase.rpc(
		"check_onboarding_complete",
		{
			user_id_param: userId,
		}
	);

	if (rpcError) {
		uiLogger.error("DASHBOARD_ONBOARDING_CHECK_FAILED", new Error(rpcError.message));
		// It's safe to proceed, allowing the user to access the dashboard
		// even if the check fails, preventing them from being locked out.
	}

	if (!isOnboarded) {
		return redirect("/signup/complete");
	}

	// --- Step 4: Fetch all necessary data in parallel ---
	// This is efficient and leverages our refactored query functions.
	// The `subscription` and `usage` objects now have a new, more detailed structure.
	const [subscription, tierAndUsage] = await Promise.all([
		getUserSubscription(userId),
		getUserTierAndUsage(userId),
	]);

	// Convert UserTierAndUsageResult to UsageData for compatibility
	const usage = tierAndUsage ? {
		tokens_used: tierAndUsage.tokens_used,
		requests_used: tierAndUsage.requests_used,
		tokens_limit: tierAndUsage.tokens_limit || 0,
		requests_limit: tierAndUsage.requests_limit || 0,
	} : {
		tokens_used: 0,
		requests_used: 0,
		tokens_limit: 0,
		requests_limit: 0,
	};

	return (
		<DashboardLayout variant="enhanced">
			<DashboardHeader
				title="Dashboard"
				description={`Welcome back, ${userEmail}`}
				variant="enhanced"
				actions={
					<div className="flex items-center gap-4">
						<ThemeToggle />
						<form action="/auth/signout" method="post">
							<Button
								type="submit"
								variant="outline"
								size="sm"
								className="hover-lift group"
							>
								<LogOut className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
								Sign Out
							</Button>
						</form>
					</div>
				}
			/>

			{/* Enhanced Main Content */}
			<main className="container mx-auto px-6 py-8">
				{/* Welcome Banner */}
				<div className="mb-8 p-8 bg-primary/5 rounded-2xl shadow-xl animate-slide-up border-2 border-primary/20">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-2xl font-bold mb-3 text-foreground">
								Good to see you again! 👋
							</h2>
							<p className="text-muted-foreground text-lg font-medium">
								Here&apos;s what&apos;s happening with your AnthonChat
								account today.
							</p>
						</div>
						<div className="hidden md:block">
							<div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
								<User className="h-10 w-10 text-primary-foreground" />
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column - Main Stats */}
					<div className="lg:col-span-2 space-y-8">
						{/* --- Step 5: Pass the new data structures as props --- */}
						{/* The props passed here are now correct. The next step is to update the SubscriptionCard component itself. */}
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.1s" }}>
							<SubscriptionCard
								subscription={subscription}
								usage={usage}
								userId={userId}
							/>
						</div>

						{/* Channels Overview */}
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.2s" }}>
							<ChannelsOverview userId={userId} />
						</div>
					</div>

					{/* Right Column - Quick Actions */}
					<div className="space-y-8">
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.1s" }}>
							<QuickActions />
						</div>
					</div>
				</div>
			</main>
		</DashboardLayout>
	);
}
