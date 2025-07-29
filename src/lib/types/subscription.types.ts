// Subscription and billing related types
import type { Database as StripeDatabase } from '@/utils/supabase/schemas/stripe';
import type { Database as PublicDatabase } from '@/utils/supabase/schemas/public';

// Type aliases for better readability
type StripeSubscription = StripeDatabase["stripe"]["Tables"]["subscriptions"]["Row"];
type StripeProduct = StripeDatabase["stripe"]["Tables"]["products"]["Row"];
type TierFeatures = PublicDatabase["public"]["Tables"]["tiers_features"]["Row"];

// Stripe subscription item interfaces
export interface StripeSubscriptionItemPrice {
  id: string;
  product?: string; // Product ID that this price belongs to
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
}

export interface StripeSubscriptionItem {
  id: string;
  price: StripeSubscriptionItemPrice;
  quantity: number | null;
}

// Combined types for API responses
export type UserSubscriptionResult = {
  subscription: StripeSubscription | null;
  product: StripeProduct | null;
  features: TierFeatures | null;
}

export type UserSubscription = {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  trial_end?: number | null; // Unix timestamp for trial end date
  items: StripeSubscriptionItem[];
  product: StripeProduct | null;
  features: TierFeatures | null;
  billing_interval?: string; // e.g., "month", "year"
  billing_interval_count?: number; // e.g., 1 for monthly, 12 for yearly
}

// Product and pricing types
export interface Product {
  id: string;
  active: boolean;
  name: string | null;
  description: string | null;
  metadata: Record<string, string> | null;
}

export interface Price {
  id: string;
  product_id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  type: 'one_time' | 'recurring';
  interval?: 'day' | 'week' | 'month' | 'year' | null;
  interval_count?: number | null;
  metadata: Record<string, string> | null;
}

// Subscription management
export interface SubscriptionUpdateData {
  priceId?: string;
  quantity?: number;
  metadata?: Record<string, string>;
}

export interface BillingPortalOptions {
  return_url?: string;
}

// Hook options
export interface UseUserSubscriptionOptions {
  autoRefetch?: boolean;
  userId?: string; // Allow passing userId directly
}