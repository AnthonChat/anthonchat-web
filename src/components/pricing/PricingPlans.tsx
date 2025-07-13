'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Crown, Zap, Shield, Star } from "lucide-react"
import { useStripeCheckout } from '@/hooks/useStripe'

interface PricingPlansProps {
  currentTierSlug?: string
  isAuthenticated?: boolean
}

export function PricingPlans({ currentTierSlug, isAuthenticated = false }: PricingPlansProps) {
  const { createCheckoutSession, isLoading } = useStripeCheckout()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

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
      buttonText: 'Start Free Trial'
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
      buttonText: 'Get Started'
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
      popular: true,
      buttonText: 'Upgrade Now'
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
      buttonText: 'Go Pro'
    }
  ]

  const handleSelectPlan = async (planSlug: string) => {
    if (!isAuthenticated) {
      // Redirect to login/signup
      window.location.href = '/auth/login?redirect=/pricing'
      return
    }

    if (planSlug === 'free') {
      // Free trial doesn't need Stripe checkout
      // This would be handled by the trial creation logic
      return
    }

    setSelectedPlan(planSlug)
    await createCheckoutSession(planSlug)
    setSelectedPlan(null)
  }

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start with our free trial and upgrade when you're ready to scale your messaging automation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const IconComponent = plan.icon
          const isCurrentPlan = currentTierSlug === plan.slug
          const isLoadingThisPlan = isLoading && selectedPlan === plan.slug
          
          return (
            <Card 
              key={plan.slug} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${
                isCurrentPlan ? 'ring-2 ring-green-500' : ''
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

                <Button 
                  onClick={() => handleSelectPlan(plan.slug)}
                  disabled={isCurrentPlan || isLoadingThisPlan}
                  className={`w-full mt-6 ${
                    plan.popular ? 'bg-info hover:bg-info/90' : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {isLoadingThisPlan ? (
                    'Processing...'
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    plan.buttonText
                  )}
                </Button>
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