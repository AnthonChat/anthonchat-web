// lib/queries/usage.ts

import { createClient } from '@/utils/supabase/server'
import type { Database as PublicDatabase } from '@/utils/supabase/schemas/public'
import { getUserSubscription } from './subscription'
import type { UserTierAndUsageResult, UsageData, CurrentUsage } from '@/lib/types/usage.types'
import { usageLogger } from '@/lib/logging/loggers'

// Type aliases for better readability
type UsageRecord = PublicDatabase["public"]["Tables"]["usage_records"]["Row"];
type UsageRecordInsert = PublicDatabase["public"]["Tables"]["usage_records"]["Insert"];
type UsageRecordUpdate = PublicDatabase["public"]["Tables"]["usage_records"]["Update"];

/**
 * Gets user tier and usage information using the database function.
 */
export async function getUserTierAndUsage(userId: string): Promise<UserTierAndUsageResult | null> {
  const supabase = await createClient()
  
  try {
      const { data, error } = await supabase
      .rpc('get_user_usage_and_limits', { user_id: userId })
      
    if (error) {
      usageLogger.error('Error fetching user tier and usage', new Error('TIER_USAGE_FETCH'), { error }, userId)
      return null
    }
    
    // Fix: The RPC returns an array with one object, so we need to access the first element
    const usageData = data?.[0]
    
    if (!usageData) {
      return null
    }
    
    return {
      tokens_used: usageData.tokens_used,
      requests_used: usageData.requests_used,
      tokens_limit: usageData.tier_tokens_limit,
      requests_limit: usageData.tier_requests_limit,
      history_limit: usageData.tier_history_limit,
    }
  } catch (error) {
    usageLogger.error('Error fetching user tier and usage', new Error('TIER_USAGE_FETCH'), { error }, userId)
    return null
  }
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
    supabase.rpc('get_user_usage_and_limits', { user_id: userId }),
  ])

  // Destructure the response from the RPC call
  const { data: rpcData, error: rpcError } = usageResponse

  if (rpcError) {
    usageLogger.error('Error calling get_user_usage_and_limits RPC', new Error('USER_USAGE_FETCH'), { error: rpcError.message }, userId)
    // If the RPC fails, we still return a valid default object to prevent UI crashes.
  }

  // Fix: The RPC returns an array with one object, so we need to access the first element
  const usageData = rpcData?.[0]

  // We now use the nullish coalescing operator '??' to ensure that if the RPC
  // data or any nested property is null or undefined, we safely fall back to 0.
  // This completely prevents `undefined` from being passed to the component.

  const tokensUsed = usageData?.tokens_used ?? 0
  const requestsUsed = usageData?.requests_used ?? 0

  // Use the actual tier limits from the RPC response, with fallbacks
  const tokensLimit = usageData?.tier_tokens_limit ?? 10000  // Default to 10k tokens
  const requestsLimit = usageData?.tier_requests_limit ?? 100  // Default to 100 requests

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
    tokens_limit: tokensLimit,
    requests_limit: requestsLimit,
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
    usageLogger.error('Error fetching current usage', new Error('CURRENT_USAGE_FETCH'), { error }, userId)
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
    usageLogger.error('Error fetching user channel usage', new Error('CHANNEL_USAGE_FETCH'), { error, channelId }, userId)
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
    usageLogger.error('Error creating usage record', new Error('USAGE_RECORD_CREATE'), { error, usageData })
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
    usageLogger.error('Error updating usage record', new Error('USAGE_RECORD_UPDATE'), { error, id, updates })
    return null
  }
  
  return data
}