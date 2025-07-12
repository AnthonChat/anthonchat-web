'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Settings, 
  CreditCard, 
  MessageSquare, 
  BarChart3, 
  HelpCircle, 
  Download,
  Bell,
  Users
} from "lucide-react"
import { useRouter } from "next/navigation"

interface QuickActionsProps {
  onAction?: (action: string) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const router = useRouter()
  
  const actions = [
    {
      id: 'manage-subscription',
      title: 'Manage Subscription',
      description: 'Update billing and plan',
      icon: CreditCard,
      variant: 'default' as const
    },
    {
      id: 'add-channels',
      title: 'Add Channels',
      description: 'Connect new platforms',
      icon: MessageSquare,
      variant: 'outline' as const
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Detailed usage reports',
      icon: BarChart3,
      variant: 'outline' as const
    },
    {
      id: 'account-settings',
      title: 'Account Settings',
      description: 'Profile and preferences',
      icon: Settings,
      variant: 'outline' as const
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage alerts',
      icon: Bell,
      variant: 'outline' as const
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download your data',
      icon: Download,
      variant: 'outline' as const
    }
  ]
  
  const handleAction = (actionId: string) => {
    if (onAction) {
      onAction(actionId)
      return
    }
    
    // Default behavior with proper routing
    switch (actionId) {
      case 'manage-subscription':
        router.push('/dashboard/subscription')
        break
      case 'add-channels':
        router.push('/dashboard/channels')
        break
      case 'view-analytics':
        router.push('/dashboard/analytics')
        break
      case 'account-settings':
        router.push('/dashboard/settings')
        break
      case 'notifications':
        router.push('/dashboard/notifications')
        break
      case 'export-data':
        // Implement data export functionality
        alert('Data export functionality will be implemented soon')
        break
      case 'help':
        // Open help documentation or support
        window.open('https://docs.anthonchat.com', '_blank')
        break
      default:
        console.log(`Action triggered: ${actionId}`)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => {
            const IconComponent = action.icon
            return (
              <Button
                key={action.id}
                variant={action.variant}
                className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                onClick={() => handleAction(action.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium text-sm">{action.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {action.description}
                </span>
              </Button>
            )
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button variant="ghost" className="w-full" onClick={() => handleAction('help')}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Need Help?
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}