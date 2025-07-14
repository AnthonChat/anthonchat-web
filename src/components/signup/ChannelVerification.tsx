"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock, AlertCircle, ExternalLink, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  mandatory: boolean;
}

interface ChannelVerificationState {
  status: 'idle' | 'pending' | 'done' | 'error';
  nonce?: string;
  deepLink?: string;
  command?: string;
  channelUserId: string;
  error?: string;
  notified?: boolean;
}

interface ChannelVerificationProps {
  channels: Channel[];
  onVerificationComplete: (channelId: string, channelUserId: string) => void;
  onAllChannelsVerified: () => void;
  existingChannels?: { channel_id: string; channel_user_id: string }[];
}

export default function ChannelVerification({
  channels,
  onVerificationComplete,
  onAllChannelsVerified,
  existingChannels = [],
}: ChannelVerificationProps) {
  const [channelStates, setChannelStates] = useState<Record<string, ChannelVerificationState>>(
    () => {
      const states: Record<string, ChannelVerificationState> = {};
      channels.forEach((channel) => {
        const existingChannel = existingChannels.find(ec => ec.channel_id === channel.id);
        states[channel.id] = {
          status: existingChannel ? 'done' : 'idle',
          channelUserId: existingChannel?.channel_user_id || '',
        };
      });
      return states;
    }
  );

  const [pollingIntervals, setPollingIntervals] = useState<Record<string, NodeJS.Timeout>>({});

  // Check if all mandatory channels are verified
  const allMandatoryChannelsVerified = channels
    .filter(channel => channel.mandatory)
    .every(channel => channelStates[channel.id]?.status === 'done');

  useEffect(() => {
    if (allMandatoryChannelsVerified) {
      onAllChannelsVerified();
    }
  }, [allMandatoryChannelsVerified, onAllChannelsVerified]);

  // Notify parent about existing verified channels on mount
  useEffect(() => {
    existingChannels.forEach(ec => {
      const channel = channels.find(c => c.id === ec.channel_id);
      if (channel) {
        onVerificationComplete(ec.channel_id, ec.channel_user_id);
      }
    });
  }, []);

  // Handle verification completion notifications
  useEffect(() => {
    channels.forEach((channel) => {
      const state = channelStates[channel.id];
      if (state.status === 'done' && !state.notified) {
        // tell parent, then mark "notified" so we don't call again
        onVerificationComplete(channel.id, state.channelUserId);
        setChannelStates(cs => ({
          ...cs,
          [channel.id]: { ...cs[channel.id], notified: true }
        }));
      }
    });
  }, [channelStates, channels, onVerificationComplete]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
    };
  }, [pollingIntervals]);

  const updateChannelState = (channelId: string, updates: Partial<ChannelVerificationState>) => {
    setChannelStates(prev => ({
      ...prev,
      [channelId]: { ...prev[channelId], ...updates }
    }));
  };

  const handleChannelUserIdChange = (channelId: string, value: string) => {
    updateChannelState(channelId, { channelUserId: value });
  };

  const validateChannelUserId = (channel: Channel, channelUserId: string): string | null => {
    if (!channelUserId.trim()) {
      return `Please provide your ${channel.name} information`;
    }

    if (channel.name.toLowerCase() === 'whatsapp') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(channelUserId)) {
        return 'Please enter a valid WhatsApp phone number with country code (e.g., +1234567890)';
      }
    }

    return null;
  };

  const startVerification = async (channel: Channel) => {
    const state = channelStates[channel.id];
    const validationError = validateChannelUserId(channel, state.channelUserId);
    
    if (validationError) {
      updateChannelState(channel.id, { error: validationError, status: 'error' });
      return;
    }

    updateChannelState(channel.id, { status: 'pending', error: undefined });

    try {
      console.log('Starting verification for:', channel.name, 'with user ID:', state.channelUserId);
      
      const response = await fetch('/api/link/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_code: channel.name.toLowerCase(),
          channel_user_id: state.channelUserId,
        }),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start verification');
      }

      updateChannelState(channel.id, {
        nonce: data.nonce,
        deepLink: data.deepLink,
        command: data.command,
      });

      console.log('Updated channel state with:', {
        nonce: data.nonce,
        deepLink: data.deepLink,
        command: data.command,
      });

      // Start polling for verification status
      startPolling(channel.id, data.nonce);

    } catch (error) {
      console.error('Verification start error:', error);
      updateChannelState(channel.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start verification'
      });
    }
  };

  const startPolling = (channelId: string, nonce: string) => {
    // Clear any existing interval
    if (pollingIntervals[channelId]) {
      clearInterval(pollingIntervals[channelId]);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/link/status/${nonce}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check verification status');
        }

        if (data.status === 'done') {
          // Verification complete
          clearInterval(interval);
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[channelId];
            return newIntervals;
          });
          
          // Update status to 'done' - the useEffect will handle notification
          updateChannelState(channelId, { status: 'done' });
          toast.success('Channel verified successfully!');
        }
        // If status is still 'pending', continue polling
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(interval);
        setPollingIntervals(prev => {
          const newIntervals = { ...prev };
          delete newIntervals[channelId];
          return newIntervals;
        });
        updateChannelState(channelId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to check verification status'
        });
      }
    }, 3000); // Poll every 3 seconds

    setPollingIntervals(prev => ({ ...prev, [channelId]: interval }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const retryVerification = (channel: Channel) => {
    const channelId = channel.id;
    
    // Clear any existing polling
    if (pollingIntervals[channelId]) {
      clearInterval(pollingIntervals[channelId]);
      setPollingIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[channelId];
        return newIntervals;
      });
    }

    // Reset state and start over
    updateChannelState(channelId, {
      status: 'idle',
      error: undefined,
      nonce: undefined,
      deepLink: undefined,
      command: undefined,
    });
  };

  const getStatusIcon = (status: ChannelVerificationState['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ChannelVerificationState['status']) => {
    switch (status) {
      case 'done':
        return <Badge variant="default" className="bg-green-500">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Your Accounts</CardTitle>
        <CardDescription>
          We need to verify your accounts to send and receive messages on your behalf.
          Follow the instructions for each channel below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {channels.map((channel) => {
          const state = channelStates[channel.id];
          
          return (
            <div key={channel.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(state.status)}
                  <div>
                    <h3 className="font-medium">{channel.name}</h3>
                    {channel.mandatory && (
                      <p className="text-sm text-muted-foreground">Required</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(state.status)}
              </div>

              {state.status === 'idle' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`channel-${channel.id}`} className="text-sm font-medium">
                      {channel.name} User ID
                    </Label>
                    <Input
                      id={`channel-${channel.id}`}
                      value={state.channelUserId}
                      onChange={(e) => handleChannelUserIdChange(channel.id, e.target.value)}
                      placeholder={
                        channel.name.toLowerCase() === 'whatsapp'
                          ? 'e.g., +1234567890'
                          : `Your ${channel.name} user ID`
                      }
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    onClick={() => startVerification(channel)}
                    disabled={!state.channelUserId.trim()}
                    className="w-full"
                  >
                    Start Verification
                  </Button>
                </div>
              )}

              {state.status === 'pending' && state.command && state.deepLink && (
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Verification in progress...</strong>
                      <br />
                      Please complete the verification by following one of the options below:
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Option 1: Send this command</p>
                    <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                      <code className="flex-1 text-sm">{state.command}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(state.command!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Option 2: Click to open {channel.name}</p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(state.deepLink, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open {channel.name}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Waiting for verification... This may take a few moments.
                  </p>
                </div>
              )}

              {state.status === 'done' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Verification complete!</strong>
                    <br />
                    Your {channel.name} account has been successfully connected.
                  </AlertDescription>
                </Alert>
              )}

              {state.status === 'error' && state.error && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Verification failed:</strong>
                      <br />
                      {state.error}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="outline"
                    onClick={() => retryVerification(channel)}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        
        {!allMandatoryChannelsVerified && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please verify all required channels to continue with the setup.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}