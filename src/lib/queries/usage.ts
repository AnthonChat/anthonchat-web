// lib/queries/usage.ts

import { createClient } from '@/utils/supabase/server'
import type { Database as PublicDatabase } from '@/utils/supabase/schemas/public'
import { getUserSubscription } from './subscription'
import type { UserTierAndUsageResult, UsageData, CurrentUsage } from '@/lib/types/usage'

// Type aliases for better readability
type UsageRecord = PublicDatabase["public"]["Tables"]["usage_records"]["Row"];
type UsageRecordInsert = PublicDatabase["public"]["Tables"]["usage_records"]["Insert"];
type UsageRecordUpdate = PublicDatabase["public"]["Tables"]["usage_records"]["Update"];

/**
 * Gets user tier and usage information using the database function.
 */
export async function getUserTierAndUsage(userId: string): Promise<UserTierAndUsageResult | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('get_user_tier_and_usage', { user_id: userId })
    
  if (error) {
    console.error('Error fetching user tier and usage:', error)
    return null
  }
  
  return data
}

/**
 * Legacy function for compatibility with existing dashboard components.
 * Gets user usage data in the format expected by SubscriptionCard.
 */
export async function getUserUsage(userId: string): Promise<UsageData> {
  const supabase = await createClient()

  // Fetch subscription details and usage data in parallel for efficiency
  const [subscription, usageResponse] = await Promise.all([
    getUserSubscription(userId),
    supabase.rpc('get_user_tier_and_usage', { user_id: userId }),
  ])

  // Destructure the response from the RPC call
  const { data: rpcData, error: rpcError } = usageResponse

  if (rpcError) {
    console.error('Error calling get_user_tier_and_usage RPC:', rpcError.message)
    // If the RPC fails, we still return a valid default object to prevent UI crashes.
  }

  // We now use the nullish coalescing operator '??' to ensure that if the RPC
  // data or any nested property is null or undefined, we safely fall back to 0.
  // This completely prevents `undefined` from being passed to the component.

  const tokensUsed = rpcData?.tokens_used ?? 0
  const requestsUsed = 0 // Legacy field, not used in new schema

  // The period start/end comes from the subscription object, not the usage RPC
  const periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : undefined
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : undefined

  return {
    tokens_used: tokensUsed,
    requests_used: requestsUsed,
    tokens_limit: rpcData?.tokens_limit ?? null,
    requests_limit: rpcData?.tokens_limit ?? null, // Using tokens_limit for both for now
    period_start: periodStart,
    period_end: periodEnd,
  }
}

/**
 * Gets current usage for a user.
 */
export async function getCurrentUsage(userId: string): Promise<CurrentUsage | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('get_current_usage', { user_id: userId })
    
  if (error) {
    console.error('Error fetching current usage:', error)
    return null
  }
  
  return data
}

/**
 * Gets usage records for a specific user and channel.
 */
export async function getUserChannelUsage(
  userId: string, 
  channelId: string
): Promise<UsageRecord[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching user channel usage:', error)
    return []
  }
  
  return data || []
}

/**
 * Creates a new usage record.
 */
export async function createUsageRecord(
  usageData: UsageRecordInsert
): Promise<UsageRecord | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('usage_records')
    .insert(usageData)
    .select('*')
    .single()
    
  if (error) {
    console.error('Error creating usage record:', error)
    return null
  }
  
  return data
}

/**
 * Updates an existing usage record.
 */
export async function updateUsageRecord(
  id: string,
  updates: UsageRecordUpdate
): Promise<UsageRecord | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('usage_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
    
  if (error) {
    console.error('Error updating usage record:', error)
    return null
  }
  
  return data
}