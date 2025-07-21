import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, MessageSquare, Users } from 'lucide-react'
import { getAnalyticsData, getMessageStats, getUserStats, getUsageStats } from '@/lib/queries/analytics'
import { getUserTierAndUsage } from '@/lib/queries/usage'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { uiLogger } from "@/lib/utils/loggers";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  uiLogger.info("ANALYTICS_FETCH_START", "ANALYTICS", { userId: user.id }); // Debug log

  // Fetch real analytics data
  const [analyticsData, messageStats, userStats, usageStats, tierAndUsage] = await Promise.all([
    getAnalyticsData(user.id),
    getMessageStats(user.id),
    getUserStats(user.id),
    getUsageStats(user.id),
    getUserTierAndUsage(user.id)
  ])

  uiLogger.info("ANALYTICS_DATA_FETCHED", "ANALYTICS", { 
    userId: user.id,
    analyticsData, 
    messageStats, 
    userStats, 
    usageStats, 
    tierAndUsage 
  }); // Debug log

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Analytics Dashboard"
        description="Detailed insights into your usage and performance"
        backHref="/dashboard"
        icon={<BarChart3 className="h-5 w-5" />}
      />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.totalMessages)}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {messageStats.messagesThisWeek > 0 ? `${messageStats.messagesThisWeek} this week` : 'No messages this week'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.activeUsers)}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {userStats.newUsersThisWeek} new channels this week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                    <p className="text-2xl font-bold">{analyticsData.responseRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(messageStats.avgMessagesPerDay)} avg per day
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">{analyticsData.avgResponseTime}s</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Optimized performance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Volume</CardTitle>
                <CardDescription>
                  Daily message count over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Chart visualization coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>
                  Performance metrics by communication channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Chart visualization coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of your API usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-info/10 rounded-lg">
                    <h4 className="font-medium text-info-foreground">Tokens Used</h4>
                    <p className="text-2xl font-bold text-info">{formatNumber(usageStats.totalTokens)}</p>
                    <p className="text-sm text-info">
                      {tierAndUsage?.tokens_limit 
                        ? `of ${formatNumber(tierAndUsage.tokens_limit)} limit`
                        : 'No limit set'
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-success/10 rounded-lg">
                    <h4 className="font-medium text-success-foreground">Requests Made</h4>
                    <p className="text-2xl font-bold text-success">{formatNumber(usageStats.totalRequests)}</p>
                    <p className="text-sm text-success">
                      {usageStats.requestsThisWeek > 0 ? `${usageStats.requestsThisWeek} this week` : 'No requests this week'}
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium text-primary-foreground">Success Rate</h4>
                    <p className="text-2xl font-bold text-primary">{usageStats.successRate}%</p>
                    <p className="text-sm text-primary">last 30 days</p>
                  </div>
                </div>
                
                {/* Additional Usage Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Recent Activity</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Today:</span>
                        <span>{usageStats.tokensToday} tokens, {usageStats.requestsToday} requests</span>
                      </div>
                      <div className="flex justify-between">
                        <span>This week:</span>
                        <span>{usageStats.tokensThisWeek} tokens, {usageStats.requestsThisWeek} requests</span>
                      </div>
                      <div className="flex justify-between">
                        <span>This month:</span>
                        <span>{usageStats.tokensThisMonth} tokens, {usageStats.requestsThisMonth} requests</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Avg tokens per request:</span>
                        <span>{usageStats.avgTokensPerRequest.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total conversations:</span>
                        <span>{usageStats.totalConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response efficiency:</span>
                        <span>{analyticsData.responseRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download your analytics data for external analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export functionality will be available soon. You&apos;ll be able to download your data in various formats.
                </p>
                <div className="flex gap-2">
                  <Button disabled>Export CSV</Button>
                  <Button disabled variant="outline">Export JSON</Button>
                  <Button disabled variant="outline">Export PDF Report</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardLayout>
  );
}