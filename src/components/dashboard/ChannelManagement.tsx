'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  MessageCircle, 
  Phone, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus,
  Settings,
  Trash2,
  Edit
} from "lucide-react"
import { useRouter } from 'next/navigation'

interface Channel {
  id: string
  link: string
  verified_at: string | null
  channels: {
    id: string
    link_method: string
    is_active: boolean
  }
}

interface ChannelManagementProps {
  channels: Channel[]
}

export function ChannelManagement({ channels }: ChannelManagementProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const getChannelIcon = (channelId: string) => {
    switch (channelId.toLowerCase()) {
      case 'whatsapp':
        return <Phone className="h-5 w-5" />
      case 'telegram':
        return <MessageCircle className="h-5 w-5" />
      default:
        return <MessageCircle className="h-5 w-5" />
    }
  }
  
  const getStatusIcon = (status: string = 'connected') => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }
  
  const getStatusBadge = (status: string = 'connected') => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="success">Connected</Badge>
    }
  }
  
  const formatChannelId = (channelId: string, link: string) => {
    switch (channelId.toLowerCase()) {
      case 'whatsapp':
        return link // Phone number
      case 'telegram':
        return `@${link}` // Username with @
      default:
        return link
    }
  }

  const handleEditChannel = (channelId: string) => {
    router.push(`/dashboard/channels/edit/${channelId}`)
  }

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${channelName}? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement channel deletion
      console.log('Delete channel:', channelId)
      alert('Channel deletion functionality will be implemented soon')
    } catch (error) {
      console.error('Error deleting channel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestChannel = async (channelId: string) => {
    setIsLoading(true)
    try {
      // TODO: Implement channel testing
      console.log('Test channel:', channelId)
      alert('Channel testing functionality will be implemented soon')
    } catch (error) {
      console.error('Error testing channel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Channel Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Channel
          </CardTitle>
          <CardDescription>
            Connect a new communication channel to expand your reach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => router.push('/dashboard/channels/add')}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </CardContent>
      </Card>

      {/* Connected Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Connected Channels
          </CardTitle>
          <CardDescription>
            You have {channels.length} connected channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channels.length > 0 ? (
            <div className="space-y-4">
              {channels.map((userChannel) => (
                <div
                  key={userChannel.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      {getChannelIcon(userChannel.channels.id)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium capitalize">
                          {userChannel.channels.id}
                        </h3>
                        {getStatusIcon(userChannel.verified_at ? 'connected' : 'pending')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatChannelId(userChannel.channels.id, userChannel.link)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(userChannel.verified_at ? 'connected' : 'pending')}
                        <span className="text-xs text-muted-foreground">
                          {userChannel.verified_at ? `Verified ${new Date(userChannel.verified_at).toLocaleDateString()}` : 'Pending verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestChannel(userChannel.id)}
                      disabled={isLoading}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditChannel(userChannel.id)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteChannel(userChannel.id, userChannel.channels.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No channels connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first channel to start using AnthonChat
              </p>
              <Button onClick={() => router.push('/dashboard/channels/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Channel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Statistics */}
      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Channel Statistics
            </CardTitle>
            <CardDescription>
              Overview of your channel performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {channels.filter(() => true).length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Active Channels
                </div>
              </div>
              <div className="text-center p-4 bg-info/10 rounded-lg">
                <div className="text-2xl font-bold text-info">
                  1,234
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Messages Today
                </div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  98.5%
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Uptime
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}