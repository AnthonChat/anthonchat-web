/**
 * Utility functions for consistent trial period calculations
 * Now enhanced with time-oriented information
 */

export interface TrialInfo {
  daysRemaining: number
  daysPassed: number
  totalDays: number
  isExpired: boolean
  hoursRemaining?: number
  minutesRemaining?: number
  timeUntilExpiry?: string
}

export interface SubscriptionData {
  status: string
  current_period_start?: string
  current_period_end?: string
}

/**
 * Calculate trial information with consistent logic
 * Uses Math.floor for elapsed days and Math.ceil for total days
 * to ensure daysPassed + daysRemaining <= totalDays
 */
export function calculateTrialInfo(subscription: SubscriptionData | null): TrialInfo | null {
  if (
    !subscription ||
    subscription.status !== 'trialing' ||
    !subscription.current_period_end ||
    !subscription.current_period_start
  ) {
    return null
  }

  const now = new Date()
  const trialEnd = new Date(subscription.current_period_end)
  const trialStart = new Date(subscription.current_period_start)

  // Validate dates
  if (isNaN(trialEnd.getTime()) || isNaN(trialStart.getTime())) {
    return null
  }

  // Calculate total trial duration in milliseconds
  const totalTrialMs = trialEnd.getTime() - trialStart.getTime()
  const totalTrialDays = Math.ceil(totalTrialMs / (1000 * 60 * 60 * 24))

  // Calculate elapsed time in milliseconds
  const elapsedMs = now.getTime() - trialStart.getTime()
  const daysPassed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))

  // Calculate remaining days
  const daysRemaining = Math.max(0, totalTrialDays - daysPassed)
  
  // Calculate more precise time remaining
  const remainingMs = Math.max(0, trialEnd.getTime() - now.getTime())
  const hoursRemaining = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
  
  // Create human-readable time until expiry
  let timeUntilExpiry = ''
  if (daysRemaining > 0) {
    timeUntilExpiry = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`
    if (daysRemaining === 1 && hoursRemaining > 0) {
      timeUntilExpiry += ` and ${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`
    }
  } else if (hoursRemaining > 0) {
    timeUntilExpiry = `${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`
  } else if (minutesRemaining > 0) {
    timeUntilExpiry = `${minutesRemaining} ${minutesRemaining === 1 ? 'minute' : 'minutes'}`
  } else {
    timeUntilExpiry = 'less than a minute'
  }

  return {
    daysRemaining,
    daysPassed,
    totalDays: totalTrialDays,
    isExpired: daysRemaining <= 0,
    hoursRemaining,
    minutesRemaining,
    timeUntilExpiry
  }
}