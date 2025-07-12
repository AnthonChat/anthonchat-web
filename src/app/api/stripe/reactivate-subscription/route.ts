import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { reactivateSubscription } from '@/lib/stripe/subscriptions'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId } = await request.json()
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify the subscription belongs to the user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    
    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }
    
    // Reactivate the subscription
    await reactivateSubscription(subscriptionId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}