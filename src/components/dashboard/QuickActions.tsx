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
    <Card className="hover-lift overflow-hidden relative border-2">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 pointer-events-none" />
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3">
          <div className="p-3 bg-accent rounded-lg shadow-lg">
            <Users className="h-6 w-6 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Quick Actions</span>
        </CardTitle>
        <CardDescription className="text-base font-semibold text-muted-foreground mt-2">
          Common tasks and settings
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => {
            const IconComponent = action.icon
            return (
              <Button
                key={action.id}
                variant={action.id === 'manage-subscription' ? 'default' : 'outline'}
                className={`
                  w-full justify-start h-auto p-5 transition-all duration-300 group border-2
                  ${action.id === 'manage-subscription' 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary' 
                    : 'bg-card hover:bg-accent border-border hover:border-accent text-foreground'
                  }
                `}
                onClick={() => handleAction(action.id)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className={`
                    p-3 rounded-lg transition-all duration-300
                    ${action.id === 'manage-subscription'
                      ? 'bg-primary-foreground/20'
                      : 'bg-accent group-hover:bg-accent'
                    }
                  `}>
                    <IconComponent className={`
                      h-6 w-6 transition-all duration-300
                      ${action.id === 'manage-subscription'
                        ? 'text-primary-foreground'
                        : 'text-accent-foreground group-hover:scale-110'
                      }
                    `} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`
                      font-bold text-lg transition-all duration-300
                      ${action.id === 'manage-subscription'
                        ? 'text-primary-foreground'
                        : 'text-foreground group-hover:text-accent-foreground'
                      }
                    `}>
                      {action.title}
                    </div>
                    <div className={`
                      text-sm font-medium transition-all duration-300
                      ${action.id === 'manage-subscription'
                        ? 'text-primary-foreground/90'
                        : 'text-muted-foreground'
                      }
                    `}>
                      {action.description}
                    </div>
                  </div>

                </div>
              </Button>
            )
          })}
        </div>
        
        <div className="mt-8 pt-6 border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full h-12 text-base font-semibold hover-lift group bg-muted/30 hover:bg-muted/50" 
            onClick={() => handleAction('help')}
          >
            <HelpCircle className="h-5 w-5 mr-3 group-hover:animate-bounce" />
            Need Help?
            <span className="ml-auto text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              24/7 Support
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}