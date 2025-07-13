/**
 * Utility functions for consistent date formatting across the application
 * Prevents hydration mismatches by using consistent locale settings
 */

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
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

/**
 * Format a date string with time consistently
 * Uses en-US locale to prevent server/client hydration mismatches
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting date time:', error)
    return 'Invalid Date'
  }
}

/**
 * Format time consistently for logs
 * Uses en-US locale to prevent server/client hydration mismatches
 */
export function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format a date for month/year display (e.g., "January 2024")
 * Uses en-US locale to prevent server/client hydration mismatches
 */
export function formatMonthYear(dateString?: string | null): string {
  if (!dateString) return 'Current Period'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting month/year:', error)
    return 'Invalid Date'
  }
}