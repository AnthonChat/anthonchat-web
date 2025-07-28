// lib/types/usage.ts

// Type for the get_user_usage_and_limits function result
export interface UserTierAndUsageResult {
  tokens_used: number;
  requests_used: number;
  tokens_limit: number | null;
  requests_limit: number | null;
  history_limit: number | null;
}

// Legacy interface for compatibility with existing components
export interface UsageData {
  tokens_used: number;
  requests_used: number;
  tokens_limit: number;
  requests_limit: number;
  period_start?: string;
  period_end?: string;
}

// Current usage interface
export interface CurrentUsage {
  tokens_used: number;
  channels_used: number;
  memories_used: number;
}