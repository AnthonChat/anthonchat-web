import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubscriptionPageClient } from '@/components/features/subscription/SubscriptionPageClient'
import { DashboardHeader } from '@/components/features/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { CreditCard } from 'lucide-react'

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  if (!claims) {
    return redirect("/login");
  }

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

        {/* Client-side subscription management with real-time updates */}
        <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
          <SubscriptionPageClient userId={claims.claims.sub} />
        </div>
      </main>
    </DashboardLayout>
  );
}