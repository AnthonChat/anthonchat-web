'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Clock, Zap, MessageSquare, TrendingUp } from "lucide-react"
import { UsageData } from "@/lib/queries/usage"
import { useRouter } from "next/navigation"

interface SubscriptionCardProps {
  subscription: {
    status: string
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
  
  const getTrialTimeRemaining = () => {
    if (!subscription?.current_period_end) return null
    
    const endDate = new Date(subscription.current_period_end)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }
  
  const tokensUsagePercent = usage.tokens_limit 
    ? (usage.tokens_used / usage.tokens_limit) * 100
    : 0
    
  const requestsUsagePercent = usage.requests_limit
    ? (usage.requests_used / usage.requests_limit) * 100
    : 0
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500"
    if (percent >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {subscription?.tiers?.name || 'No active subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrialing && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Trial expires in {getTrialTimeRemaining()} days
            </span>
          </div>
        )}
        
        {usage.tokens_limit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Tokens Used
              </span>
              <span className="font-medium">
                {usage.tokens_used.toLocaleString()} / {usage.tokens_limit.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <Progress value={tokensUsagePercent} className="h-2" />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(tokensUsagePercent)}`}
                style={{ width: `${Math.min(tokensUsagePercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {tokensUsagePercent.toFixed(1)}% used
            </div>
          </div>
        )}
        
        {usage.requests_limit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Requests Used
              </span>
              <span className="font-medium">
                {usage.requests_used.toLocaleString()} / {usage.requests_limit.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <Progress value={requestsUsagePercent} className="h-2" />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(requestsUsagePercent)}`}
                style={{ width: `${Math.min(requestsUsagePercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {requestsUsagePercent.toFixed(1)}% used
            </div>
          </div>
        )}
        
        {!usage.tokens_limit && !usage.requests_limit && (
          <div className="text-center py-4 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No usage limits set</p>
          </div>
        )}
        
        {(isTrialing || !subscription) && (
          <div className="pt-4 border-t">
            <Button 
              className="w-full"
              onClick={() => router.push('/dashboard/subscription')}
            >
              Upgrade Subscription
            </Button>
          </div>
        )}
        
        {isActive && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/subscription')}
            >
              Manage Subscription
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}