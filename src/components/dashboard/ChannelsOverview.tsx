'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Phone, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface Channel {
  id: string
  channel_user_id: string
  channels: {
    id: string
    name: string
    icon_url?: string
    mandatory: boolean
  }
}

interface ChannelsOverviewProps {
  userChannels: Channel[]
}

export function ChannelsOverview({ userChannels }: ChannelsOverviewProps) {
  const router = useRouter()
  
  const getChannelIcon = (channelName: string) => {
    switch (channelName.toLowerCase()) {
      case 'whatsapp':
        return <Phone className="h-4 w-4" />
      case 'telegram':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <MessageCircle className="h-4 w-4" />
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
  
  const formatChannelId = (channelName: string, channelUserId: string) => {
    switch (channelName.toLowerCase()) {
      case 'whatsapp':
        return channelUserId // Phone number
      case 'telegram':
        return `@${channelUserId}` // Username with @
      default:
        return channelUserId
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Connected Channels
        </CardTitle>
        <CardDescription>
          Manage your communication channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {userChannels.map((userChannel) => (
            <div
              key={userChannel.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {getChannelIcon(userChannel.channels.name)}
                </div>
                <div>
                  <div className="font-medium capitalize flex items-center gap-2">
                    {userChannel.channels.name}
                    {userChannel.channels.mandatory && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatChannelId(userChannel.channels.name, userChannel.channel_user_id)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon('connected')}
                {getStatusBadge('connected')}
              </div>
            </div>
          ))}
          
          {userChannels.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No channels connected yet</p>
              <p className="text-sm text-muted-foreground">
                Connect your first channel to start using AnthonChat
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push('/dashboard/channels/add')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Channel
          </Button>
          {userChannels.length > 0 && (
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => router.push('/dashboard/channels')}
            >
              Manage All Channels
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}