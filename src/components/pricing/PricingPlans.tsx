'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Crown, Zap, Shield, Star } from "lucide-react"
import { loadStripe } from '@stripe/stripe-js'
import { toast } from 'sonner'


interface PricingPlansProps {
  currentTierSlug?: string
  isAuthenticated?: boolean
}

export function PricingPlans({ currentTierSlug, isAuthenticated = false }: PricingPlansProps) {
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Determine which plan should be marked as popular
  // Only mark Standard as popular if user is not authenticated or doesn't have a current plan
  const shouldMarkStandardAsPopular = !isAuthenticated || !currentTierSlug

  const plans = [
    {
      slug: 'free',
      name: 'Free Trial',
      price: '$0',
      period: '14 days',
      description: 'Perfect for trying out our platform',
      features: [
        '1,000 tokens/month',
        '50 requests/month',
        '2 channels',
        'Basic support',
        '14-day trial'
      ],
      icon: Star,
      popular: false,
      buttonText: 'Start Free Trial',
      priceId: null
    },
    {
      slug: 'basic',
      name: 'Basic Plan',
      price: '$9.99',
      period: 'month',
      description: 'Great for individuals and small teams',
      features: [
        '5,000 tokens/month',
        '200 requests/month',
        '5 channels',
        'Email support',
        'Basic analytics'
      ],
      icon: Zap,
      popular: false,
      buttonText: 'Get Started',
      priceId: 'price_1Rk7GGQH21dH2pp3kspgNYXS'
    },
    {
      slug: 'standard',
      name: 'Standard Plan',
      price: '$19.99',
      period: 'month',
      description: 'Perfect for growing businesses',
      features: [
        '15,000 tokens/month',
        '500 requests/month',
        '10 channels',
        'Priority support',
        'Advanced analytics',
        'Custom integrations'
      ],
      icon: Crown,
      popular: shouldMarkStandardAsPopular,
      buttonText: 'Get Started',
      priceId: 'price_1Rk7GHQH21dH2pp32TV497AR'
    },
    {
      slug: 'pro',
      name: 'Pro Plan',
      price: '$39.99',
      period: 'month',
      description: 'For teams that need maximum power',
      features: [
        '50,000 tokens/month',
        '1,500 requests/month',
        'Unlimited channels',
        'Premium support',
        'Advanced analytics',
        'Custom integrations',
        'API access',
        'White-label options'
      ],
      icon: Shield,
      popular: false,
      buttonText: 'Go Pro',
      priceId: 'price_1Rk7GIQH21dH2pp3tWUoyu6Q'
    }
  ]

  const handleSelectPlan = async (planSlug: string) => {
    if (!isAuthenticated) {
      // Redirect to login/signup
      window.location.href = '/auth/login?redirect=/pricing'
      return
    }

    // Define tier hierarchy for validation
    const tierHierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'pro': 3 }
    const currentTierLevel = currentTierSlug ? tierHierarchy[currentTierSlug as keyof typeof tierHierarchy] ?? -1 : -1
    const planTierLevel = tierHierarchy[planSlug as keyof typeof tierHierarchy] ?? -1
    
    // Prevent free trial if user already has a paid plan
    if (planSlug === 'free' && currentTierSlug) {
      toast.error('Free trial is only available for new users')
      return
    }
    
    // Prevent same tier selection
    if (currentTierSlug === planSlug) {
      toast.info('You are already on this plan')
      return
    }
    
    // Handle free trial
    if (planSlug === 'free') {
      toast.info('Free trial setup coming soon!')
      return
    }
    
    // Handle downgrades
    if (currentTierLevel > planTierLevel && currentTierLevel >= 0) {
      toast.info('Please contact support for downgrades')
      return
    }

    const plan = plans.find(p => p.slug === planSlug)
    if (!plan?.priceId) {
      toast.error('Plan configuration error')
      return
    }

    setIsLoading(true)
    setSelectedPlan(planSlug)

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
      setSelectedPlan(null)
    }
  }

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start with our free trial and upgrade when you&apos;re ready to scale your messaging automation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const IconComponent = plan.icon
          const isCurrentPlan = currentTierSlug === plan.slug
          
          
          
          return (
            <Card
              key={plan.slug}
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isCurrentPlan
                  ? 'ring-2 ring-primary scale-105'
                  : plan.popular
                  ? 'ring-2 ring-blue-500 scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-info hover:bg-info/90"
                >
                  Most Popular
                </Badge>
              )}
              
              {isCurrentPlan && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 right-4 bg-success hover:bg-success/90"
                >
                  Current Plan
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-3 bg-info/10 rounded-lg w-fit mb-4">
                  <IconComponent className="h-8 w-8 text-info" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {(() => {
                  // Define tier hierarchy for comparison
                  const tierHierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'pro': 3 }
                  const currentTierLevel = currentTierSlug ? tierHierarchy[currentTierSlug as keyof typeof tierHierarchy] ?? -1 : -1
                  const planTierLevel = tierHierarchy[plan.slug as keyof typeof tierHierarchy] ?? -1
                  
                  // Determine button state
                  const isDowngrade = currentTierLevel > planTierLevel
                  const isSameTier = isCurrentPlan
                  const cannotStartFreeTrial = currentTierSlug && plan.slug === 'free'
                  const isUpgrade = currentTierLevel < planTierLevel && currentTierLevel >= 0
                  
                  let buttonText = plan.buttonText
                  let isDisabled = false
                  let buttonVariant: 'default' | 'outline' | 'secondary' = plan.popular ? 'default' : 'outline'
                  
                  if (isLoading && selectedPlan === plan.slug) {
                    buttonText = 'Processing...'
                    isDisabled = true
                  } else if (isSameTier) {
                    buttonText = 'Current Plan'
                    isDisabled = true
                    buttonVariant = 'secondary'
                  } else if (cannotStartFreeTrial) {
                    buttonText = 'Not Available'
                    isDisabled = true
                    buttonVariant = 'secondary'
                  } else if (isDowngrade) {
                    buttonText = 'Downgrade'
                    buttonVariant = 'outline'
                  } else if (isUpgrade) {
                    buttonText = `Upgrade to ${plan.name}`
                  }
                  
                  return (
                    <Button 
                      onClick={() => handleSelectPlan(plan.slug)}
                      disabled={isDisabled}
                      className={`w-full mt-6 ${
                        plan.popular && !isDisabled ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : ''
                      }`}
                      variant={plan.popular && !isDisabled ? 'default' : buttonVariant}
                    >
                      {buttonText}
                    </Button>
                  )
                })()}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground mb-4">
          All plans include secure data handling, regular backups, and 99.9% uptime guarantee.
        </p>
        <p className="text-sm text-muted-foreground">
          Need a custom solution? <a href="/contact" className="text-blue-600 hover:underline">Contact our sales team</a>
        </p>
      </div>
    </div>
  )
}