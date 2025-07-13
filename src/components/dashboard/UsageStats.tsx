import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, MessageSquare, Zap, Calendar, AlertTriangle } from "lucide-react"
import { UsageData } from "@/lib/queries/usage"
import { formatMonthYear } from "@/lib/utils/date-formatting"
import { formatRelativeTime } from "@/lib/utils/time-formatting"

interface UsageStatsProps {
  usage: UsageData
  warnings?: Array<{
    type: string
    level: string
    message: string
  }>
}

export function UsageStats({ usage, warnings = [] }: UsageStatsProps) {
  const tokensPercent = usage.tokens_limit 
    ? (usage.tokens_used / usage.tokens_limit) * 100 
    : 0
    
  const requestsPercent = usage.requests_limit 
    ? (usage.requests_used / usage.requests_limit) * 100 
    : 0
  
  const formatPeriod = () => {
    if (usage.period_start) {
      const relativeTime = formatRelativeTime(usage.period_start)
      return `Period started ${relativeTime}`
    }
    return 'Current period'
  }
  

  
  return (
    <Card className="hover-lift overflow-hidden relative border-2">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-2/10 pointer-events-none" />
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-chart-1 to-chart-2 rounded-lg shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Usage Analytics</span>
        </CardTitle>
        <CardDescription className="text-base font-semibold text-muted-foreground">
          Track your API usage and limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 relative">
        {/* Usage Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-4">
            {warnings.map((warning, index) => (
              <div 
                key={index}
                className={`
                  p-5 rounded-xl border-2 animate-scale-in
                  ${warning.type === 'critical' 
                    ? 'bg-destructive/10 border-destructive text-destructive-foreground' 
                    : 'bg-yellow-50 border-yellow-400 text-yellow-900'
                  }
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-2 rounded-lg
                    ${warning.type === 'critical' 
                      ? 'bg-destructive' 
                      : 'bg-yellow-500'
                    }
                  `}>
                    <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold text-base ${
                      warning.type === 'critical' ? 'text-destructive' : 'text-yellow-800'
                    }`}>
                      {warning.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tokens Usage */}
          <div className="space-y-5 p-6 bg-card border-2 border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-chart-1 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-foreground">Tokens Usage</h3>
              </div>
              {usage.tokens_limit && (
                <div className="animate-bounce-subtle">
                  <Badge 
                    variant={tokensPercent >= 90 ? 'destructive' : tokensPercent >= 75 ? 'warning' : 'success'}
                    className="font-bold text-lg px-3 py-1"
                  >
                    {tokensPercent.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-chart-1 animate-fade-in">
                {usage.tokens_used.toLocaleString('en-US')}
              </div>
              {usage.tokens_limit && (
                <div className="text-base font-medium text-muted-foreground mt-2">
                  of {usage.tokens_limit.toLocaleString('en-US')} tokens
                </div>
              )}
            </div>
            
            {usage.tokens_limit ? (
              <div className="space-y-3">
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Progress</span>
                  <span className="text-chart-1">{tokensPercent.toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={tokensPercent} 
                    className="h-4 animate-pulse"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-medium text-center">
                ∞ Unlimited usage
              </div>
            )}
          </div>
          
          {/* Requests Usage */}
          <div className="space-y-5 p-6 bg-card border-2 border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-chart-2 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-foreground">Requests Usage</h3>
              </div>
              {usage.requests_limit && (
                <div className="animate-bounce-subtle">
                  <Badge 
                    variant={requestsPercent >= 90 ? 'destructive' : requestsPercent >= 75 ? 'warning' : 'success'}
                    className="font-bold text-lg px-3 py-1"
                  >
                    {requestsPercent.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-chart-2 animate-fade-in">
                {usage.requests_used.toLocaleString('en-US')}
              </div>
              {usage.requests_limit && (
                <div className="text-base font-medium text-muted-foreground mt-2">
                  of {usage.requests_limit.toLocaleString('en-US')} requests
                </div>
              )}
            </div>
            
            {usage.requests_limit ? (
              <div className="space-y-3">
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Progress</span>
                  <span className="text-chart-2">{requestsPercent.toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={requestsPercent} 
                    className="h-4 animate-pulse [&>*]:bg-chart-2"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-medium text-center">
                ∞ Unlimited usage
              </div>
            )}
          </div>
        </div>
        
        {/* Usage Info */}
        <div className="mt-8 p-6 bg-card border-2 border-border rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-lg">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-xl text-foreground">
                Usage Information
              </div>
              <div className="text-base font-medium text-muted-foreground mt-3 space-y-2">
                <div>Usage resets monthly on the 1st</div>
                {(usage.tokens_limit || usage.requests_limit) && (
                  <div>Limits are based on your current subscription tier</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}