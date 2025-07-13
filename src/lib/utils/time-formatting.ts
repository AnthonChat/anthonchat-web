/**
 * Time-oriented formatting utilities for relative time displays
 */

export interface TimeInfo {
  value: number
  unit: string
  isPast: boolean
  isExpired?: boolean
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid time'
    
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const isPast = diffMs < 0
    const absDiffMs = Math.abs(diffMs)
    
    // Convert to different time units
    const minutes = Math.floor(absDiffMs / (1000 * 60))
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60))
    const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    
    let timeStr = ''
    
    if (months > 0) {
      timeStr = `${months} ${months === 1 ? 'month' : 'months'}`
    } else if (weeks > 0) {
      timeStr = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
    } else if (days > 0) {
      timeStr = `${days} ${days === 1 ? 'day' : 'days'}`
    } else if (hours > 0) {
      timeStr = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    } else if (minutes > 0) {
      timeStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
    } else {
      return isPast ? 'just expired' : 'expires soon'
    }
    
    return isPast ? `${timeStr} ago` : `in ${timeStr}`
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Unknown time'
  }
}

/**
 * Get detailed time information for trial periods
 */
export function getTrialTimeInfo(startDate?: string | null, endDate?: string | null): TimeInfo | null {
  if (!startDate || !endDate) return null
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    
    const totalMs = end.getTime() - start.getTime()
    const remainingMs = end.getTime() - now.getTime()
    const elapsedMs = now.getTime() - start.getTime()
    
    const isExpired = remainingMs <= 0
    const isPast = isExpired
    
    // Use remaining time if not expired, elapsed time if expired
    const relevantMs = isExpired ? Math.abs(remainingMs) : remainingMs
    
    const hours = Math.floor(relevantMs / (1000 * 60 * 60))
    const days = Math.floor(relevantMs / (1000 * 60 * 60 * 24))
    
    if (days > 0) {
      return {
        value: days,
        unit: days === 1 ? 'day' : 'days',
        isPast,
        isExpired
      }
    } else if (hours > 0) {
      return {
        value: hours,
        unit: hours === 1 ? 'hour' : 'hours',
        isPast,
        isExpired
      }
    } else {
      const minutes = Math.floor(relevantMs / (1000 * 60))
      return {
        value: Math.max(1, minutes),
        unit: minutes <= 1 ? 'minute' : 'minutes',
        isPast,
        isExpired
      }
    }
  } catch (error) {
    console.error('Error getting trial time info:', error)
    return null
  }
}

/**
 * Format trial time remaining with more precision
 */
export function formatTrialTimeRemaining(startDate?: string | null, endDate?: string | null): string {
  const timeInfo = getTrialTimeInfo(startDate, endDate)
  
  if (!timeInfo) return 'Unknown'
  
  if (timeInfo.isExpired) {
    return `expired ${timeInfo.value} ${timeInfo.unit} ago`
  }
  
  return `${timeInfo.value} ${timeInfo.unit} remaining`
}

/**
 * Format usage period as relative time range
 */
export function formatUsagePeriod(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Current period'
  
  try {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null
    const now = new Date()
    
    if (isNaN(start.getTime())) return 'Current period'
    
    const startRelative = formatRelativeTime(startDate)
    
    if (end && !isNaN(end.getTime())) {
      const endRelative = formatRelativeTime(endDate)
      return `${startRelative} to ${endRelative}`
    }
    
    return `Started ${startRelative}`
  } catch (error) {
    console.error('Error formatting usage period:', error)
    return 'Current period'
  }
}

/**
 * Get time until next billing cycle
 */
export function formatNextBilling(endDate?: string | null): string {
  if (!endDate) return 'Unknown'
  
  const relative = formatRelativeTime(endDate)
  return `Next billing ${relative}`
}