'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/browser'
import { UsageData } from '@/lib/queries/usage'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeUsageOptions {
  userId: string
  initialUsage: UsageData
  enabled?: boolean
}

interface UseRealtimeUsageReturn {
  usage: UsageData
  isConnected: boolean
  error: string | null
  reconnect: () => void
}

export function useRealtimeUsage({
  userId,
  initialUsage,
  enabled = true
}: UseRealtimeUsageOptions): UseRealtimeUsageReturn {
  const [usage, setUsage] = useState<UsageData>(initialUsage)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY_MS = 5000
  
  const supabase = createClient()

  const fetchLatestUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_current_usage', { user_id_param: userId })
      
      if (error) {
        console.error('Error fetching usage:', error)
        setError('Failed to fetch latest usage data')
        return
      }
      
      if (data && data.length > 0) {
        const latestUsage = data[0]
        setUsage(prev => ({
          ...prev,
          tokens_used: latestUsage.tokens_used,
          requests_used: latestUsage.requests_used,
          period_start: latestUsage.period_start,
          period_end: latestUsage.period_end
        }))
      }
      
      setError(null)
    } catch (err) {
      console.error('Error in fetchLatestUsage:', err)
      setError('Failed to fetch usage data')
    }
  }, [userId])

  const setupRealtimeSubscription = useCallback(() => {
    if (!enabled || !userId) return
    
    // Clean up existing channel
    if (channel) {
      supabase.removeChannel(channel)
    }
    
    const newChannel = supabase
      .channel(`usage_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_records',
          filter: `user_id=eq.${userId}`
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          console.log('Usage update received:', payload)
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newRecord = payload.new as any
            
            // Update usage data with the new values
            setUsage(prev => ({
              ...prev,
              tokens_used: newRecord.tokens_used || prev.tokens_used,
              requests_used: newRecord.requests_used || prev.requests_used,
              period_start: newRecord.period_start || prev.period_start,
              period_end: newRecord.period_end || prev.period_end
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          setReconnectAttempts(0)
          console.log('Successfully subscribed to usage updates')
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Connection error')
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(() => {
              setReconnectAttempts(prev => prev + 1)
              setupRealtimeSubscription()
            }, RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts))
          } else {
            setError('Max reconnection attempts reached')
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })
    
    setChannel(newChannel)
  }, [enabled, userId, supabase, reconnectAttempts])

  const reconnect = useCallback(() => {
    setReconnectAttempts(0)
    setError(null)
    setupRealtimeSubscription()
  }, [setupRealtimeSubscription])

  useEffect(() => {
    if (!enabled || !userId) return
    
    // Fetch initial data
    fetchLatestUsage()
    
    // Setup realtime subscription
    setupRealtimeSubscription()
    
    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [enabled, userId, fetchLatestUsage, setupRealtimeSubscription])

  // Update usage when initialUsage changes
  useEffect(() => {
    setUsage(initialUsage)
  }, [initialUsage])

  return {
    usage,
    isConnected,
    error,
    reconnect
  }
}