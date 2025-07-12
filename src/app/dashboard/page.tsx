import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/queries/subscription'
import { getUserChannels } from '@/lib/queries/channels'
import { getUserUsage, checkUsageLimits } from '@/lib/queries/usage'
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard'
import { ChannelsOverview } from '@/components/dashboard/ChannelsOverview'
import { UsageStats } from '@/components/dashboard/UsageStats'
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
  const warnings = checkUsageLimits(user.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, {user.email}
                </p>
              </div>
            </div>
            
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Status */}
            <SubscriptionCard subscription={subscription} usage={usage} />
            
            {/* Usage Analytics */}
            <UsageStats usage={usage} warnings={await warnings} />
            
            {/* Channels Overview */}
            <ChannelsOverview userChannels={channels} />
          </div>
          
          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
}
