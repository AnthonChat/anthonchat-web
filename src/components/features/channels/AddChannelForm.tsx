"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Phone,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Timer,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { uiLogger } from "@/utils/loggers";
import { cn } from "@/lib/utils";
import type { Channel, UserChannelWithChannel } from "@/lib/types/channels";

interface ChannelVerificationState {
  status: "idle" | "pending" | "done" | "error" | "expired";
  nonce?: string;
  deepLink?: string;
  command?: string;
  link?: string;
  error?: string;
  startedAt?: number; // Timestamp when verification started
}

interface AddChannelFormProps {
  availableChannels: Channel[];
  existingChannels: UserChannelWithChannel[];
}

const STORAGE_KEY = "channel_verification_states";

// Utility functions for localStorage persistence
const saveVerificationStates = (
  states: Record<string, ChannelVerificationState>
) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    uiLogger.error("STORAGE_SAVE_ERROR", "ADD_CHANNEL_FORM", { error });
  }
};

const loadVerificationStates = (): Record<string, ChannelVerificationState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const states = JSON.parse(stored);
      // Clean up only old pending states (older than 15 minutes)
      // Keep expired and error states for display after page reload
      const now = Date.now();
      const cleanStates: Record<string, ChannelVerificationState> = {};

      Object.entries(states).forEach(([channelId, state]) => {
        const typedState = state as ChannelVerificationState;

        // Always keep expired and error states
        if (typedState.status === "expired" || typedState.status === "error") {
          cleanStates[channelId] = typedState;
        }
        // Only keep pending states that are less than 10 minutes old (buffer beyond 5min expiry)
        else if (
          typedState.status === "pending" &&
          typedState.startedAt &&
          now - typedState.startedAt < 10 * 60 * 1000
        ) {
          cleanStates[channelId] = typedState;
        }
        // Keep other states (done, idle) as they are
        else if (typedState.status === "done" || typedState.status === "idle") {
          cleanStates[channelId] = typedState;
        }
      });

      return cleanStates;
    }
  } catch (error) {
    uiLogger.error("STORAGE_LOAD_ERROR", "ADD_CHANNEL_FORM", { error });
  }
  return {};
};

const clearVerificationState = (channelId: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const states = JSON.parse(stored);
      delete states[channelId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    }
  } catch (error) {
    uiLogger.error("STORAGE_CLEAR_ERROR", "ADD_CHANNEL_FORM", { error });
  }
};

export function AddChannelForm({
  availableChannels,
  existingChannels,
}: AddChannelFormProps) {
  // Initialize channel states immediately with proper values to prevent flashing
  const initializeChannelStates = useCallback(() => {
    const persistedStates = loadVerificationStates();
    const states: Record<string, ChannelVerificationState> = {};

    availableChannels.forEach((channel) => {
      const existingChannel = existingChannels.find(
        (ec) => ec.channel_id === channel.id
      );
      const persistedState = persistedStates[channel.id];

      if (existingChannel) {
        // Channel is already connected - set immediately to prevent flashing
        states[channel.id] = {
          status: "done",
          link: existingChannel.link,
        };
        // Clear any persisted state for connected channels
        clearVerificationState(channel.id);
      } else if (
        persistedState &&
        persistedState.status === "pending" &&
        persistedState.nonce
      ) {
        // Resume pending verification
        states[channel.id] = persistedState;
      } else if (persistedState && persistedState.status === "expired") {
        // Restore expired state to show expiration error
        states[channel.id] = persistedState;
      } else if (persistedState && persistedState.status === "error") {
        // Restore error state to show error message
        states[channel.id] = persistedState;
      } else {
        // Default idle state
        states[channel.id] = { status: "idle" };
      }
    });

    return states;
  }, [availableChannels, existingChannels]);

  const [channelStates, setChannelStates] = useState<
    Record<string, ChannelVerificationState>
  >(initializeChannelStates);
  const [pollingIntervals, setPollingIntervals] = useState<
    Record<string, NodeJS.Timeout>
  >({});
  const [timeoutIntervals, setTimeoutIntervals] = useState<
    Record<string, NodeJS.Timeout>
  >({});
  const pollingInitialized = useRef(false);
  const router = useRouter();

  const updateChannelState = useCallback(
    (channelId: string, updates: Partial<ChannelVerificationState>) => {
      setChannelStates((prev) => {
        const newStates = {
          ...prev,
          [channelId]: { ...prev[channelId], ...updates },
        };

        // Save to localStorage for persistence
        saveVerificationStates(newStates);

        return newStates;
      });
    },
    []
  );

  const startPolling = useCallback(
    (channelId: string, nonce: string) => {
      // Clear any existing polling for this channel
      if (pollingIntervals[channelId]) {
        clearInterval(pollingIntervals[channelId]);
      }
      if (timeoutIntervals[channelId]) {
        clearTimeout(timeoutIntervals[channelId]);
      }

      // Set up timeout to expire verification after 5 minutes (matching API expiry)
      const timeout = setTimeout(() => {
        updateChannelState(channelId, {
          status: "expired",
          error: "Verification timed out. Please try again.",
        });

        // Clear polling interval
        if (pollingIntervals[channelId]) {
          clearInterval(pollingIntervals[channelId]);
          setPollingIntervals((prev) => {
            const newIntervals = { ...prev };
            delete newIntervals[channelId];
            return newIntervals;
          });
        }

        // Clear timeout interval
        setTimeoutIntervals((prev) => {
          const newTimeouts = { ...prev };
          delete newTimeouts[channelId];
          return newTimeouts;
        });

        // Don't clear persisted state on timeout - keep it for page reloads
      }, 5 * 60 * 1000); // 5 minutes (matching API expiry)

      setTimeoutIntervals((prev) => ({ ...prev, [channelId]: timeout }));

      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/link/status/${nonce}`);
          const data = await response.json();

          if (response.ok && data.status === "done") {
            updateChannelState(channelId, {
              status: "done",
              link: data.link,
            });
            clearInterval(interval);
            clearTimeout(timeout);
            setPollingIntervals((prev) => {
              const newIntervals = { ...prev };
              delete newIntervals[channelId];
              return newIntervals;
            });
            setTimeoutIntervals((prev) => {
              const newTimeouts = { ...prev };
              delete newTimeouts[channelId];
              return newTimeouts;
            });

            // Clear persisted state on successful completion
            clearVerificationState(channelId);

            // Refresh the page to show updated channels
            router.refresh();
          } else if (response.status === 410 || data.status === "expired") {
            // Verification has expired
            updateChannelState(channelId, {
              status: "expired",
              error:
                data.error ||
                "Verification link has expired. Please try again.",
            });
            clearInterval(interval);
            clearTimeout(timeout);
            setPollingIntervals((prev) => {
              const newIntervals = { ...prev };
              delete newIntervals[channelId];
              return newIntervals;
            });
            setTimeoutIntervals((prev) => {
              const newTimeouts = { ...prev };
              delete newTimeouts[channelId];
              return newTimeouts;
            });

            // Don't clear persisted state on expiration - keep it for page reloads
          } else if (!response.ok && response.status !== 404) {
            // Only stop polling on actual errors, not when verification is just not found yet
            throw new Error(data.error || "Verification failed");
          }
        } catch (error) {
          uiLogger.error("POLLING_ERROR", "ADD_CHANNEL_FORM", {
            error,
            channelId,
            nonce,
          });
          updateChannelState(channelId, {
            status: "error",
            error:
              error instanceof Error ? error.message : "Verification failed",
          });
          clearInterval(interval);
          clearTimeout(timeout);
          setPollingIntervals((prev) => {
            const newIntervals = { ...prev };
            delete newIntervals[channelId];
            return newIntervals;
          });
          setTimeoutIntervals((prev) => {
            const newTimeouts = { ...prev };
            delete newTimeouts[channelId];
            return newTimeouts;
          });

          // Don't clear persisted state on error - keep it for page reloads
        }
      }, 2000); // Poll every 2 seconds

      setPollingIntervals((prev) => ({ ...prev, [channelId]: interval }));
    },
    [pollingIntervals, timeoutIntervals, updateChannelState, router]
  );

  // Resume polling for pending verifications after component mount
  useEffect(() => {
    if (pollingInitialized.current) return;

    Object.entries(channelStates).forEach(([channelId, state]) => {
      if (state.status === "pending" && state.nonce) {
        // Resume polling for this channel
        startPolling(channelId, state.nonce);
      }
    });

    pollingInitialized.current = true;
  }, [channelStates, startPolling]);

  const getChannelIcon = (channelId: string) => {
    switch (channelId.toLowerCase()) {
      case "whatsapp":
        return <Phone className="h-12 w-12 mx-auto mb-4 text-success" />;
      case "telegram":
        return <MessageCircle className="h-12 w-12 mx-auto mb-4 text-info" />;
      default:
        return (
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        );
    }
  };

  const getChannelName = (channelId: string) => {
    switch (channelId.toLowerCase()) {
      case "whatsapp":
        return "WhatsApp";
      case "telegram":
        return "Telegram";
      default:
        return channelId;
    }
  };

  const getChannelDescription = (channelId: string) => {
    switch (channelId.toLowerCase()) {
      case "whatsapp":
        return "Connect your WhatsApp Business account";
      case "telegram":
        return "Connect your Telegram bot";
      default:
        return "Connect your communication channel";
    }
  };

  const startVerification = async (channel: Channel) => {
    const startedAt = Date.now();
    updateChannelState(channel.id, {
      status: "pending",
      error: undefined,
      startedAt,
    });

    try {
      uiLogger.info("CHANNEL_VERIFICATION_START", "ADD_CHANNEL_FORM", {
        channelId: channel.id,
      });

      const response = await fetch("/api/link/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: channel.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      updateChannelState(channel.id, {
        status: "pending",
        nonce: data.nonce,
        deepLink: data.deepLink,
        command: data.command,
        startedAt,
      });

      // Start polling for verification status
      startPolling(channel.id, data.nonce);
    } catch (error) {
      uiLogger.error("CHANNEL_VERIFICATION_ERROR", "ADD_CHANNEL_FORM", {
        error,
        channelId: channel.id,
      });
      updateChannelState(channel.id, {
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const retryVerification = (channel: Channel) => {
    // Clear any existing polling and timeouts
    if (pollingIntervals[channel.id]) {
      clearInterval(pollingIntervals[channel.id]);
      setPollingIntervals((prev) => {
        const newIntervals = { ...prev };
        delete newIntervals[channel.id];
        return newIntervals;
      });
    }
    if (timeoutIntervals[channel.id]) {
      clearTimeout(timeoutIntervals[channel.id]);
      setTimeoutIntervals((prev) => {
        const newTimeouts = { ...prev };
        delete newTimeouts[channel.id];
        return newTimeouts;
      });
    }

    // Clear persisted state before retry
    clearVerificationState(channel.id);

    // Reset state and start over
    updateChannelState(channel.id, { status: "idle" });
    startVerification(channel);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const getErrorMessage = (
    state: ChannelVerificationState,
    channelName: string
  ) => {
    if (state.status === "expired") {
      return {
        title: `${channelName} Verification Expired`,
        message:
          "The verification link expired after 5 minutes. This is normal for security reasons.",
        suggestion: `Click "Start Fresh" below to generate a new verification link for ${channelName}.`,
      };
    } else if (state.status === "error") {
      return {
        title: `${channelName} Connection Error`,
        message:
          state.error || "An unexpected error occurred during verification.",
        suggestion:
          "Please try again or contact support if the problem persists.",
      };
    }
    return null;
  };

  const getStatusBadge = (state: ChannelVerificationState) => {
    switch (state.status) {
      case "done":
        return (
          <Badge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Pending
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="warning">
            <Timer className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach(clearInterval);
      Object.values(timeoutIntervals).forEach(clearTimeout);
    };
  }, [pollingIntervals, timeoutIntervals]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          Choose Channel Type
        </h2>
        <p className="text-muted-foreground">
          Select the type of communication channel you want to add
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableChannels.map((channel) => {
          const state = channelStates[channel.id] || { status: "idle" };
          const isConnected = state.status === "done";
          const isPending = state.status === "pending";
          const isExpired = state.status === "expired";
          const hasError =
            state.status === "error" || state.status === "expired";

          // Determine card styling based on state
          let cardClassName = "transition-all duration-200 ";
          if (isConnected) {
            cardClassName += "border-success/50 bg-success/5";
          } else if (isExpired) {
            cardClassName +=
              "border-warning/50 bg-warning/5 hover:bg-warning/10";
          } else if (state.status === "error") {
            cardClassName +=
              "border-destructive/50 bg-destructive/5 hover:bg-destructive/10";
          } else {
            cardClassName += "hover:bg-muted/50";
          }

          return (
            <Card key={channel.id} className={cardClassName}>
              <CardContent className="p-6 text-center">
                {getChannelIcon(channel.id)}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold">
                    {getChannelName(channel.id)}
                  </h3>
                  {getStatusBadge(state)}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {getChannelDescription(channel.id)}
                </p>

                {isConnected && (
                  <div className="mb-4 p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-success">
                      Connected as:{" "}
                      <span className="font-mono">{state.link}</span>
                    </p>
                  </div>
                )}

                {isPending && state.deepLink && (
                  <div className="mb-4 space-y-3">
                    {state.startedAt && Date.now() - state.startedAt > 5000 && (
                      <div className="p-2 bg-info/10 rounded-lg border border-info/20">
                        <p className="text-xs text-info flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Resumed from previous session
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-info/5 rounded-lg">
                      <p className="text-sm text-info mb-2">
                        Click the link below or send this command:
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="flex-1 px-2 py-1 bg-white rounded text-xs font-mono">
                          {state.command}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(state.command || "")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(state.deepLink, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open {getChannelName(channel.id)}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Waiting for verification... This may take a few moments.
                    </p>
                  </div>
                )}

                {hasError && (
                  <div className="mb-4">
                    {(() => {
                      const errorInfo = getErrorMessage(
                        state,
                        getChannelName(channel.id)
                      );
                      if (!errorInfo) return null;

                      const isExpired = state.status === "expired";
                      const bgColor = isExpired
                        ? "bg-warning/5"
                        : "bg-destructive/5";
                      const borderColor = isExpired
                        ? "border-warning/20"
                        : "border-destructive/20";
                      const textColor = isExpired
                        ? "text-warning"
                        : "text-destructive";
                      const iconColor = isExpired
                        ? "text-warning"
                        : "text-destructive";

                      return (
                        <div
                          className={cn(
                            "p-4 rounded-lg border space-y-3",
                            bgColor,
                            borderColor
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("flex-shrink-0", iconColor)}>
                              {isExpired ? (
                                <Timer className="h-5 w-5" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <h4 className={cn("font-medium", textColor)}>
                                {errorInfo.title}
                              </h4>
                              <p className={cn("text-sm", textColor)}>
                                {errorInfo.message}
                              </p>
                              <p
                                className={cn("text-xs opacity-80", textColor)}
                              >
                                {errorInfo.suggestion}
                              </p>
                            </div>
                          </div>

                          {isExpired && state.startedAt && (
                            <div
                              className={cn(
                                "text-xs opacity-70 pt-2 border-t border-warning/20",
                                textColor
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Started:{" "}
                                {new Date(state.startedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-2">
                  {!isConnected && !isPending && !isExpired && (
                    <Button
                      className="w-full"
                      onClick={() => startVerification(channel)}
                    >
                      Connect {getChannelName(channel.id)}
                    </Button>
                  )}

                  {isPending && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => retryVerification(channel)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  )}

                  {hasError && (
                    <Button
                      className="w-full"
                      onClick={() => retryVerification(channel)}
                      variant={
                        state.status === "expired" ? "default" : "destructive"
                      }
                    >
                      {state.status === "expired" ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Start Fresh
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </>
                      )}
                    </Button>
                  )}

                  {isConnected && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/dashboard/channels")}
                    >
                      View All Channels
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {availableChannels.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No channels are currently available for connection.
          </p>
        </div>
      )}
    </div>
  );
}
