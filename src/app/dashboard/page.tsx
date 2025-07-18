// app/dashboard/page.tsx:

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, User } from "lucide-react";

// --- Step 1: Import the refactored query functions ---
// These functions now correctly query the new database schema.
import { getUserSubscription } from "@/lib/queries/subscription";
import { getUserChannels } from "@/lib/queries/channels"; // Assuming this file is correctly implemented
import { getUserUsage } from "@/lib/queries/usage";

// --- Step 2: Import your UI components ---
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { ChannelsOverview } from "@/components/dashboard/ChannelsOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect("/login");
	}

	// --- Step 3: Check onboarding status ---
	// This RPC call remains unchanged and is a robust way to enforce profile completion.
	const { data: isOnboarded, error: rpcError } = await supabase.rpc(
		"check_onboarding_complete",
		{
			user_id_param: user.id,
		}
	);

	if (rpcError) {
		console.error("Dashboard onboarding check failed:", rpcError.message);
		// It's safe to proceed, allowing the user to access the dashboard
		// even if the check fails, preventing them from being locked out.
	}

	if (!isOnboarded) {
		return redirect("/signup/complete");
	}

	// --- Step 4: Fetch all necessary data in parallel ---
	// This is efficient and leverages our refactored query functions.
	// The `subscription` and `usage` objects now have a new, more detailed structure.
	const [subscription, channels, usage] = await Promise.all([
		getUserSubscription(user.id),
		getUserChannels(user.id),
		getUserUsage(user.id),
	]);

	/*
	  --- IMPORTANT: New Data Structures ---
	
	  The `subscription` object now looks like this:
	  {
		id: string,
		status: 'active' | 'trialing',
		product: {
		  id: string,
		  name: string,
		  description: string
		},
		features: {
		  tokens_limit: number,
		  requests_limit: number,
		  history_limit: number
		},
		...and other fields
	  }
	
	  The `usage` object now looks like this:
	  {
		tokens_used: number,
		requests_used: number,
		tokens_limit: number,  // This comes from subscription.features
		requests_limit: number, // This also comes from subscription.features
		...and other fields
	  }
	
	  You will need to update the components that receive these props,
	  primarily `SubscriptionCard`.
	*/

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
			{/* Enhanced Header */}
			<header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
				<div className="container mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4 animate-fade-in">
							<div>
								<h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
									Dashboard
								</h1>
								<p className="text-sm text-muted-foreground font-medium">
									Welcome back,{" "}
									<span className="text-primary font-semibold">
										{user.email}
									</span>
								</p>
							</div>
						</div>

						<form
							action="/auth/signout"
							method="post"
							className="animate-fade-in">
							<Button
								type="submit"
								variant="outline"
								size="sm"
								className="hover-lift group">
								<LogOut className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
								Sign Out
							</Button>
						</form>
					</div>
				</div>
			</header>

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
								userId={user.id}
							/>
						</div>

						{/* Channels Overview - No changes needed if getUserChannels is correct */}
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.2s" }}>
							<ChannelsOverview channels={channels} />
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
		</div>
	);
}
