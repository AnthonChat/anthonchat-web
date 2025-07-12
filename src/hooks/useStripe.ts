'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function useStripeCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle checkout success/cancel from URL params
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const canceled = searchParams.get('canceled')

    if (sessionId) {
      // Checkout was successful
      console.log('Checkout successful:', sessionId)
      // You could verify the session here if needed
      
      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('session_id')
      router.replace(url.pathname + url.search)
    }

    if (canceled) {
      // Checkout was canceled
      console.log('Checkout canceled')
      
      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      router.replace(url.pathname + url.search)
    }
  }, [searchParams, router])

  const createCheckoutSession = async (tierSlug: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierSlug }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error creating checkout session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createPortalSession = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error creating portal session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelSubscription = async (subscriptionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error canceling subscription:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const reactivateSubscription = async (subscriptionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error reactivating subscription:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    reactivateSubscription,
  }
}