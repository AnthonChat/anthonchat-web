import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/queries/subscription'
import { getUserChannels } from '@/lib/queries/channels'
import { getUserUsage } from '@/lib/queries/usage'
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard'
import { ChannelsOverview } from '@/components/dashboard/ChannelsOverview'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Check onboarding status
  const { data: userProfile } = await supabase
    .from("users")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!userProfile?.onboarding_complete) {
    return redirect("/signup/complete");
  }

  // Fetch dashboard data
  const [subscription, channels, usage] = await Promise.all([
    getUserSubscription(user.id),
    getUserChannels(user.id),
    getUserUsage(user.id)
  ])
  
  // Check for usage warnings
  // const warnings = checkUsageLimits(user.id)

  return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
			{/* Enhanced Header with Glass Effect */}
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
						{/* Subscription Status */}
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.1s" }}>
							<SubscriptionCard
								subscription={subscription}
								usage={usage}
								userId={user.id}
							/>
						</div>

						{/* Channels Overview */}
						<div
							className="animate-fade-in"
							style={{ animationDelay: "0.2s" }}>
							<ChannelsOverview userChannels={channels} />
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
