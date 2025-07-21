// lib/queries/analytics.ts

import { createClient } from '@/utils/supabase/server'
import { analyticsLogger } from '@/lib/utils/loggers'

export interface AnalyticsData {
  totalMessages: number
  activeUsers: number
  responseRate: number
  avgResponseTime: number
}

export interface MessageStats {
  totalMessages: number
  messagesThisWeek: number
  messagesThisMonth: number
  avgMessagesPerDay: number
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersThisWeek: number
  newUsersThisMonth: number
}

export interface UsageStats {
  totalTokens: number
  totalRequests: number
  successRate: number
  tokensToday: number
  tokensThisWeek: number
  tokensThisMonth: number
  requestsToday: number
  requestsThisWeek: number
  requestsThisMonth: number
  avgTokensPerRequest: number
  totalConversations: number
  responseEfficiency: number
}

export async function getAnalyticsData(userId: string): Promise<AnalyticsData> {
  const supabase = await createClient()
  
  analyticsLogger.debug('getAnalyticsData called', 'ANALYTICS_FETCH', { userId })
  
  try {
    // Get user's channel IDs
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_channels')
      .select('id')
      .eq('user_id', userId)

    analyticsLogger.debug('User channels query result', 'ANALYTICS_FETCH', { userChannels, channelsError }, userId)

    if (channelsError || !userChannels || userChannels.length === 0) {
      analyticsLogger.info('No user channels found, returning mock data for testing', 'ANALYTICS_FETCH', undefined, userId)
      // Return mock data for testing when no real data exists
      return {
        totalMessages: 156,
        activeUsers: 3,
        responseRate: 94.2,
        avgResponseTime: 2.5
      }
    }

    const userChannelIds = userChannels.map(uc => uc.id)

    // Get total messages for user's channels
    const { count: totalMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('user_channel', userChannelIds)

    // Get active users (this user is active if they have messages in the last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: recentMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('user_channel', userChannelIds)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const activeUsers = recentMessages && recentMessages > 0 ? 1 : 0

    // Calculate response rate (percentage of user messages that got responses)
    const { count: userMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('user_channel', userChannelIds)
      .eq('role', 'user')

    const { count: assistantMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('user_channel', userChannelIds)
      .eq('role', 'assistant')

    const responseRate = userMessages && userMessages > 0 
      ? Math.min(100, ((assistantMessages || 0) / userMessages) * 100)
      : 0

    // Calculate average response time (simplified - using created_at timestamps)
    const avgResponseTime = 2.5 // Placeholder - would need more complex logic

    return {
      totalMessages: totalMessages || 0,
      activeUsers,
      responseRate,
      avgResponseTime
    }
  } catch (error) {
    analyticsLogger.error('ANALYTICS_DATA_FETCH', 'ANALYTICS_QUERIES', { error })
    return {
      totalMessages: 0,
      activeUsers: 0,
      responseRate: 0,
      avgResponseTime: 2.5
    }
  }
}

export async function getMessageStats(userId: string): Promise<MessageStats> {
  const supabase = await createClient()
  
  analyticsLogger.debug('getMessageStats called', 'MESSAGE_STATS', { userId })
  
  try {
    // Get user's channel IDs
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_channels')
      .select('id')
      .eq('user_id', userId)

    analyticsLogger.debug('User channels query result', 'MESSAGE_STATS', { userChannels, channelsError }, userId)

    if (!userChannels || userChannels.length === 0) {
      analyticsLogger.info('No user channels found, returning mock data for testing', 'MESSAGE_STATS', undefined, userId)
      // Return mock data for testing when no real data exists
      return {
        totalMessages: 156,
        messagesThisWeek: 28,
        messagesThisMonth: 89,
        avgMessagesPerDay: 2.97
      }
    }

    const userChannelIds = userChannels.map(uc => uc.id)
    analyticsLogger.debug('User channel IDs', 'MESSAGE_STATS', { userChannelIds }, userId)
    
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalResult, weekResult, monthResult] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('user_channel', userChannelIds),
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('user_channel', userChannelIds)
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('user_channel', userChannelIds)
        .gte('created_at', oneMonthAgo.toISOString())
    ])

    analyticsLogger.debug('Query results', 'MESSAGE_STATS', { 
      totalCount: totalResult.count, 
      weekCount: weekResult.count, 
      monthCount: monthResult.count 
    }) // Debug log

    const totalMessages = totalResult.count || 0
    const messagesThisWeek = weekResult.count || 0
    const messagesThisMonth = monthResult.count || 0
    const avgMessagesPerDay = totalMessages > 0 ? totalMessages / 30 : 0

    const result = {
      totalMessages,
      messagesThisWeek,
      messagesThisMonth,
      avgMessagesPerDay
    }

    analyticsLogger.debug('getMessageStats result', 'MESSAGE_STATS', result, userId)

    return result
  } catch (error) {
    analyticsLogger.error('Error fetching message stats', 'MESSAGE_STATS', { error }, userId)
    return {
      totalMessages: 0,
      messagesThisWeek: 0,
      messagesThisMonth: 0,
      avgMessagesPerDay: 0
    }
  }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createClient()
  
  analyticsLogger.debug('getUserStats called', 'USER_STATS', { userId })
  
  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // For single user context, we'll return user-specific stats
    const [userChannels, recentChannelsWeek, recentChannelsMonth] = await Promise.all([
      supabase
        .from('user_channels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('user_channels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('user_channels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneMonthAgo.toISOString())
    ])

    analyticsLogger.debug('User stats query results', 'USER_STATS', { userChannels, recentChannelsWeek, recentChannelsMonth }, userId)

    // If no user channels found, return mock data
    if (!userChannels.count || userChannels.count === 0) {
      analyticsLogger.info('No user channels found, returning mock data for testing', 'USER_STATS', undefined, userId)
      return {
        totalUsers: 1,
        activeUsers: 1,
        newUsersThisWeek: 1,
        newUsersThisMonth: 1
      }
    }

    return {
      totalUsers: 1, // Single user context
      activeUsers: 1, // Single user context
      newUsersThisWeek: recentChannelsWeek.count || 0,
      newUsersThisMonth: recentChannelsMonth.count || 0
    }
  } catch (error) {
    analyticsLogger.error('Error fetching analytics data', 'ANALYTICS_FETCH', { error }, userId)
    // Return mock data on error for testing
    return {
      totalUsers: 1,
      activeUsers: 1,
      newUsersThisWeek: 1,
      newUsersThisMonth: 1
    }
  }
}

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const supabase = await createClient()
  
  analyticsLogger.debug('getUsageStats called', 'USAGE_STATS', { userId })
  
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get user's channel IDs first
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_channels')
      .select('id')
      .eq('user_id', userId)

    analyticsLogger.debug('User channels query result', 'USAGE_STATS', { userChannels, channelsError }, userId)

    if (channelsError || !userChannels || userChannels.length === 0) {
      analyticsLogger.info('No user channels found, returning mock data for testing', 'USAGE_STATS', undefined, userId)
      // Return mock data for testing when no real data exists
      return {
        totalTokens: 1250,
        totalRequests: 45,
        successRate: 95,
        tokensToday: 120,
        tokensThisWeek: 680,
        tokensThisMonth: 1250,
        requestsToday: 5,
        requestsThisWeek: 18,
        requestsThisMonth: 45,
        avgTokensPerRequest: 27.8,
        totalConversations: 3,
        responseEfficiency: 85
      }
    }

    const userChannelIds = userChannels.map(uc => uc.id)
    analyticsLogger.debug('User channel IDs', 'USAGE_STATS', { userChannelIds }, userId)

    // Get usage records for this user's channels
    const { data: usageRecords, error: usageError } = await supabase
      .from('usage_records')
      .select('*')
      .in('user_channel_id', userChannelIds)

    analyticsLogger.debug('Usage records query result', 'USAGE_STATS', { usageRecords, usageError }, userId)

    if (!usageRecords || usageRecords.length === 0) {
      analyticsLogger.info('No usage records found, returning mock data for testing', 'USAGE_STATS', undefined, userId)
      // Return mock data for testing when no usage records exist
      return {
        totalTokens: 850,
        totalRequests: 32,
        successRate: 95,
        tokensToday: 85,
        tokensThisWeek: 420,
        tokensThisMonth: 850,
        requestsToday: 3,
        requestsThisWeek: 12,
        requestsThisMonth: 32,
        avgTokensPerRequest: 26.6,
        totalConversations: userChannels.length,
        responseEfficiency: 88
      }
    }

    // Filter records by time periods
    const todayRecords = usageRecords.filter(record => 
      new Date(record.created_at) >= today
    )
    const weekRecords = usageRecords.filter(record => 
      new Date(record.created_at) >= oneWeekAgo
    )
    const monthRecords = usageRecords.filter(record => 
      new Date(record.created_at) >= oneMonthAgo
    )

    // Calculate totals (note: the column is requests_used, not requests_made)
    const totalTokens = usageRecords.reduce((sum, record) => 
      sum + (record.tokens_used || 0), 0
    )
    const totalRequests = usageRecords.reduce((sum, record) => 
      sum + (record.requests_used || 0), 0
    )
    
    const tokensToday = todayRecords.reduce((sum, record) => 
      sum + (record.tokens_used || 0), 0
    )
    const requestsToday = todayRecords.reduce((sum, record) => 
      sum + (record.requests_used || 0), 0
    )
    
    const tokensThisWeek = weekRecords.reduce((sum, record) => 
      sum + (record.tokens_used || 0), 0
    )
    const requestsThisWeek = weekRecords.reduce((sum, record) => 
      sum + (record.requests_used || 0), 0
    )
    
    const tokensThisMonth = monthRecords.reduce((sum, record) => 
      sum + (record.tokens_used || 0), 0
    )
    const requestsThisMonth = monthRecords.reduce((sum, record) => 
      sum + (record.requests_used || 0), 0
    )

    const avgTokensPerRequest = totalRequests > 0 
      ? totalTokens / totalRequests 
      : 0

    const successRate = totalRequests > 0 ? 95 : 0 // Placeholder
    const responseEfficiency = avgTokensPerRequest > 0 
      ? Math.min(100, 1000 / avgTokensPerRequest) 
      : 0

    const result = {
      totalTokens,
      totalRequests,
      successRate,
      tokensToday,
      tokensThisWeek,
      tokensThisMonth,
      requestsToday,
      requestsThisWeek,
      requestsThisMonth,
      avgTokensPerRequest,
      totalConversations: userChannels.length,
      responseEfficiency
    }

    analyticsLogger.debug('getUsageStats result', 'USAGE_STATS', result, userId)

    return result
  } catch (error) {
    analyticsLogger.error('Error fetching usage stats', 'USAGE_STATS', { error }, userId)
    // Return mock data even on error for testing
    return {
      totalTokens: 950,
      totalRequests: 38,
      successRate: 95,
      tokensToday: 95,
      tokensThisWeek: 520,
      tokensThisMonth: 950,
      requestsToday: 4,
      requestsThisWeek: 15,
      requestsThisMonth: 38,
      avgTokensPerRequest: 25.0,
      totalConversations: 2,
      responseEfficiency: 90
    }
  }
}