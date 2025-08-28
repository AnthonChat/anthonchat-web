"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";


interface Channel {
  id: string;
  name: string;
  active: boolean;
  link_method: string;
}

interface ChannelVerificationState {
  status: "idle" | "pending" | "done" | "error";
  nonce?: string;
  deepLink?: string;
  command?: string;
  link?: string;
  error?: string;
  notified?: boolean;
}

interface ChannelVerificationProps {
  channels: Channel[];
  onVerificationComplete: (channelId: string, link: string) => void;
  existingChannels?: { channel_id: string; link: string }[];
}

export default function ChannelVerification({
  channels,
  onVerificationComplete,
  existingChannels = [],
}: ChannelVerificationProps) {
  const {
    showSuccess,
    showVerificationToast,
    handleVerificationPollingError,
    dismissToast
  } = useNotifications();
  const [channelStates, setChannelStates] = useState<
    Record<string, ChannelVerificationState>
  >(() => {
    const states: Record<string, ChannelVerificationState> = {};
    channels.forEach((channel) => {
      const existingChannel = existingChannels.find(
        (ec) => ec.channel_id === channel.id
      );
      states[channel.id] = {
        status: existingChannel ? "done" : "idle",
        link: existingChannel?.link,
      };
    });
    return states;
  });

  const [pollingIntervals, setPollingIntervals] = useState<
    Record<string, NodeJS.Timeout>
  >({});

  const [verificationToasts, setVerificationToasts] = useState<
    Record<string, string>
  >({});

  // Notify parent about existing verified channels on mount
  useEffect(() => {
    existingChannels.forEach((ec) => {
      const channel = channels.find((c) => c.id === ec.channel_id);
      if (channel) {
        onVerificationComplete(ec.channel_id, ec.link);
      }
    });
  }, [channels, existingChannels, onVerificationComplete]);

  // Handle verification completion notifications
  useEffect(() => {
    channels.forEach((channel) => {
      const state = channelStates[channel.id];
      if (state.status === "done" && !state.notified) {
        // tell parent, then mark "notified" so we don't call again
        if (state.link) {
          onVerificationComplete(channel.id, state.link);
        } else {
          toast.error("Verification failed: No link found");
        }
        setChannelStates((cs) => ({
          ...cs,
          [channel.id]: { ...cs[channel.id], notified: true },
        }));
      }
    });
  }, [channelStates, channels, onVerificationComplete]);

  // Cleanup polling intervals and toast notifications on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach((interval) =>
        clearInterval(interval)
      );
      
      // Dismiss all verification toasts
      Object.values(verificationToasts).forEach((toastId) =>
        dismissToast(toastId)
      );
    };
  }, [pollingIntervals, verificationToasts, dismissToast]);

  const updateChannelState = (
    channelId: string,
    updates: Partial<ChannelVerificationState>
  ) => {
    setChannelStates((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], ...updates },
    }));
  };

  const startVerification = async (channel: Channel) => {
    updateChannelState(channel.id, { status: "pending", error: undefined });

    try {
      console.info("CHANNEL_VERIFICATION_START", {
        channelName: channel.name,
        channelId: channel.id,
      });

      const response = await fetch("/api/link/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: channel.name.toLowerCase(),
        }),
      });

      console.info("VERIFICATION_API_RESPONSE", {
        status: response.status,
        channelId: channel.id,
      });
      const data = await response.json();
      console.info("VERIFICATION_API_DATA", {
        data,
        channelId: channel.id,
      });

      if (!response.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      updateChannelState(channel.id, {
        nonce: data.nonce,
        deepLink: data.deepLink,
        command: data.command,
      });

      console.info("CHANNEL_STATE_UPDATED", {
        channelId: channel.id,
        nonce: data.nonce,
        hasDeepLink: !!data.deepLink,
        hasCommand: !!data.command,
      });

      // Auto-open deep link to skip manual "Open ..." click
      if (data.deepLink) {
        try {
          window.location.href = data.deepLink;
          console.info("DEEPLINK_AUTO_OPEN_ATTEMPT", {
            channelId: channel.id,
            channelName: channel.name,
          });
        } catch (e) {
          console.warn("DEEPLINK_AUTO_OPEN_FAILED", { e, channelId: channel.id });
        }
      }

      // Show verification toast
      const toastId = showVerificationToast(
        channel.name,
        data.nonce,
        data.command,
        data.deepLink
      );

      // Store toast ID for later dismissal
      setVerificationToasts(prev => ({
        ...prev,
        [channel.id]: toastId
      }));

      // Start polling for verification status
      startPolling(channel.id, data.nonce);
    } catch (error) {
      console.error("VERIFICATION_START_ERROR", {
        error,
        channelId: channel.id,
        channelName: channel.name,
      });
      updateChannelState(channel.id, {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Failed to start verification",
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
          throw new Error(data.error || "Failed to check verification status");
        }

        if (data.status === "done") {
          // Verification complete
          clearInterval(interval);
          setPollingIntervals((prev) => {
            const newIntervals = { ...prev };
            delete newIntervals[channelId];
            return newIntervals;
          });

          // Dismiss verification toast
          const toastId = verificationToasts[channelId];
          if (toastId) {
            dismissToast(toastId);
            setVerificationToasts(prev => {
              const updated = { ...prev };
              delete updated[channelId];
              return updated;
            });
          }

          // Update status to 'done' - the useEffect will handle notification
          updateChannelState(channelId, { status: "done", link: data.link });
          
          // Show success toast
          const channel = channels.find(c => c.id === channelId);
          showSuccess(
            "Verifica completata!",
            `${channel?.name || 'Il canale'} è stato collegato con successo.`
          );
        }
        // If status is still 'pending', continue polling
      } catch (error) {
        const channel = channels.find(c => c.id === channelId);
        const channelName = channel?.name || 'Il canale';
        
        console.error("VERIFICATION_POLLING_ERROR", {
          error,
          channelId,
          nonce,
          channelName,
        });
        
        clearInterval(interval);
        setPollingIntervals((prev) => {
          const newIntervals = { ...prev };
          delete newIntervals[channelId];
          return newIntervals;
        });

        // Dismiss verification toast
        const toastId = verificationToasts[channelId];
        if (toastId) {
          dismissToast(toastId);
          setVerificationToasts(prev => {
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
          });
        }
        
        // Show error toast with retry functionality
        handleVerificationPollingError(
          channelName,
          error,
          async () => {
            // Retry function - restart the verification process
            await startVerification(channel!);
          }
        );
        
        updateChannelState(channelId, {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to check verification status",
        });
      }
    }, 3000); // Poll every 3 seconds

    setPollingIntervals((prev) => ({ ...prev, [channelId]: interval }));
  };


  const retryVerification = (channel: Channel) => {
    const channelId = channel.id;

    // Clear any existing polling
    if (pollingIntervals[channelId]) {
      clearInterval(pollingIntervals[channelId]);
      setPollingIntervals((prev) => {
        const newIntervals = { ...prev };
        delete newIntervals[channelId];
        return newIntervals;
      });
    }

    // Dismiss any active verification toast
    const toastId = verificationToasts[channelId];
    if (toastId) {
      dismissToast(toastId);
      setVerificationToasts(prev => {
        const updated = { ...prev };
        delete updated[channelId];
        return updated;
      });
    }

    // Reset state and start over
    updateChannelState(channelId, {
      status: "idle",
      error: undefined,
      nonce: undefined,
      deepLink: undefined,
      command: undefined,
    });
  };

  const getStatusIcon = (status: ChannelVerificationState["status"]) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ChannelVerificationState["status"]) => {
    switch (status) {
      case "done":
        return <Badge variant="success">Verified</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl sm:text-3xl">Connect Your Accounts</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          We need to verify your accounts to send and receive messages on your
          behalf. Follow the instructions for each channel below.
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
                  </div>
                </div>
                {getStatusBadge(state.status)}
              </div>

              {state.status === "idle" && (
                <div className="space-y-3">
                  <Button
                    onClick={() => startVerification(channel)}
                    className="w-full"
                  >
                    Connect {channel.name}
                  </Button>
                </div>
              )}

              {state.status === "pending" && state.deepLink && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(state.deepLink, "_blank")}
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

              {state.status === "done" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Verification complete!</strong>
                    <br />
                    Your {channel.name} account has been successfully connected.
                  </AlertDescription>
                </Alert>
              )}

              {state.status === "error" && state.error && (
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
      </CardContent>
    </Card>
  );
}
