"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { UserChannelWithChannel } from "@/lib/types/channels.types";
import { hookLogger } from "@/lib/logging/loggers";

interface UseChannelsOptions {
  userId?: string;
  enableRealtime?: boolean;
  autoRefetch?: boolean;
}

interface UseChannelsState {
  channels: UserChannelWithChannel[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

interface UseChannelsActions {
  refetch: () => Promise<void>;
  createChannel: (data: Partial<UserChannelWithChannel>) => Promise<UserChannelWithChannel | null>;
  updateChannel: (id: string, data: Partial<UserChannelWithChannel>) => Promise<UserChannelWithChannel | null>;
  deleteChannel: (id: string) => Promise<boolean>;
  clearError: () => void;
}

interface UseChannelsReturn extends UseChannelsState, UseChannelsActions {}

/**
 * Hook for managing user channels with real-time updates
 * Provides CRUD operations and real-time synchronization
 */
export function useChannels(options: UseChannelsOptions = {}): UseChannelsReturn {
  const { userId, enableRealtime = true, autoRefetch = true } = options;
  
  const [channels, setChannels] = useState<UserChannelWithChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const supabase = createClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refetch = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch user channels with joined channel data using browser client
      const { data, error } = await supabase
        .from("user_channels")
        .select(`
          id,
          link,
          verified_at,
          channel_id,
          channels!user_channels_channel_id_fkey (
            id,
            link_method,
            is_active,
            created_at
          )
        `)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      // Transform the data to match the expected structure
      const transformedData: UserChannelWithChannel[] = data?.map(item => ({
        id: item.id,
        link: item.link,
        verified_at: item.verified_at,
        channel_id: item.channel_id,
        channels: Array.isArray(item.channels) ? item.channels[0] : item.channels
      })) || [];

      setChannels(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch channels";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  const createChannel = useCallback(async (data: Partial<UserChannelWithChannel>): Promise<UserChannelWithChannel | null> => {
    if (!userId) {
      setError("User ID is required to create a channel");
      return null;
    }

    try {
      setError(null);
      const { data: newChannel, error } = await supabase
        .from("user_channels")
        .insert({
          ...data,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }

      setChannels(prev => [...prev, newChannel]);
      return newChannel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create channel";
      setError(errorMessage);
      return null;
    }
  }, [userId, supabase]);

  const updateChannel = useCallback(async (id: string, data: Partial<UserChannelWithChannel>): Promise<UserChannelWithChannel | null> => {
    try {
      setError(null);
      const { data: updatedChannel, error } = await supabase
        .from("user_channels")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }

      setChannels(prev => prev.map(channel => 
        channel.id === id ? updatedChannel : channel
      ));
      return updatedChannel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update channel";
      setError(errorMessage);
      return null;
    }
  }, [supabase]);

  const deleteChannel = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { error } = await supabase
        .from("user_channels")
        .delete()
        .eq("id", id);

      if (error) {
        setError(error.message);
        return false;
      }

      setChannels(prev => prev.filter(channel => channel.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete channel";
      setError(errorMessage);
      return false;
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    if (autoRefetch) {
      refetch();
    }
  }, [autoRefetch, refetch]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !userId) {
      return;
    }

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`user_channels_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_channels",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            hookLogger.info('REALTIME_CHANNEL_UPDATE', 'CHANNELS', { payload, userId });
            
            switch (payload.eventType) {
              case "INSERT":
                setChannels(prev => [...prev, payload.new as UserChannelWithChannel]);
                break;
              case "UPDATE":
                setChannels(prev => prev.map(ch => 
                  ch.id === payload.new.id ? payload.new as UserChannelWithChannel : ch
                ));
                break;
              case "DELETE":
                setChannels(prev => prev.filter(ch => ch.id !== payload.old.id));
                break;
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            setError(null);
          }
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enableRealtime, userId, supabase]);

  return {
    channels,
    isLoading,
    error,
    isConnected,
    refetch,
    createChannel,
    updateChannel,
    deleteChannel,
    clearError,
  };
}