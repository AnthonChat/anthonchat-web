import Stripe from 'stripe'
import { createServiceRoleClient } from '@/utils/supabase/server'

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
  intervalMs: number = 500
): Promise<boolean> => {
  const supabase = createServiceRoleClient() // Use service role for stripe schema access
  const startTime = Date.now()
  
  console.log(`[STRIPE_CUSTOMER_SYNC] Starting sync wait for customer: ${customerId}`)
  
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
        console.log(`[STRIPE_CUSTOMER_SYNC] Query error: ${error.message}`)
      } else if (data) {
        console.log(`[STRIPE_CUSTOMER_SYNC] Customer found: ${customerId}`)
        return true
      } else {
        console.log(`[STRIPE_CUSTOMER_SYNC] Customer not found yet: ${customerId}`)
      }
    } catch (err) {
      console.error(`[STRIPE_CUSTOMER_SYNC] Unexpected error:`, err)
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  
  console.log(`[STRIPE_CUSTOMER_SYNC] Timeout reached for customer: ${customerId}`)
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
      console.error(`[LINK_CUSTOMER] Database error: ${error.message}`)
      return false
    }
    
    if (!customer) {
      console.error(`[LINK_CUSTOMER] Customer ${customerId} not found in local database`)
      return false
    }
    
    console.log(`[LINK_CUSTOMER] Found customer in database: ${customerId} (${customer.email})`)
    
    // Update the user record
    await updateUserData(userId, {
      stripe_customer_id: customerId
    })
    
    console.log(`[LINK_CUSTOMER] Successfully linked customer ${customerId} to user ${userId}`)
    return true
  } catch (error) {
    console.error('[LINK_CUSTOMER] Failed to link customer to user:', error)
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
      console.error(`[DEBUG_CUSTOMER] Database error: ${error.message}`)
      return null
    }
    
    console.log(`[DEBUG_CUSTOMER] Customer ${customerId}:`, data ? 'FOUND' : 'NOT FOUND')
    if (data) {
      console.log(`[DEBUG_CUSTOMER] Customer details:`, {
        id: data.id,
        email: data.email,
        deleted: data.deleted,
        created: data.created,
        updated_at: data.updated_at
      })
    }
    
    return data
  } catch (error) {
    console.error('[DEBUG_CUSTOMER] Unexpected error:', error)
    return null
  }
}

/**
 * Manual recovery function to link customers that were created but not linked during signup
 * This can be called from a script or admin interface to fix orphaned customers
 * @param userId - The user ID to link the customer to
 * @param email - The email to search for in Stripe customers
 * @returns Promise<{ success: boolean, customerId?: string, error?: string }>
 */
export const manualLinkCustomerByUserId = async (userId: string, email?: string): Promise<{ success: boolean, customerId?: string, error?: string }> => {
  try {
    // First check if user already has a customer ID
    const { getUserData } = await import('@/lib/queries/user')
    const userData = await getUserData(userId)
    
    if (userData?.stripe_customer_id) {
      return { 
        success: true, 
        customerId: userData.stripe_customer_id,
        error: 'User already has a linked customer'
      }
    }
    
    const userEmail = email || userData?.email
    if (!userEmail) {
      return { success: false, error: 'No email provided and user email not found' }
    }
    
    // Try to find customer by email and link it
    const customerId = await findAndLinkCustomerByEmail(userId, userEmail)
    
    if (customerId) {
      return { success: true, customerId }
    } else {
      return { success: false, error: 'No matching customer found in Stripe or linking failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Finds and links a Stripe customer by email to a user
 * @param userId - The user ID to link the customer to  
 * @param email - The email to search for in Stripe customers
 * @returns Promise<string | null> - The customer ID if found and linked, null otherwise
 */
export const findAndLinkCustomerByEmail = async (userId: string, email: string): Promise<string | null> => {
  try {
    const customer = await getStripeCustomerByEmail(email)
    
    if (!customer) {
      return null
    }
    
    const linked = await linkCustomerToUser(userId, customer.id)
    return linked ? customer.id : null
  } catch (error) {
    console.error('Failed to find and link customer by email:', error)
    return null
  }
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