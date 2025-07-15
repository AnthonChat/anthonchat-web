import { createClient } from '@/utils/supabase/server'
import { PricingPlans } from '@/components/pricing/PricingPlans'

export default async function PricingPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user's current tier if authenticated
  let currentTierSlug: string | undefined
  
  if (user) {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        tiers (
          slug
        )
      `)
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      console.log('Subscription query error:', error)
    }
    
    console.log('Subscription data:', subscription)
    
    // Ensure proper serialization of the tier slug
    if (subscription?.tiers && typeof subscription.tiers === 'object' && 'slug' in subscription.tiers) {
      currentTierSlug = subscription.tiers.slug as string
    }
    
    console.log('Current tier slug:', currentTierSlug)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Pricing Plans
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose the perfect plan for your messaging automation needs. Start with our free trial and scale as you grow.
          </p>
        </div>
        
        <PricingPlans 
          currentTierSlug={currentTierSlug}
          isAuthenticated={!!user}
        />
      </div>
    </div>
  )
}