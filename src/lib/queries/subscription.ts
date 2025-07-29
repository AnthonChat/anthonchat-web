import { createClient } from '@/utils/supabase/server'
import { subscriptionLogger } from '@/lib/logging/loggers'
import type { Database as PublicDatabase } from '@/utils/supabase/schemas/public'
import type { Database as StripeDatabase } from '@/utils/supabase/schemas/stripe'

// Type aliases for better readability
type StripeSubscription = StripeDatabase["stripe"]["Tables"]["subscriptions"]["Row"];
type StripeProduct = StripeDatabase["stripe"]["Tables"]["products"]["Row"];
type TierFeatures = PublicDatabase["public"]["Tables"]["tiers_features"]["Row"];

// Interfaces for complex types
interface StripeSubscriptionItemPrice {
  id: string;
  product?: string; // Product ID that this price belongs to
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
}

interface StripeSubscriptionItem {
  id: string;
  price: StripeSubscriptionItemPrice;
  quantity: number | null;
}

// Combined types for API responses
export type UserSubscriptionResult = {
  subscription: StripeSubscription | null;
  product: StripeProduct | null;
  features: TierFeatures | null;
}

export type UserSubscription = {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  trial_end?: number | null; // Unix timestamp for trial end date
  items: StripeSubscriptionItem[];
  product: StripeProduct | null;
  features: TierFeatures | null;
  billing_interval?: string; // e.g., "month", "year"
  billing_interval_count?: number; // e.g., 1 for monthly, 12 for yearly
}

/**
 * Gets the Stripe customer ID for a user.
 */
export async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()
    
  if (error) {
    subscriptionLogger.error('Stripe Customer Id Fetch', 'STRIPE_CUSTOMER_ID_FETCH', { error, userId })
    return null
  }
  
  return data?.stripe_customer_id || null
}

/**
 * Gets the active subscription for a user.
 */
export async function getActiveSubscription(userId: string): Promise<StripeSubscription | null> {
  const supabase = await createClient()
  
  // First get the user's Stripe customer ID
  const customerId = await getUserStripeCustomerId(userId)
  
  if (!customerId) {
    subscriptionLogger.error('Stripe Customer Id Missing', 'STRIPE_CUSTOMER_ID_MISSING', { userId })
    return null
  }

  const { data: activeSubscriptions, error } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('*')
    .eq('customer', customerId)
    .in('status', ['active', 'trialing'])
    .order('created', { ascending: false })
   .limit(1)

  if (error) {
    subscriptionLogger.error('Active Subscription Fetch', 'ACTIVE_SUBSCRIPTION_FETCH', { error, customerId, userId })
    return null
  }
  
  
  // Return the most recent active subscription
  return activeSubscriptions && activeSubscriptions.length > 0 ? activeSubscriptions[0] : null
}

/**
 * Gets product details by ID.
 */
export async function getProductDetails(productId: string): Promise<StripeProduct | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .schema('stripe')
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()
    
  if (error) {
    subscriptionLogger.error('Product Details Fetch', 'PRODUCT_DETAILS_FETCH', { error, productId })
    return null
  }
  
  return data
}

/**
 * Gets tier features by product ID.
 */
export async function getTierFeatures(productId: string): Promise<TierFeatures | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tiers_features')
    .select('*')
    .eq('id', productId)
    .single()
    
  if (error && error.code !== 'PGRST116') {
    subscriptionLogger.error('Tier Features Fetch', 'TIER_FEATURES_FETCH', { error, productId })
    return null
  }
  
  return data
}

/**
 * Extracts subscription item details from Stripe subscription object.
 */
function extractSubscriptionItemDetails(subscription: StripeSubscription): StripeSubscriptionItem[] {
  try {
    // First try to get items from the items.data array (standard Stripe structure)
    if (subscription.items && typeof subscription.items === 'object' && 'data' in subscription.items) {
      const itemsData = (subscription.items as { data: unknown[] }).data
      if (Array.isArray(itemsData)) {
        return itemsData.map((item: unknown) => {
          const stripeItem = item as {
            id: string;
            price: StripeSubscriptionItemPrice;
            quantity: number | null;
          }
          return {
            id: stripeItem.id,
            price: stripeItem.price,
            quantity: stripeItem.quantity
          }
        })
      }
    }
    
    // Fallback: try to extract from plan field (legacy structure)
    if (subscription.plan && typeof subscription.plan === 'string') {
      const planData = JSON.parse(subscription.plan) as StripeSubscriptionItemPrice
      return [{
        id: planData.id,
        price: planData,
        quantity: 1
      }]
    }
    
    // Fallback: try to extract from metadata
    const metadata = subscription.metadata as Record<string, unknown>
    const itemsData = metadata?.items
    
    if (typeof itemsData === 'string') {
      return JSON.parse(itemsData) as StripeSubscriptionItem[]
    } else if (Array.isArray(itemsData)) {
      return itemsData as StripeSubscriptionItem[]
    }
    
    return []
  } catch (error) {
    subscriptionLogger.error('Subscription Items Parse', 'SUBSCRIPTION_ITEMS_PARSE', { error, subscriptionId: subscription.id })
    return []
  }
}

/**
 * Builds a complete subscription result with product and features.
 */
async function buildSubscriptionResult(subscription: StripeSubscription): Promise<UserSubscription | null> {
  const supabase = await createClient()
  const items = extractSubscriptionItemDetails(subscription)
  
  // Get the primary product ID from the first item's price
  let primaryProductId: string | null = null
  let billingInterval: string | undefined = undefined
  let billingIntervalCount: number | undefined = undefined
  let currentPeriodStart: number | null = subscription.current_period_start || null
  let currentPeriodEnd: number | null = subscription.current_period_end || null
  
  if (items.length > 0 && items[0]?.price) {
    const priceData = items[0].price
    
    // Extract billing interval information
    if (priceData.recurring) {
      billingInterval = priceData.recurring.interval
      billingIntervalCount = priceData.recurring.interval_count
    }
    
    // If the price object has a product field directly
    if (priceData.product) {
      primaryProductId = priceData.product
    } else if (priceData.id) {
      // Otherwise, look up the product from the price ID
      const { data: priceRecord } = await supabase
        .schema('stripe')
        .from('prices')
        .select('product')
        .eq('id', priceData.id)
        .single()
      
      primaryProductId = priceRecord?.product || null
    }
  }
  
  // If period dates are not in the main subscription object, try to get them from items
  if ((!currentPeriodStart || !currentPeriodEnd) && items.length > 0) {
    try {
      // Parse the items JSON to get period information
      const itemsJson = subscription.items
      if (typeof itemsJson === 'string') {
        const parsedItems = JSON.parse(itemsJson)
        if (parsedItems.data && Array.isArray(parsedItems.data) && parsedItems.data.length > 0) {
          const firstItem = parsedItems.data[0]
          if (firstItem.current_period_start && !currentPeriodStart) {
            currentPeriodStart = firstItem.current_period_start
          }
          if (firstItem.current_period_end && !currentPeriodEnd) {
            currentPeriodEnd = firstItem.current_period_end
          }
        }
      } else if (typeof itemsJson === 'object' && itemsJson && 'data' in itemsJson) {
        const itemsData = (itemsJson as { data: unknown[] }).data
        if (Array.isArray(itemsData) && itemsData.length > 0) {
          const firstItem = itemsData[0] as { current_period_start?: number; current_period_end?: number }
          if (firstItem.current_period_start && !currentPeriodStart) {
            currentPeriodStart = firstItem.current_period_start
          }
          if (firstItem.current_period_end && !currentPeriodEnd) {
            currentPeriodEnd = firstItem.current_period_end
          }
        }
      }
    } catch (error) {
      subscriptionLogger.error('Period Dates Extract', 'PERIOD_DATES_EXTRACT', { error, subscriptionId: subscription.id })
    }
  }
  
  if (!primaryProductId) {
    subscriptionLogger.error('Primary Product Id Missing', 'PRIMARY_PRODUCT_ID_MISSING', { subscriptionId: subscription.id, items })
    return null
  }
  
  // Get product details and features in parallel
  const [product, features] = await Promise.all([
    getProductDetails(primaryProductId),
    getTierFeatures(primaryProductId)
  ])
  
  return {
    id: subscription.id,
    status: subscription.status || '',
    current_period_start: currentPeriodStart || 0,
    current_period_end: currentPeriodEnd || 0,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    trial_end: subscription.trial_end as number | null || null,
    items,
    product,
    features,
    billing_interval: billingInterval,
    billing_interval_count: billingIntervalCount
  }
}

/**
 * Gets complete user subscription information including product and features.
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const subscription = await getActiveSubscription(userId)
  
  if (!subscription) {
    return null
  }
  
  return buildSubscriptionResult(subscription)
}
