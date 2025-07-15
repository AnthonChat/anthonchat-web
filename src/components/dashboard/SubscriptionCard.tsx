'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Zap, Activity, TrendingUp } from "lucide-react"
import { UsageData } from "@/lib/queries/usage"
import { useRouter } from "next/navigation"
import { formatTrialTimeRemaining } from "@/lib/utils/time-formatting"

interface SubscriptionCardProps {
  subscription: {
    status: string
    current_period_start?: string
    current_period_end?: string
    tiers?: {
      name: string
      slug: string
      max_tokens?: number
      max_requests?: number
    }
  } | null
  usage: UsageData
}

export function SubscriptionCard({ subscription, usage }: SubscriptionCardProps) {
  const router = useRouter()

  const isTrialing = subscription?.status === 'trialing'
  const isActive = subscription?.status === 'active'
  
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
  
  const trialTimeDisplay = formatTrialTimeRemaining(
    subscription?.current_period_start,
    subscription?.current_period_end
  )
  
  const tokensUsagePercent = usage.tokens_limit
    ? (usage.tokens_used / usage.tokens_limit) * 100
    : 0
    
  const requestsUsagePercent = usage.requests_limit
    ? (usage.requests_used / usage.requests_limit) * 100
    : 0
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-destructive"
    if (percent >= 75) return "bg-yellow-500"
    return "bg-primary"
  }

  return (
    <Card className="hover-lift overflow-hidden relative border-2">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-lg shadow-lg">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Subscription Status</span>
            </div>
          </CardTitle>
          <div className="animate-bounce-subtle">
            {getStatusBadge()}
          </div>
        </div>
        <CardDescription className="text-base font-semibold mt-2 text-muted-foreground">
          {subscription?.tiers?.name || 'No active subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        {isTrialing && (
          <div className="flex items-center gap-3 p-4 bg-yellow-100 border-2 border-yellow-500 rounded-xl text-yellow-900 shadow-warning animate-scale-in">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-yellow-900">Trial Period Active</p>
              <p className="text-sm text-yellow-800">{trialTimeDisplay}</p>
            </div>
          </div>
        )}
        
        {usage.tokens_limit && (
          <div className="space-y-4 p-5 bg-card border-2 border-border rounded-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground text-lg">Tokens Used</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-2xl text-foreground">
                  {usage.tokens_used.toLocaleString('en-US')}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  of {usage.tokens_limit.toLocaleString('en-US')}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(tokensUsagePercent)} relative`}
                  style={{ width: `${Math.min(tokensUsagePercent, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {tokensUsagePercent.toFixed(1)}% used
                </span>
                <span className={`text-xs font-medium ${
                  tokensUsagePercent >= 90 ? 'text-red-500' :
                  tokensUsagePercent >= 75 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {tokensUsagePercent >= 90 ? 'Critical' :
                   tokensUsagePercent >= 75 ? 'High' : 'Good'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {usage.requests_limit && (
          <div className="space-y-4 p-5 bg-card border-2 border-border rounded-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Activity className="h-5 w-5 text-secondary-foreground" />
                </div>
                <span className="font-bold text-foreground text-lg">Requests Used</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-2xl text-foreground">
                  {usage.requests_used.toLocaleString('en-US')}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  of {usage.requests_limit.toLocaleString('en-US')}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(requestsUsagePercent)} relative`}
                  style={{ width: `${Math.min(requestsUsagePercent, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {requestsUsagePercent.toFixed(1)}% used
                </span>
                <span className={`text-xs font-medium ${
                  requestsUsagePercent >= 90 ? 'text-red-500' :
                  requestsUsagePercent >= 75 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {requestsUsagePercent >= 90 ? 'Critical' :
                   requestsUsagePercent >= 75 ? 'High' : 'Good'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {!usage.tokens_limit && !usage.requests_limit && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
              <TrendingUp className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">No usage limits configured</p>
            <p className="text-xs mt-1">Contact support to set up usage tracking</p>
          </div>
        )}
        
        {(isTrialing || !subscription) && (
          <div className="pt-6 border-t border-border/50">
            <Button
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:shadow-lg group"
              onClick={() => router.push('/dashboard/subscription')}
            >
              <Zap className="h-5 w-5 mr-2 group-hover:animate-bounce" />
              Upgrade Subscription
            </Button>
          </div>
        )}
        
        {isActive && (
          <div className="pt-6 border-t border-border/50">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-semibold bg-card border-2 border-primary hover:bg-primary/10 text-foreground transition-all duration-300 hover:shadow-lg group"
              onClick={() => router.push('/dashboard/subscription')}
            >
              <TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Manage Subscription
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}