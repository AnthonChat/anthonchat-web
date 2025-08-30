'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocaleRouter } from '@/hooks/use-locale-router'
import { toast } from 'sonner'

export function StripeSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useLocaleRouter()
  
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      toast.success('Payment successful! Your subscription has been activated.')
      
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      const cleanUrl = url.toString()
      
      // Replace the URL without the success parameter
      window.history.replaceState({}, '', cleanUrl)
      
      // Refresh the page to get the latest subscription data
      // We use a small delay to ensure the webhook has been processed
      setTimeout(() => {
        router.refresh()
      }, 2000)
    }
    
    if (canceled === 'true') {
      toast.info('Payment was canceled. You can try again anytime.')
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, router])
  
  return null
}