'use client'

import React from "react"
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
    <Card className="hover-lift overflow-hidden relative border-2">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-accent/10 pointer-events-none" />
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3">
          <div className="p-3 bg-secondary rounded-lg shadow-lg">
            <MessageCircle className="h-6 w-6 text-secondary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Connected Channels</span>
        </CardTitle>
        <CardDescription className="text-base font-semibold text-muted-foreground">
          Manage your communication channels
        </CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-4">
          {userChannels.map((userChannel, index) => (
            <div
              key={userChannel.id}
              className="group p-5 rounded-xl bg-card border-2 border-border hover:border-accent transition-all duration-300 hover:shadow-lg animate-fade-in hover-scale"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent group-hover:bg-accent/90 rounded-lg transition-all duration-300">
                    {React.cloneElement(getChannelIcon(userChannel.channels.name), {
                      className: "h-6 w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300"
                    })}
                  </div>
                  <div>
                    <div className="font-bold text-lg capitalize flex items-center gap-3">
                      <span className="text-foreground group-hover:text-accent transition-colors">
                        {userChannel.channels.name}
                      </span>
                      {userChannel.channels.mandatory && (
                        <Badge variant="destructive" className="animate-bounce-subtle font-bold">
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground mt-1">
                      {formatChannelId(userChannel.channels.name, userChannel.channel_user_id)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="animate-pulse">
                    {React.cloneElement(getStatusIcon('connected'), {
                      className: "h-5 w-5 text-green-500"
                    })}
                  </div>
                  <div className="animate-scale-in" style={{ animationDelay: `${index * 0.1 + 0.2}s` }}>
                    {getStatusBadge('connected')}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {userChannels.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-6 bg-muted rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground animate-bounce-subtle" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                No channels connected
              </h3>
              <p className="text-base font-medium text-muted-foreground mb-8">
                Connect your first communication channel to get started
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gradient-to-r from-transparent via-border to-transparent">
          <div className="flex gap-4 w-full">
            <Button 
              variant="outline" 
              className="flex-1 bg-card border-2 border-secondary hover:bg-secondary/10 text-foreground font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
              onClick={() => router.push('/dashboard/channels/add')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Channel
            </Button>
            {userChannels.length > 0 && (
              <Button 
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
                onClick={() => router.push('/dashboard/channels')}
              >
                Manage All Channels
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}