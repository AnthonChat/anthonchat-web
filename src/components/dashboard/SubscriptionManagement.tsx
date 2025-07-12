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
  ArrowLeft,
  Crown,
  Zap,
  Shield
} from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
      features?: any
    }
  } | null
  userId: string
}

export function SubscriptionManagement({ subscription, userId }: SubscriptionManagementProps) {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getTrialInfo = () => {
    if (subscription?.status !== 'trialing' || !subscription.current_period_end) {
      return null
    }
    
    const now = new Date()
    const trialEnd = new Date(subscription.current_period_end)
    const trialStart = new Date(subscription.current_period_start || now)
    
    const totalTrialDays = Math.ceil((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = totalTrialDays - daysRemaining
    
    return {
      daysRemaining: Math.max(0, daysRemaining),
      daysPassed: Math.max(0, daysPassed),
      totalDays: totalTrialDays,
      isExpired: daysRemaining <= 0
    }
  }

  const trialInfo = getTrialInfo()

  const handleUpgrade = async (tierSlug?: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tierSlug: tierSlug || 'basic' 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartFreeTrial = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (data.error === 'User already has a subscription') {
          alert('You already have an active subscription or trial!')
        } else {
          throw new Error(data.error || 'Failed to start free trial')
        }
        return
      }
      
      alert('Free trial started successfully! Redirecting to dashboard...')
      // Redirect to dashboard to see the updated subscription status
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error starting free trial:', error)
      alert('Failed to start free trial. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    if (!subscription?.stripe_subscription_id) {
      alert('No active subscription found')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionId: subscription.stripe_subscription_id 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }
      
      alert('Subscription canceled successfully. You will retain access until the end of your billing period.')
      router.refresh()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) {
      alert('No subscription found to reactivate')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionId: subscription.stripe_subscription_id 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription')
      }
      
      alert('Subscription reactivated successfully!')
      router.refresh()
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      alert('Failed to reactivate subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsLoading(true)
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
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const availablePlans = [
    {
      slug: 'basic',
      name: 'Basic Plan',
      price: '$9.99/month',
      features: ['5,000 tokens/month', '200 requests/month', '5 channels', 'Email support'],
      icon: Zap
    },
    {
      slug: 'standard',
      name: 'Standard Plan',
      price: '$19.99/month',
      features: ['15,000 tokens/month', '500 requests/month', '10 channels', 'Priority support'],
      icon: Crown
    },
    {
      slug: 'pro',
      name: 'Pro Plan',
      price: '$39.99/month',
      features: ['50,000 tokens/month', '1,500 requests/month', 'Unlimited channels', 'Premium support'],
      icon: Shield
    }
  ]

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

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
                      : `${trialInfo?.daysRemaining} days remaining • ${trialInfo?.daysPassed} days used`
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
                <p className="text-sm text-muted-foreground">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </p>
                {subscription.status === 'trialing' && trialInfo && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
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
                  <Card key={plan.slug} className={`relative ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardHeader className="text-center">
                      <div className="mx-auto p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit">
                        <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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