// lib/types/usage.ts

// Type for the get_user_tier_and_usage function result
export interface UserTierAndUsageResult {
  user_id: string;
  tier_id: string | null;
  tier_name: string | null;
  tokens_limit: number | null;
  tokens_used: number | null;
  channels_limit: number | null;
  channels_used: number | null;
  memories_limit: number | null;
  memories_used: number | null;
}

// Legacy interface for compatibility with existing components
export interface UsageData {
  tokens_used: number;
  requests_used: number;
  tokens_limit?: number | null;
  requests_limit?: number | null;
  period_start?: string;
  period_end?: string;
}

// Current usage interface
export interface CurrentUsage {
  tokens_used: number;
  channels_used: number;
  memories_used: number;
}