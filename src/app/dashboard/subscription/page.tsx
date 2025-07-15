import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/queries/subscription'
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement'
import { StripeSuccessHandler } from '@/components/dashboard/StripeSuccessHandler'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      {/* Enhanced Header with Glass Effect */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-fade-in">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="hover-lift group">
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-primary rounded-xl shadow-glow animate-glow">
                  <CreditCard className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Subscription Management
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    Manage your subscription and billing settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
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
    </div>
  );
}