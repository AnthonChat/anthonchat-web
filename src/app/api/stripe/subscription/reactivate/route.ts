import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { reactivateSubscription } from '@/lib/stripe'
import { apiLogger } from '@/lib/utils/loggers'
import type { User } from '@supabase/supabase-js'

export async function POST() {
  let user: User | null = null
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    user = authUser
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription that's set to cancel
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('cancel_at_period_end', true)
      .single()

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription to reactivate found' },
        { status: 400 }
      )
    }

    // Reactivate subscription in Stripe
    await reactivateSubscription(subscription.stripe_subscription_id)

    // Update subscription in database
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error('Reactivate Subscription Error', 'REACTIVATE_SUBSCRIPTION_ERROR', { error, userId: user?.id })
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}