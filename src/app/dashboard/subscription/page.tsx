import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/queries/subscription'
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement'
import { StripeSuccessHandler } from '@/components/dashboard/StripeSuccessHandler'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CreditCard } from 'lucide-react'

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch subscription data
  const subscription = await getUserSubscription(user.id)

  return (
    <DashboardLayout variant="enhanced">
      <DashboardHeader
        title="Subscription Management"
        description="Manage your subscription and billing settings"
        backHref="/dashboard"
        variant="enhanced"
      />
      
      {/* Enhanced Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-8 bg-primary/5 rounded-2xl shadow-xl animate-slide-up border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">Billing & Subscription 💳</h2>
              <p className="text-muted-foreground text-lg font-medium">Manage your plan, billing details, and payment methods.</p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Success/Error Handler */}
        <StripeSuccessHandler />
        
        {/* Subscription Management Component */}
        <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
          <SubscriptionManagement subscription={subscription} userId={user.id} />
        </div>
      </main>
    </DashboardLayout>
  );
}