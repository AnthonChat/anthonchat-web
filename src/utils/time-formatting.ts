import { format, parseISO, isValid, differenceInDays } from 'date-fns'

/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string
 * @param formatString - Date format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatString: string = 'MMM d, yyyy'): string {
  try {
    const date = parseISO(dateString)
    
    if (!isValid(date)) {
      return 'Invalid date'
    }
    
    return format(date, formatString)
  } catch (error) {
    console.error('Date Format Error:', { error, dateString, formatString })
    return 'Invalid date'
  }
}

/**
 * Format usage period for display
 * @param periodStart - Period start date string
 * @param periodEnd - Period end date string
 * @returns Formatted period string
 */
export function formatUsagePeriod(periodStart: string | null, periodEnd: string | null): string {
  try {
    if (!periodStart || !periodEnd) {
      return 'Current period'
    }

    const startDate = parseISO(periodStart)
    const endDate = parseISO(periodEnd)
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return 'Invalid period'
    }

    const startFormatted = format(startDate, 'MMM d')
    const endFormatted = format(endDate, 'MMM d, yyyy')
    
    return `${startFormatted} - ${endFormatted}`
  } catch (error) {
    console.error('Usage Period Format Error:', { error, periodStart, periodEnd })
    return 'Error formatting period'
  }
}

/**
 * Format trial time remaining for display
 * @param trialEnd - Trial end date string
 * @returns Formatted trial time remaining string
 */
export function formatTrialTimeRemaining(trialEnd: string | null): string {
  try {
    if (!trialEnd) {
      return 'No trial'
    }

    const trialEndDate = parseISO(trialEnd)
    
    if (!isValid(trialEndDate)) {
      return 'Invalid trial date'
    }

    const now = new Date()
    const daysRemaining = Math.max(0, differenceInDays(trialEndDate, now))
    
    if (daysRemaining === 0) {
      return 'Trial expired'
    } else if (daysRemaining === 1) {
      return '1 day remaining'
    } else {
      return `${daysRemaining} days remaining`
    }
  } catch (error) {
    console.error('Trial Time Remaining Format Error:', { error, trialEnd })
    return 'Error'
  }
}

/**
 * Format next billing date for display
 * @param nextBillingDate - Next billing date string
 * @returns Formatted next billing date string
 */
export function formatNextBilling(nextBillingDate: string | null): string {
  try {
    if (!nextBillingDate) {
      return 'N/A'
    }

    const billingDate = parseISO(nextBillingDate)
    
    if (!isValid(billingDate)) {
      return 'Invalid date'
    }
    
    return format(billingDate, 'MMM d, yyyy')
  } catch (error) {
    console.error('Next Billing Format Error:', { error, nextBillingDate })
    return 'Error'
  }
}

/**
 * Format billing interval for display (e.g., "monthly", "yearly")
 * @param interval - Billing interval (month, year, etc.)
 * @param intervalCount - Number of intervals
 * @returns Formatted billing interval string
 */
export function formatBillingInterval(interval: string, intervalCount: number = 1): string {
  try {
    if (!interval) {
      return 'Unknown'
    }

    const normalizedInterval = interval.toLowerCase()
    
    if (intervalCount === 1) {
      switch (normalizedInterval) {
        case 'month':
          return 'Monthly'
        case 'year':
          return 'Yearly'
        case 'week':
          return 'Weekly'
        case 'day':
          return 'Daily'
        default:
          return `Every ${normalizedInterval}`
      }
    } else {
      switch (normalizedInterval) {
        case 'month':
          return `Every ${intervalCount} months`
        case 'year':
          return `Every ${intervalCount} years`
        case 'week':
          return `Every ${intervalCount} weeks`
        case 'day':
          return `Every ${intervalCount} days`
        default:
          return `Every ${intervalCount} ${normalizedInterval}s`
      }
    }
  } catch (error) {
    console.error('Billing Interval Format Error:', { error, interval, intervalCount })
    return 'Unknown'
  }
}

/**
 * Format current billing period for display
 * @param periodStart - Period start timestamp (Unix timestamp)
 * @param periodEnd - Period end timestamp (Unix timestamp)
 * @returns Formatted period string
 */
export function formatCurrentBillingPeriod(periodStart: number | null, periodEnd: number | null): string {
  try {
    if (!periodStart || !periodEnd) {
      return 'N/A'
    }

    const startDate = new Date(periodStart * 1000)
    const endDate = new Date(periodEnd * 1000)
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return 'Invalid period'
    }

    const startFormatted = format(startDate, 'MMM d')
    const endFormatted = format(endDate, 'MMM d, yyyy')
    
    return `${startFormatted} - ${endFormatted}`
  } catch (error) {
    console.error('Current Billing Period Format Error:', { error, periodStart, periodEnd })
    return 'Error formatting period'
  }
}