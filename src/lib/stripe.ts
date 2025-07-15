import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
})

export const getStripeCustomerByEmail = async (email: string) => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })
  return customers.data[0] || null
}

export const createStripeCustomer = async (email: string, name?: string) => {
  return await stripe.customers.create({
    email,
    name,
  })
}

export const createCheckoutSession = async ({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
}) => {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  })
}

export const createBillingPortalSession = async ({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

export const reactivateSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}