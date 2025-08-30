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
    // Log error removed - using console.error for critical errors
    console.error('Date Format Error:', error, { dateString })
    return 'Invalid Date'
  }
}