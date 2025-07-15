import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { getTierByPriceId } from '@/lib/queries/tiers'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if ('subscription' in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          await handleSubscriptionChange(supabase, subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if ('subscription' in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          await handleSubscriptionChange(supabase, subscription)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if ('subscription' in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          await handleSubscriptionChange(supabase, subscription)
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          await handleSubscriptionChange(supabase, subscription)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  try {
    const userId = subscription.metadata.userId
    if (!userId) {
      console.error('No userId in subscription metadata')
      return
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) {
      console.error('No price ID found in subscription')
      return
    }

    // Find the tier based on the price ID
    const tier = await getTierByPriceId(priceId)
    if (!tier) {
      console.error('Error finding tier for price ID:', priceId)
      return
    }

  // Helper function to safely convert timestamp to ISO string
    const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
      if (!timestamp || timestamp <= 0) return null
      try {
        const date = new Date(timestamp * 1000)
        if (isNaN(date.getTime())) return null
        return date.toISOString()
      } catch {
        return null
      }
    }

    // Upsert subscription
    const subscriptionData: any = {
      user_id: userId,
      tier_id: tier.id,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }

    // Only add timestamp fields if they are valid
    // Get the first subscription item for billing period info
    const [item] = subscription.items.data
    const periodStart = item ? safeTimestampToISO(item.current_period_start) : null
    const periodEnd = item ? safeTimestampToISO(item.current_period_end) : null
    const createdAt = safeTimestampToISO(subscription.created)

    if (periodStart) subscriptionData.current_period_start = periodStart
    if (periodEnd) subscriptionData.current_period_end = periodEnd
    if (createdAt) subscriptionData.created_at = createdAt

    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Error upserting subscription:', error)
    }
  } catch (err) {
    console.error('Error in handleSubscriptionChange:', err)
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating deleted subscription:', error)
    }
  } catch (err) {
    console.error('Error in handleSubscriptionDeleted:', err)
  }
}