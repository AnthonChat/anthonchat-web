'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Crown,
  Zap,
  Shield
} from "lucide-react"
import { useRouter } from 'next/navigation'
import { calculateTrialInfo } from "@/lib/utils/trial-calculations"
import { formatTrialTimeRemaining, formatNextBilling, formatUsagePeriod } from "@/lib/utils/time-formatting"
import { loadStripe } from '@stripe/stripe-js'
import { toast } from 'sonner'

interface SubscriptionManagementProps {
  subscription: {
    status: string
    current_period_end?: string
    current_period_start?: string
    cancel_at_period_end?: boolean
    stripe_subscription_id?: string
    tiers?: {
      name: string
      slug: string
      max_tokens?: number
      max_requests?: number
      features?: Record<string, unknown>
    }
  } | null
  userId: string
}

export function SubscriptionManagement({ subscription }: SubscriptionManagementProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const getStatusBadge = () => {
    switch (subscription?.status) {
      case 'trialing':
        return <Badge variant="warning">Trial</Badge>
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      default:
        return <Badge variant="outline">No Subscription</Badge>
    }
  }



  const trialInfo = calculateTrialInfo(subscription)


  const availablePlans = [
    {
      slug: 'basic',
      name: 'Basic Plan',
      price: '$9.99/month',
      features: ['5,000 tokens/month', '200 requests/month', '5 channels', 'Email support'],
      icon: Zap,
      priceId: 'price_1Rk7GGQH21dH2pp3kspgNYXS'
    },
    {
      slug: 'standard',
      name: 'Standard Plan',
      price: '$19.99/month',
      features: ['15,000 tokens/month', '500 requests/month', '10 channels', 'Priority support'],
      icon: Crown,
      priceId: 'price_1Rk7GHQH21dH2pp32TV497AR'
    },
    {
      slug: 'pro',
      name: 'Pro Plan',
      price: '$39.99/month',
      features: ['50,000 tokens/month', '1,500 requests/month', 'Unlimited channels', 'Premium support'],
      icon: Shield,
      priceId: 'price_1Rk7GIQH21dH2pp3tWUoyu6Q'
    }
  ]

  const handleUpgrade = async (planSlug?: string) => {
    if (!planSlug) {
      // Redirect to pricing page for plan selection
      router.push('/pricing')
      return
    }

    const plan = availablePlans.find(p => p.slug === planSlug)
    if (!plan?.priceId) {
      toast.error('Plan configuration error')
      return
    }

    setIsLoading(true)

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          tierSlug: planSlug,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          throw error
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout process')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (errorData.configurationRequired) {
          toast.error('Billing portal is not configured yet. Please contact support for subscription management.')
          return
        }
        
        throw new Error(errorData.message || 'Failed to create billing portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Billing portal error:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      toast.success('Subscription canceled successfully')
      router.refresh()
    } catch (error) {
      console.error('Cancel subscription error:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription')
      }

      toast.success('Subscription reactivated successfully')
      router.refresh()
    } catch (error) {
      console.error('Reactivate subscription error:', error)
      toast.error('Failed to reactivate subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartFreeTrial = async () => {
    // This would typically create a trial subscription
    // For now, redirect to pricing page
    router.push('/pricing')
  }

  return (
    <div className="space-y-6">


      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {subscription?.status === 'trialing' 
                  ? `${subscription?.tiers?.name || 'Free Trial'} (Trial)` 
                  : subscription ? subscription?.tiers?.name || 'Active Subscription' : 'No Active Subscription'
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscription?.status === 'trialing' 
                  ? (trialInfo?.isExpired 
                      ? 'Trial has expired' 
                      : formatTrialTimeRemaining(subscription.current_period_start, subscription.current_period_end)
                    )
                  : subscription ? 'Subscription Plan' : 'No active subscription'
                }
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {subscription.status === 'trialing' ? 'Trial Period' : 'Billing Period'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                   {subscription.status === 'trialing' 
                     ? formatUsagePeriod(subscription.current_period_start, subscription.current_period_end)
                     : formatNextBilling(subscription.current_period_end)
                   }
                 </div>
                {subscription.status === 'trialing' && trialInfo && (
                  <div className="mt-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-info h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(trialInfo.daysPassed / trialInfo.totalDays) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {trialInfo.daysPassed} of {trialInfo.totalDays} trial days used
                    </p>
                  </div>
                )}
              </div>
              
              {subscription.cancel_at_period_end && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be canceled at the end of the current billing period.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {subscription?.tiers?.features && (
            <div>
              <h4 className="font-medium mb-2">Plan Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(() => {
                  try {
                    const features = typeof subscription.tiers.features === 'string' 
                      ? JSON.parse(subscription.tiers.features) 
                      : subscription.tiers.features;
                    const featureList = features?.features || features || [];
                    return featureList.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ));
                  } catch (error) {
                    console.error('Error parsing features:', error);
                    return null;
                  }
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Actions</CardTitle>
          <CardDescription>
            Manage your subscription settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.status === 'trialing' && (
            <Button onClick={() => handleUpgrade()} disabled={isLoading} className="w-full">
              Upgrade to Paid Plan
            </Button>
          )}

          {subscription?.status === 'active' && !subscription.cancel_at_period_end && (
            <div className="space-y-2">
              <Button variant="outline" onClick={() => handleUpgrade()} disabled={isLoading} className="w-full">
                Change Plan
              </Button>
              <Button variant="outline" onClick={handleManageBilling} disabled={isLoading} className="w-full">
                Manage Billing
              </Button>
              <Button variant="destructive" onClick={handleCancelSubscription} disabled={isLoading} className="w-full">
                Cancel Subscription
              </Button>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <Button onClick={handleReactivateSubscription} disabled={isLoading} className="w-full">
              Reactivate Subscription
            </Button>
          )}

          {!subscription && (
            <Button onClick={handleStartFreeTrial} disabled={isLoading} className="w-full">
              Start Free Trial
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      {(!subscription || subscription.status === 'trialing') && (
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Choose the plan that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => {
                const IconComponent = plan.icon
                const isCurrentPlan = subscription?.tiers?.slug === plan.slug
                
                return (
                  <Card key={plan.slug} className={`relative ${isCurrentPlan ? 'ring-2 ring-info' : ''}`}>
                    <CardHeader className="text-center">
                      <div className="mx-auto p-2 bg-info/10 rounded-lg w-fit">
                        <IconComponent className="h-6 w-6 text-info" />
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold">{plan.price}</div>
                      {isCurrentPlan && (
                        <Badge variant="success" className="absolute top-2 right-2">
                          Current
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {!isCurrentPlan && (
                        <Button 
                          onClick={() => handleUpgrade(plan.slug)} 
                          disabled={isLoading}
                          className="w-full"
                        >
                          Select Plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No billing history available</p>
            <p className="text-sm">Billing history will appear here once you have an active subscription</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}