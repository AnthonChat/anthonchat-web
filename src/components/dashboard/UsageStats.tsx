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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Analytics
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatPeriod()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  warning.level === 'critical' 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <AlertTriangle className={`h-4 w-4 ${
                  warning.level === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <span className={`text-sm ${
                  warning.level === 'critical' 
                    ? 'text-red-800 dark:text-red-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {warning.message}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tokens Usage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium">Tokens</span>
              </div>
              {usage.tokens_limit && (
                <Badge variant={tokensPercent >= 90 ? 'destructive' : tokensPercent >= 75 ? 'warning' : 'success'}>
                  {tokensPercent.toFixed(1)}%
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {usage.tokens_used.toLocaleString('en-US')}
              </div>
              
              {usage.tokens_limit ? (
                <>
                  <Progress value={tokensPercent} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Used: {usage.tokens_used.toLocaleString('en-US')}</span>
                <span>Limit: {usage.tokens_limit.toLocaleString('en-US')}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No limit set
                </div>
              )}
            </div>
          </div>
          
          {/* Requests Usage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium">Requests</span>
              </div>
              {usage.requests_limit && (
                <Badge variant={requestsPercent >= 90 ? 'destructive' : requestsPercent >= 75 ? 'warning' : 'success'}>
                  {requestsPercent.toFixed(1)}%
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {usage.requests_used.toLocaleString('en-US')}
              </div>
              
              {usage.requests_limit ? (
                <>
                  <Progress value={requestsPercent} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Used: {usage.requests_used.toLocaleString('en-US')}</span>
                <span>Limit: {usage.requests_limit.toLocaleString('en-US')}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No limit set
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Usage Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Usage resets monthly on the 1st</span>
          </div>
          {(usage.tokens_limit || usage.requests_limit) && (
            <div className="mt-2 text-xs text-muted-foreground">
              Limits are based on your current subscription tier
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}