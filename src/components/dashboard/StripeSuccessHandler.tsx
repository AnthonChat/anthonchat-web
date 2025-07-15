'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function StripeSuccessHandler() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      toast.success('Payment successful! Your subscription has been activated.')
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
    }
    
    if (canceled === 'true') {
      toast.info('Payment was canceled. You can try again anytime.')
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])
  
  return null
}