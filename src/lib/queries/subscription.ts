import { createClient } from "@/utils/supabase/server"

export async function getUserSubscription(userId: string) {
  const supabase = await createClient()
  
  // First try to get active subscription
  let { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
    
  // If no active subscription found, try to get trial subscription
  if (!subscription && error?.code === 'PGRST116') {
    const { data: trialSubscription, error: trialError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'trialing')
      .single()
    
    subscription = trialSubscription
    error = trialError
  }
  
  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  if (!subscription) {
    return null
  }
  
  // Fetch tier details if tier_id exists
  let tier = null
  if (subscription.tier_id) {
    const { data: tierData } = await supabase
      .from('tiers')
      .select('slug, name, max_tokens, max_requests, features')
      .eq('id', subscription.tier_id)
      .single()
    tier = tierData
  }
  
  return {
    ...subscription,
    tiers: tier
  }
}

export async function getTrialSubscription(userId: string) {
  const supabase = await createClient()
  
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'trialing')
    .single()
    
  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  if (!subscription) {
    return null
  }
  
  // Fetch tier details if tier_id exists
  let tier = null
  if (subscription.tier_id) {
    const { data: tierData } = await supabase
      .from('tiers')
      .select('slug, name, max_tokens, max_requests, features')
      .eq('id', subscription.tier_id)
      .single()
    tier = tierData
  }
  
  return {
    ...subscription,
    tiers: tier
  }
}

export async function getAllUserSubscriptions(userId: string) {
  const supabase = await createClient()
  
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    
  if (error) {
    throw error
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    return []
  }
  
  // Fetch tier details for each subscription that has a tier_id
  const subscriptionsWithTiers = await Promise.all(
    subscriptions.map(async (subscription) => {
      if (subscription.tier_id) {
        const { data: tierData } = await supabase
          .from('tiers')
          .select('slug, name, max_tokens, max_requests, features')
          .eq('id', subscription.tier_id)
          .single()
        return {
          ...subscription,
          tiers: tierData
        }
      }
      return {
        ...subscription,
        tiers: null
      }
    })
  )
  
  return subscriptionsWithTiers
}