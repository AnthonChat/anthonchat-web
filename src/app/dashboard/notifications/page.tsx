import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle, AlertTriangle, Info, Settings, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getUserNotifications, getRecentActivity } from '@/lib/queries/notifications'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch real notifications data
  const [notifications, recentActivity] = await Promise.all([
    getUserNotifications(user.id),
    getRecentActivity(user.id)
  ])

  const getNotificationIcon = (type: string) => {
    switch (type) {
		case 'success':
			return <CheckCircle className="h-5 w-5 text-success" />
		case 'warning':
			return <AlertTriangle className="h-5 w-5 text-warning" />
		case 'error':
			return <AlertTriangle className="h-5 w-5 text-destructive" />
		case 'info':
			return <Info className="h-5 w-5 text-info" />
		default:
			return <Bell className="h-5 w-5 text-muted-foreground" />
	}
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'info':
        return <Badge variant="outline">Info</Badge>
      default:
        return <Badge variant="outline">Notification</Badge>
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
    
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Notifications"
        description={
          <>
            Stay updated with your account activity
            {unreadCount > 0 && (
              <span className="ml-2">
                <Badge variant="warning">{unreadCount} unread</Badge>
              </span>
            )}
          </>
        }
        backHref="/dashboard"
        icon={<Bell className="h-5 w-5" />}
      />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button disabled>Configure Settings (Coming Soon)</Button>
                <Button variant="outline" disabled>Mark All as Read</Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
              <CardDescription>
                Your latest account notifications and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      You&apos;re all caught up! New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Card key={notification.id} className={cn("transition-all hover:shadow-md", !notification.read && "border-info/20 bg-info/5")}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {notification.title}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getNotificationBadge(notification.type)}
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-info rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              {notification.actionUrl && (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={notification.actionUrl} className="flex items-center space-x-1">
                                    <span>View</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Your recent account activity and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent activity to display.</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-info rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Learn about the different types of notifications you may receive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <h4 className="font-medium">Success</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confirmations and successful operations
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h4 className="font-medium">Warnings</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Important alerts and usage warnings
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-info" />
                    <h4 className="font-medium">Information</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Updates, tips, and general information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardLayout>
  );
}