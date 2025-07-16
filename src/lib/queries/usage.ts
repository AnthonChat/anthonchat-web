import { createClient } from "@/utils/supabase/server"

// Mock usage data structure - in real implementation this would come from your analytics system
export interface UsageData {
  tokens_used: number
  requests_used: number
  tokens_limit?: number
  requests_limit?: number
  period_start?: string
  period_end?: string
}

export async function getUserUsage(userId: string): Promise<UsageData> {
  const supabase = await createClient()
  
  // Get user's current subscription to determine limits
  let subscription = null
  let tier = null
  
  try {
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single()
    
    subscription = subscriptionData
    
    // If subscription has a tier_id, fetch the tier details
    if (subscription?.tier_id) {
      const { data: tierData } = await supabase
        .from('tiers')
        .select('max_tokens, max_requests')
        .eq('id', subscription.tier_id)
        .single()
      tier = tierData
    }
  } catch {
    // No active subscription found - use free tier limits
    try {
      const { data: freeTier } = await supabase
        .from('tiers')
        .select('max_tokens, max_requests')
        .eq('slug', 'free')
        .single()
      tier = freeTier
    } catch {
      // Fallback if no free tier found
      tier = { max_tokens: 1000, max_requests: 50 }
    }
  }
  
  // Get current usage from database
  const { data: currentUsage } = await supabase
    .rpc('get_current_usage', { user_id_param: userId })
  
  const usage = currentUsage?.[0] || {
    tokens_used: 0,
    requests_used: 0,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
  }
  
  return {
    tokens_used: usage.tokens_used,
    requests_used: usage.requests_used,
    tokens_limit: tier?.max_tokens || undefined,
    requests_limit: tier?.max_requests || undefined,
    period_start: usage.period_start,
    period_end: usage.period_end
  }
}

export async function getUserUsageHistory(userId: string, months: number = 6) {
  const supabase = await createClient()
  
  // Calculate date range for the last N months
  const endDate = new Date()
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1)
  
  const { data: usageHistory } = await supabase
    .from('usage_records')
    .select('tokens_used, requests_used, period_start')
    .eq('user_id', userId)
    .gte('period_start', startDate.toISOString())
    .order('period_start', { ascending: true })
  
  // Fill in missing months with zero usage
  const history = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
    
    // Find existing usage record for this month
    const existingRecord = usageHistory?.find(record => 
      record.period_start?.slice(0, 7) === monthKey
    )
    
    history.push({
      month: monthKey,
      tokens_used: existingRecord?.tokens_used || 0,
      requests_used: existingRecord?.requests_used || 0
    })
  }
  
  return history
}

// Function to check if user is approaching limits
export async function checkUsageLimits(userId: string) {
  const usage = await getUserUsage(userId)
  
  const warnings = []
  
  if (usage.tokens_limit) {
    const tokensPercent = (usage.tokens_used / usage.tokens_limit) * 100
    if (tokensPercent >= 90) {
      warnings.push({
        type: 'tokens',
        level: 'critical',
        message: `You've used ${tokensPercent.toFixed(1)}% of your token limit`
      })
    } else if (tokensPercent >= 75) {
      warnings.push({
        type: 'tokens',
        level: 'warning',
        message: `You've used ${tokensPercent.toFixed(1)}% of your token limit`
      })
    }
  }
  
  if (usage.requests_limit) {
    const requestsPercent = (usage.requests_used / usage.requests_limit) * 100
    if (requestsPercent >= 90) {
      warnings.push({
        type: 'requests',
        level: 'critical',
        message: `You've used ${requestsPercent.toFixed(1)}% of your request limit`
      })
    } else if (requestsPercent >= 75) {
      warnings.push({
        type: 'requests',
        level: 'warning',
        message: `You've used ${requestsPercent.toFixed(1)}% of your request limit`
      })
    }
  }
  
  return warnings
}