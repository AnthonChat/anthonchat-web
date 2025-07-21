// lib/queries/notifications.ts

import { createClient } from '@/utils/supabase/server'
import { notificationLogger } from '@/lib/utils/loggers'
import { getActiveSubscription } from './subscription'
import { getUserTierAndUsage } from './usage'

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  read: boolean
  timestamp: string
  actionUrl?: string
  actionText?: string
}

export interface RecentActivity {
  description: string
  timestamp: string
}

/**
 * Gets system-generated notifications for a user based on their account status
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const notifications: Notification[] = []

  try {
    // Get user subscription and usage data
    const [subscription, tierAndUsage] = await Promise.all([
      getActiveSubscription(userId),
      getUserTierAndUsage(userId)
    ])

    // Check for subscription-related notifications
    if (subscription) {
      // Trial expiring soon
      if (subscription.status === 'trialing' && subscription.trial_end) {
        const trialEndValue = subscription.trial_end as number
        const trialEnd = new Date(trialEndValue * 1000)
        const now = new Date()
        const daysUntilExpiry = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
          notifications.push({
            id: `trial-expiring-${userId}`,
            title: 'Trial Expiring Soon',
            message: `Your trial expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Upgrade to continue using all features.`,
            type: 'warning',
            timestamp: now.toISOString(),
            read: false,
            actionUrl: '/dashboard/subscription',
            actionText: 'Upgrade Now'
          })
        }
      }

      // Subscription past due
      if (subscription.status === 'past_due') {
        notifications.push({
          id: `subscription-past-due-${userId}`,
          title: 'Payment Required',
          message: 'Your subscription payment is past due. Please update your payment method to continue service.',
          type: 'error',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/dashboard/subscription',
          actionText: 'Update Payment'
        })
      }

      // Subscription canceled
      if (subscription.status === 'canceled') {
        notifications.push({
          id: `subscription-canceled-${userId}`,
          title: 'Subscription Canceled',
          message: 'Your subscription has been canceled. You can reactivate it anytime.',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: '/dashboard/subscription',
          actionText: 'Reactivate'
        })
      }
    } else {
      // No subscription - encourage upgrade
      notifications.push({
        id: `no-subscription-${userId}`,
        title: 'Upgrade Your Account',
        message: 'Get more features and higher limits by upgrading to a paid plan.',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/dashboard/subscription',
        actionText: 'View Plans'
      })
    }

    // Check for usage-related notifications
    if (tierAndUsage) {
      // High token usage
      if (tierAndUsage.tokens_limit && tierAndUsage.tokens_used) {
        const usagePercentage = (tierAndUsage.tokens_used / tierAndUsage.tokens_limit) * 100
        
        if (usagePercentage >= 90) {
          notifications.push({
            id: `high-token-usage-${userId}`,
            title: 'High Token Usage',
            message: `You've used ${Math.round(usagePercentage)}% of your token limit. Consider upgrading for higher limits.`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            read: false,
            actionUrl: '/dashboard/subscription',
            actionText: 'Upgrade Plan'
          })
        } else if (usagePercentage >= 75) {
          notifications.push({
            id: `moderate-token-usage-${userId}`,
            title: 'Token Usage Alert',
            message: `You've used ${Math.round(usagePercentage)}% of your token limit this period.`,
            type: 'info',
            timestamp: new Date().toISOString(),
            read: false,
            actionUrl: '/dashboard/analytics',
            actionText: 'View Usage'
          })
        }
      }
    }

    // Check for channel-related notifications
    const supabase = await createClient()
    
    // Unverified channels
    const { data: unverifiedChannels } = await supabase
      .from('user_channels')
      .select('id, link, channels(id)')
      .eq('user_id', userId)
      .is('verified_at', null)

    if (unverifiedChannels && unverifiedChannels.length > 0) {
      notifications.push({
        id: `unverified-channels-${userId}`,
        title: 'Verify Your Channels',
        message: `You have ${unverifiedChannels.length} unverified channel${unverifiedChannels.length === 1 ? '' : 's'}. Verify them to start receiving messages.`,
        type: 'warning',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/dashboard/channels',
        actionText: 'Verify Channels'
      })
    }

    // Recent successful verifications
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const { data: recentVerifications } = await supabase
      .from('user_channels')
      .select('id, link, channels(id)')
      .eq('user_id', userId)
      .not('verified_at', 'is', null)
      .gte('verified_at', oneDayAgo.toISOString())

    if (recentVerifications && recentVerifications.length > 0) {
      notifications.push({
        id: `recent-verifications-${userId}`,
        title: 'Channels Verified!',
        message: `${recentVerifications.length} channel${recentVerifications.length === 1 ? ' has' : 's have'} been successfully verified.`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/dashboard/channels',
        actionText: 'View Channels'
      })
    }

    // Welcome notification for new users
    const { data: userData } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single()

    if (userData) {
      const userCreated = new Date(userData.created_at)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      if (userCreated > threeDaysAgo) {
        notifications.push({
          id: `welcome-${userId}`,
          title: 'Welcome to AnthonChat!',
          message: 'Get started by adding and verifying your first channel to begin receiving AI-powered responses.',
          type: 'info',
          timestamp: userCreated.toISOString(),
          read: false,
          actionUrl: '/dashboard/channels/add',
          actionText: 'Add Channel'
        })
      }
    }

    // Sort notifications by timestamp (newest first)
    return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  } catch (error) {
    notificationLogger.error('USER_NOTIFICATIONS_GENERATE', 'NOTIFICATION_QUERIES', { error, userId })
    return []
  }
}

/**
 * Gets the count of unread notifications for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notifications = await getUserNotifications(userId)
  return notifications.filter(notification => !notification.read).length
}

/**
 * Gets recent activity notifications (last 7 days)
 */
export async function getRecentActivity(userId: string): Promise<Notification[]> {
  const supabase = await createClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const activities: Notification[] = []

  try {
    // Recent messages
    const { data: userChannels } = await supabase
      .from('user_channels')
      .select('id')
      .eq('user_id', userId)

    if (userChannels && userChannels.length > 0) {
      const channelIds = userChannels.map(channel => channel.id)
      
      const { count: recentMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('user_channel', channelIds)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (recentMessages && recentMessages > 0) {
        activities.push({
          id: `recent-messages-${userId}`,
          title: 'Message Activity',
          message: `${recentMessages} messages exchanged in the last 7 days.`,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: true,
          actionUrl: '/dashboard/analytics',
          actionText: 'View Details'
        })
      }
    }

    // Recent channel additions
    const { count: recentChannels } = await supabase
      .from('user_channels')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())

    if (recentChannels && recentChannels > 0) {
      activities.push({
        id: `recent-channels-${userId}`,
        title: 'New Channels',
        message: `${recentChannels} new channel${recentChannels === 1 ? '' : 's'} added in the last 7 days.`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: true,
        actionUrl: '/dashboard/channels',
        actionText: 'View Channels'
      })
    }

    return activities

  } catch (error) {
    notificationLogger.error('RECENT_ACTIVITY_FETCH', 'NOTIFICATION_QUERIES', { error, userId })
    return []
  }
}