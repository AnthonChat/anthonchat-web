import Stripe from 'stripe'
import { createServiceRoleClient } from '@/utils/supabase/server'
import { stripeLogger } from '@/lib/logging/loggers'

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

/**
 * Waits for a Stripe customer to be synced to the local database via webhooks
 * @param customerId - The Stripe customer ID to wait for
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 10 seconds)
 * @param intervalMs - Check interval in milliseconds (default: 500ms)
 * @returns Promise<boolean> - true if customer is found, false if timeout
 */
export const waitForCustomerSync = async (
  customerId: string, 
  maxWaitMs: number = 10000, 
  intervalMs: number = 100
): Promise<boolean> => {
  const supabase = createServiceRoleClient() // Use service role for stripe schema access
  const startTime = Date.now()
  
  stripeLogger.debug(`Starting sync wait for customer: ${customerId}`)
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const { data, error } = await supabase
        .schema('stripe')
        .from('customers')
        .select('id, deleted')
        .eq('id', customerId)
        .eq('deleted', false)
        .maybeSingle()
      
      if (error) {
        stripeLogger.warn(`Query error: ${error.message}`)
      } else if (data) {
        stripeLogger.debug(`Customer found: ${customerId}`)
        return true
      } else {
        stripeLogger.debug(`Customer not found yet: ${customerId}`)
      }
    } catch (err) {
      stripeLogger.error(`Unexpected error`, err instanceof Error ? err : new Error(String(err)))
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  
  stripeLogger.warn(`Timeout reached for customer: ${customerId}`)
  return false
}
  
/**
 * Links an existing Stripe customer to a user account
 * This is useful for cases where the initial sync during signup failed
 * @param userId - The user ID to link the customer to
 * @param customerId - The Stripe customer ID to link
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const linkCustomerToUser = async (userId: string, customerId: string): Promise<boolean> => {
  const { updateUserData } = await import('@/lib/queries/user')
  
  try {
    // First check if the customer exists in the stripe.customers table
    const supabase = createServiceRoleClient() // Use service role for stripe schema access
    const { data: customer, error } = await supabase
      .schema('stripe')
      .from('customers')
      .select('id, email, deleted')
      .eq('id', customerId)
      .eq('deleted', false)
      .maybeSingle()
    
    if (error) {
      stripeLogger.error(`Database error`, new Error(error.message))
      return false
    }
    
    if (!customer) {
      stripeLogger.error(`Customer not found in local database`, new Error(`Customer ${customerId} not found`))
      return false
    }
    
    stripeLogger.debug(`Found customer in database: ${customerId} (${customer.email})`)
    
    // Update the user record
    await updateUserData(userId, {
      stripe_customer_id: customerId
    })
    
    stripeLogger.debug(`Successfully linked customer ${customerId} to user ${userId}`)
    return true
  } catch (error) {
    stripeLogger.error('Failed to link customer to user', error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

/**
 * Debug function to check if a customer exists in the local database
 * @param customerId - The Stripe customer ID to check
 * @returns Promise<object | null> - Customer data if found, null otherwise
 */
export const debugCheckCustomerExists = async (customerId: string) => {
  try {
    const supabase = createServiceRoleClient() // Use service role for stripe schema access
    const { data, error } = await supabase
      .schema('stripe')
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle()
    
    if (error) {
      stripeLogger.error(`Database error`, new Error(error.message))
      return null
    }
    
    stripeLogger.debug(`Customer ${customerId}: ${data ? 'FOUND' : 'NOT FOUND'}`)
    if (data) {
      stripeLogger.debug(`Customer details: ${JSON.stringify({
        id: data.id,
        email: data.email,
        deleted: data.deleted,
        created: data.created,
        updated_at: data.updated_at
      })}`)
    }
    
    return data
  } catch (error) {
    stripeLogger.error('Unexpected error', error instanceof Error ? error : new Error(String(error)))
    return null
  }
}

export const createCheckoutSession = async ({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
  trialPeriodDays,
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
  trialPeriodDays?: number
}) => {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
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
  }

  // For free trials, we don't require payment method collection upfront
  if (trialPeriodDays && trialPeriodDays > 0) {
    sessionConfig.payment_method_collection = 'if_required'
    sessionConfig.subscription_data!.trial_period_days = trialPeriodDays
  } else {
    sessionConfig.payment_method_types = ['card']
  }

  return await stripe.checkout.sessions.create(sessionConfig)
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