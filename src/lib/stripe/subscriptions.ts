import { stripe, STRIPE_CONFIG, SUBSCRIPTION_STATUS } from './config'
import { createClient } from '@/utils/supabase/server'
import type { Database } from '@/utils/supabase/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type Tier = Database['public']['Tables']['tiers']['Row']

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({
  userId,
  tierSlug,
  successUrl,
  cancelUrl,
}: {
  userId: string
  tierSlug: string
  successUrl: string
  cancelUrl: string
}) {
  const supabase = await createClient()
  
  // Get user and tier information
  const [userResult, tierResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('tiers').select('*').eq('slug', tierSlug).single()
  ])
  
  if (userResult.error || tierResult.error) {
    throw new Error('User or tier not found')
  }
  
  const user = userResult.data
  const tier = tierResult.data
  
  if (!tier.stripe_price_id) {
    throw new Error(`Tier ${tierSlug} does not have a Stripe price ID configured`)
  }
  
  // Create or get Stripe customer
  let customerId = user.stripe_customer_id
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: userId,
      },
    })
    
    customerId = customer.id
    
    // Update user with Stripe customer ID
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: tier.stripe_price_id,
        quantity: 1,
      },
    ],
    mode: STRIPE_CONFIG.mode,
    payment_method_types: STRIPE_CONFIG.payment_method_types,
    billing_address_collection: STRIPE_CONFIG.billing_address_collection,
    allow_promotion_codes: STRIPE_CONFIG.allow_promotion_codes,
    automatic_tax: STRIPE_CONFIG.automatic_tax,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      tier_id: tier.id,
    },
  })
  
  return session
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession({
  userId,
  returnUrl,
}: {
  userId: string
  returnUrl: string
}) {
  const supabase = await createClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()
  
  if (error || !user?.stripe_customer_id) {
    throw new Error('User does not have a Stripe customer ID')
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: returnUrl,
  })
  
  return session
}

/**
 * Sync subscription from Stripe to Supabase
 */
export async function syncSubscription(stripeSubscriptionId: string) {
  const supabase = await createClient()
  
  // Get subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['customer', 'items.data.price.product'],
  })
  
  // Get user by Stripe customer ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', stripeSubscription.customer as string)
    .single()
  
  if (userError || !user) {
    throw new Error('User not found for Stripe customer')
  }
  
  // Get tier by Stripe price ID
  const priceId = stripeSubscription.items.data[0]?.price.id
  if (!priceId) {
    throw new Error('No price found in subscription')
  }
  
  const { data: tier, error: tierError } = await supabase
    .from('tiers')
    .select('id')
    .eq('stripe_price_id', priceId)
    .single()
  
  if (tierError || !tier) {
    throw new Error('Tier not found for Stripe price')
  }
  
  // Upsert subscription in Supabase
  const subscriptionData = {
    user_id: user.id,
    tier_id: tier.id,
    stripe_subscription_id: stripeSubscription.id,
    status: stripeSubscription.status as any,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
  }
  
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id',
    })
  
  if (upsertError) {
    throw new Error(`Failed to sync subscription: ${upsertError.message}`)
  }
  
  return subscriptionData
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  
  // Sync the updated subscription
  await syncSubscription(subscriptionId)
  
  return subscription
}

/**
 * Reactivate a subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
  
  // Sync the updated subscription
  await syncSubscription(subscriptionId)
  
  return subscription
}

/**
 * Create a trial subscription for new users
 */
export async function createTrialSubscription(userId: string) {
  const supabase = await createClient()
  
  // Get the free/trial tier
  const { data: tier, error: tierError } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', 'free')
    .single()
  
  if (tierError || !tier) {
    throw new Error('Free tier not found')
  }
  
  // Create trial subscription in database
  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + 14) // 14-day trial
  
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      tier_id: tier.id,
      status: SUBSCRIPTION_STATUS.TRIALING,
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndDate.toISOString(),
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create trial subscription: ${error.message}`)
  }
  
  return subscription
}