'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Crown,
  Zap,
  Shield,
  Gift,
  Clock,
  Star,
  Rocket,
  RefreshCw
} from "lucide-react"
import { calculateTrialInfo } from "@/lib/utils/trial-calculations";
import { formatTrialTimeRemaining, formatNextBilling, formatUsagePeriod, formatCurrentBillingPeriod, formatBillingInterval } from "@/lib/utils/time-formatting";
import { cn } from "@/lib/utils";

// Stripe imports
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { UserSubscription, SubscriptionPlan } from "@/lib/queries"; // Remove getAvailablePlans import

import { SubscriptionManagementSkeleton, LoadingWrapper } from "@/components/ui/loading";
import { uiLogger } from "@/lib/logging/loggers";

interface SubscriptionManagementProps {
  subscription: UserSubscription | null
  isLoading?: boolean
  onRefresh?: () => void
}

export function SubscriptionManagement({ subscription, isLoading = false, onRefresh }: SubscriptionManagementProps) {
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)

  useEffect(() => {
    async function fetchPlans() {
      setPlansLoading(true)
      try {
        const response = await fetch('/api/plans')
        if (!response.ok) {
          throw new Error(`Failed to fetch plans: ${response.status} ${response.statusText}`)
        }
        const plans = await response.json()
        setAvailablePlans(plans)
      } catch (error) {
        uiLogger.error('Failed to fetch plans', new Error('SUBSCRIPTION_MANAGEMENT'), { error });
        toast.error('Could not load subscription plans.')
      } finally {
        setPlansLoading(false)
      }
    }

    fetchPlans()
  }, [])




  return (
    <LoadingWrapper
      isLoading={isLoading || plansLoading}
      skeleton={<SubscriptionManagementSkeleton />}
    >
      <SubscriptionManagementContent 
        subscription={subscription} 
        availablePlans={availablePlans}
        isActionLoading={isActionLoading}
        setIsActionLoading={setIsActionLoading}
        plansLoading={plansLoading}
        isYearly={isYearly}
        setIsYearly={setIsYearly}
        onRefresh={onRefresh}
      />
    </LoadingWrapper>
  )
}

function SubscriptionManagementContent({ 
  subscription, 
  availablePlans,
  isActionLoading, 
  setIsActionLoading, 
  plansLoading,
  isYearly,
  setIsYearly,
  onRefresh
}: {
  subscription: UserSubscription | null;
  availablePlans: SubscriptionPlan[];
  isActionLoading: boolean;
  setIsActionLoading: (loading: boolean) => void;
  plansLoading: boolean;
  isYearly: boolean;
  setIsYearly: (isYearly: boolean) => void;
  onRefresh?: () => void;
}) {
  const trialInfo = calculateTrialInfo({
    status: subscription?.status || '',
    current_period_start: subscription?.current_period_start 
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : undefined,
    current_period_end: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : undefined
  })

  const nextBillingDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const activePlan = {
    name: subscription?.product?.name ?? 'No active plan',
    features: [
      `Tokens: ${subscription?.features?.tokens_limit ? subscription.features.tokens_limit.toLocaleString() : 'N/A'} per month`,
      `Requests: ${subscription?.features?.requests_limit ? subscription.features.requests_limit.toLocaleString() : 'N/A'} per month`,
      `History: ${subscription?.features?.history_limit ?? 'N/A'} days`,
    ],
  };

  // Trial configuration based on product metadata
  const isPlanEligibleForTrial = (plan: SubscriptionPlan) => {
    // Check if the product has free_trial metadata
    const freeTrialDays = plan.metadata?.free_trial;
    return freeTrialDays && !isNaN(Number(freeTrialDays)) && Number(freeTrialDays) > 0;
  }
  
  const getTrialDaysForPlan = (plan: SubscriptionPlan) => {
    if (!isPlanEligibleForTrial(plan)) return 0;
    
    const freeTrialDays = plan.metadata?.free_trial;
    return Number(freeTrialDays) || 0;
  }

  const handleUpgrade = async (planSlug?: string) => {
    if (!planSlug) {
      // Error
      return
    }

    const plan = availablePlans.find(p => p.metadata?.slug === planSlug);
    const selectedInterval = isYearly ? 'year' : 'month';
    const price = plan?.prices.find(p => p.recurring?.interval === selectedInterval);
    
    if (!price?.id) {
      toast.error('Plan configuration error - selected billing interval not available')
      return
    }

    setIsActionLoading(true)

    try {
      const trialDays = plan ? getTrialDaysForPlan(plan) : 0
      const isStartingTrial = !subscription || subscription.status !== 'active'
      const shouldOfferTrial = isStartingTrial && trialDays > 0
      
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: price.id,
          tierSlug: planSlug,
          trial_period_days: shouldOfferTrial ? trialDays : undefined
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
      uiLogger.error('CHECKOUT_ERROR', new Error('SUBSCRIPTION_MANAGEMENT'), { error, planSlug });
      toast.error('Failed to start checkout process')
    } finally {
        setIsActionLoading(false)
      }
  }

  return (
    <div className="space-y-6">


      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 px-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  {subscription?.status === 'trialing' 
                    ? `${subscription?.product?.name || 'Free Trial'}` 
                    : subscription ? subscription?.product?.name || 'Active Subscription' : 'No Active Subscription'
                  }
                </h3>
                {subscription?.status === 'trialing' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 shadow-sm">
                    <Gift className="h-3 w-3 mr-1" />
                    Trial
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {subscription?.status === 'trialing' 
                  ? (trialInfo?.isExpired 
                      ? 'Trial has expired' 
                      : formatTrialTimeRemaining(
                          subscription.trial_end
                            ? new Date((subscription.trial_end as number) * 1000).toISOString()
                            : null
                        )
                    )
                  : subscription ? 'Subscription Plan' : 'No active subscription'
                }
              </p>
            </div>
            {subscription?.status === 'trialing' && trialInfo && !trialInfo.isExpired && (
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {trialInfo.daysRemaining}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  days left
                </div>
              </div>
            )}
          </div>

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {subscription.status === 'trialing' ? 'Trial Period' : 'Billing Information'}
                  </span>
                </div>
                
                {subscription.status === 'trialing' ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
                      {formatUsagePeriod(
                        subscription.current_period_start 
                          ? new Date(subscription.current_period_start * 1000).toISOString()
                          : null,
                        subscription.current_period_end
                          ? new Date(subscription.current_period_end * 1000).toISOString()
                          : null
                      )}
                    </div>
                    {trialInfo && (
                        <div className="space-y-4 bg-primary/5 rounded-xl p-4 border border-primary/20">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Trial Progress</span>
                            <span className="font-semibold text-foreground">
                              {trialInfo.daysPassed} of {trialInfo.totalDays} days
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-4 overflow-hidden shadow-inner">
                            <div 
                              className="h-4 rounded-full transition-all duration-700 ease-out bg-primary shadow-sm" 
                              style={{ width: `${Math.min((trialInfo.daysPassed / trialInfo.totalDays) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">Started {trialInfo.daysPassed} days ago</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-primary font-semibold">
                              <Gift className="h-3.5 w-3.5" />
                              <span>{trialInfo.daysRemaining} days remaining</span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Billing Cycle
                        </span>
                        <span className="text-sm font-medium">
                          {formatBillingInterval(subscription.billing_interval || 'month', subscription.billing_interval_count || 1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Current Period
                        </span>
                        <span className="text-sm">
                          {formatCurrentBillingPeriod(subscription.current_period_start, subscription.current_period_end)}
                        </span>
                      </div>
                      
                      {nextBillingDate && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Next Billing
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {formatNextBilling(nextBillingDate)}
                          </span>
                        </div>
                      )}
                    </div>
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

          {subscription?.features && (
            <div>
              <h4 className="font-medium mb-2">Plan Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Available Plans */}
      {(!subscription || subscription.status === 'trialing') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  Choose the plan that best fits your needs
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={!isYearly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsYearly(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={isYearly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsYearly(true)}
                    className="h-8 px-3 text-xs"
                  >
                    Yearly
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plansLoading ? (
                <div className="text-center text-muted-foreground">Loading plans...</div>
              ) : (
                availablePlans
                  .sort((a, b) => {
                    // Sort plans by price for the selected billing interval
                    const selectedInterval = isYearly ? 'year' : 'month';
                    const priceA = a.prices.find(p => p.recurring?.interval === selectedInterval)?.unit_amount || 0;
                    const priceB = b.prices.find(p => p.recurring?.interval === selectedInterval)?.unit_amount || 0;
                    
                    // Handle free plans (price = 0) - put them first
                    if (priceA === 0 && priceB === 0) return 0;
                    if (priceA === 0) return -1;
                    if (priceB === 0) return 1;
                    
                    // Sort by price ascending (lowest to highest)
                    return priceA - priceB;
                  })
                  .map((plan) => {
                  // Plan-specific icons and colors
                  const planName = plan.name?.toLowerCase() || ''
                  let IconComponent, iconColor, iconBgColor
                  
                  if (planName.includes('basic')) {
                    IconComponent = Star
                    iconColor = 'text-blue-600'
                    iconBgColor = 'bg-blue-50'
                  } else if (planName.includes('standard')) {
                    IconComponent = Crown
                    iconColor = 'text-orange-600'
                    iconBgColor = 'bg-orange-50'
                  } else if (planName.includes('pro')) {
                    IconComponent = Rocket
                    iconColor = 'text-purple-600'
                    iconBgColor = 'bg-purple-50'
                  } else {
                    IconComponent = Zap
                    iconColor = 'text-gray-600'
                    iconBgColor = 'bg-gray-50'
                  }
                  
                  const productMetadata = subscription?.product?.metadata as Record<string, unknown> | null
                  const productSlug = productMetadata?.slug as string | undefined
                  const isCurrentPlan = productSlug === plan.metadata?.slug
                  const trialDays = getTrialDaysForPlan(plan)
                  const isEligibleForTrial = (!subscription || subscription.status !== 'active') && trialDays > 0
                  
                  // Get the price for the selected billing interval
                  const selectedInterval = isYearly ? 'year' : 'month';
                  const selectedPrice = plan.prices.find(p => p.recurring?.interval === selectedInterval);
                  const monthlyPrice = plan.prices.find(p => p.recurring?.interval === 'month');
                  const yearlyPrice = plan.prices.find(p => p.recurring?.interval === 'year');
                  
                  // Calculate savings for yearly billing
                  const monthlyCost = monthlyPrice?.unit_amount ? monthlyPrice.unit_amount / 100 : 0;
                  const yearlyCost = yearlyPrice?.unit_amount ? yearlyPrice.unit_amount / 100 : 0;
                  const yearlyMonthlyCost = yearlyCost / 12;
                  const savings = monthlyCost > 0 && yearlyMonthlyCost > 0 ? ((monthlyCost - yearlyMonthlyCost) / monthlyCost) * 100 : 0;
                  
                  return (
                    <Card key={plan.id} className={cn(
                      "relative overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col h-full",
                      isCurrentPlan 
                        ? "ring-2 ring-primary shadow-lg" 
                        : "hover:shadow-md border-border/50"
                    )}>
                      {isCurrentPlan && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                          Current Plan
                        </div>
                      )}
                      
                      {/* Trial Badge for eligible users */}
                      {isEligibleForTrial && !isCurrentPlan && (
                        <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-br-lg shadow-md">
                          <Gift className="h-3 w-3 inline mr-1" />
                          {trialDays}-day free trial
                        </div>
                      )}

                      <CardHeader className="text-center">
                        <div className={cn("mx-auto p-3 rounded-lg w-fit", iconBgColor)}>
                          <IconComponent className={cn("h-6 w-6", iconColor)} />
                        </div>
                        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-3xl font-bold">
                            {selectedPrice?.unit_amount ? `$${(selectedPrice.unit_amount / 100).toFixed(2)}` : 'Contact us'}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{selectedPrice?.recurring?.interval}
                            </span>
                          </div>
                          {isYearly && selectedPrice?.unit_amount && monthlyPrice?.unit_amount && (
                            <div className="text-xs text-muted-foreground">
                              ${(selectedPrice.unit_amount / 100 / 12).toFixed(2)}/month billed yearly
                            </div>
                          )}
                          {isYearly && savings > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              Save {savings.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        {plan.metadata?.popular && (
                          <Badge variant="default" className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-purple-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col">
                        {/* Enhanced feature list based on plan */}
                        <div className="space-y-3 flex-1">
                          {plan.description && (
                            <p className="text-sm text-muted-foreground">
                              {plan.description}
                            </p>
                          )}
                          
                          <ul className="space-y-2">
                            {(() => {
                              const planName = plan.name?.toLowerCase() || ''
                              const features = []
                              
                              if (planName.includes('basic')) {
                                features.push(
                                  'Essential AI features',
                                  'Basic chat support',
                                  'Standard response time',
                                  'Email support'
                                )
                              } else if (planName.includes('standard')) {
                                features.push(
                                  'Advanced AI features',
                                  'Priority chat support',
                                  'Faster response time',
                                  'Email & chat support',
                                  'Advanced analytics'
                                )
                              } else if (planName.includes('pro')) {
                                features.push(
                                  'Premium AI features',
                                  'Priority support',
                                  'Fastest response time',
                                  '24/7 support',
                                  'Advanced analytics',
                                  'Custom integrations'
                                )
                              } else {
                                // Fallback to description split or default features
                                const descFeatures = plan.description?.split(', ') || [
                                  'All features included',
                                  'Premium support',
                                  'Advanced capabilities'
                                ]
                                features.push(...descFeatures)
                              }
                              
                              return features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))
                            })()}
                          </ul>
                        </div>

                        {/* Trial Information */}
                        {isEligibleForTrial && !isCurrentPlan && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-primary/20 rounded-full">
                                <Gift className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                Start with {trialDays}-day free trial
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              No payment required to start. Cancel anytime during trial period.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex items-center gap-1 text-xs text-success">
                                <CheckCircle className="h-3 w-3" />
                                <span className="font-medium">Full access</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-info">
                                <Shield className="h-3 w-3" />
                                <span className="font-medium">No commitment</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Button - Always at bottom */}
                        <div className="mt-auto pt-4">
                          {!isCurrentPlan && selectedPrice && (
                            <Button 
                              onClick={() => handleUpgrade(plan.metadata?.slug)} 
                              disabled={isActionLoading}
                              className={cn(
                                "w-full transition-all duration-200",
                                isEligibleForTrial 
                                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl" 
                                  : ""
                              )}
                              size="lg"
                            >
                              {isEligibleForTrial ? (
                                <>
                                  <Gift className="h-4 w-4 mr-2" />
                                  Start Free Trial
                                </>
                              ) : (
                                'Upgrade to Plan'
                              )}
                            </Button>
                          )}
                          
                          {isCurrentPlan && (
                            <Button 
                              variant="outline" 
                              className="w-full" 
                              disabled
                              size="lg"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Current Plan
                            </Button>
                          )}
                          
                          {!selectedPrice && (
                            <Button 
                              variant="outline"
                              disabled
                              className="w-full"
                              size="lg"
                            >
                              Not available for {isYearly ? 'yearly' : 'monthly'} billing
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
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