import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bell, CheckCircle, AlertTriangle, Info, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Mock notifications data
  const notifications = [
    {
      id: '1',
      type: 'success',
      title: 'Channel Connected Successfully',
      message: 'Your WhatsApp channel has been connected and is ready to use.',
      timestamp: '2 hours ago',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Usage Limit Warning',
      message: 'You have used 85% of your monthly token limit.',
      timestamp: '1 day ago',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: 'New Feature Available',
      message: 'Advanced analytics dashboard is now available in your account.',
      timestamp: '3 days ago',
      read: true
    },
    {
      id: '4',
      type: 'success',
      title: 'Payment Processed',
      message: 'Your subscription payment has been processed successfully.',
      timestamp: '1 week ago',
      read: true
    }
  ]

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'info':
        return <Badge variant="outline">Info</Badge>
      default:
        return <Badge variant="outline">Notification</Badge>
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay updated with your account activity
                {unreadCount > 0 && (
                  <span className="ml-2">
                    <Badge variant="warning">{unreadCount} unread</Badge>
                  </span>
                )}
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      !notification.read 
                        ? 'bg-info/10 border-info/20'
                : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${
                          !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        {getNotificationBadge(notification.type)}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-info rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {notification.timestamp}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="ghost" size="sm" disabled>
                        Mark as Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {notifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              )}
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
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium">Success</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confirmations and successful operations
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium">Warnings</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Important alerts and usage warnings
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-blue-600" />
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
    </div>
  );
}