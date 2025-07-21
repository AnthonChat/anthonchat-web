import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createCheckoutSession, createStripeCustomer, getStripeCustomerByEmail } from '@/lib/stripe'
import { getTierByPriceId } from '@/lib/queries/tiers'
import { apiLogger } from '@/lib/utils/loggers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, tierSlug } = await request.json()

    if (!priceId || !tierSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate the price ID exists in our tiers
    const tier = await getTierByPriceId(priceId)
    if (!tier) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single()

    const email = userProfile?.email || user.email
    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = userProfile?.stripe_customer_id
    
    if (!customerId) {
      // Check if customer exists in Stripe
      const existingCustomer = await getStripeCustomerByEmail(email)
      
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create new customer
        const customer = await createStripeCustomer(
          email,
          user.user_metadata?.name || user.user_metadata?.full_name
        )
        customerId = customer.id
      }

      // Update user profile with customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${request.nextUrl.origin}/dashboard/subscription?success=true`,
      cancelUrl: `${request.nextUrl.origin}/dashboard/subscription?canceled=true`,
      userId: user.id,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    apiLogger.error('STRIPE_CHECKOUT_ERROR', 'API_STRIPE', { error })
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}