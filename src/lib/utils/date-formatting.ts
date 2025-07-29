import { dateLogger } from '@/lib/utils/loggers'

/**
 * Format a date string consistently for display
 * Uses en-US locale to prevent server/client hydration mismatches
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    dateLogger.error('Date Format Error', 'DATE_FORMAT_ERROR', { error, dateString })
    return 'Invalid Date'
  }
}