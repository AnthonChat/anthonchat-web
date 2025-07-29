// Central type definitions for AnthonChat Web Application
// Consolidates all type definitions for better maintainability

// Re-export common external types
export type { Database } from '@/utils/supabase/schemas/public';
export type { User, Session } from '@supabase/supabase-js';

// Re-export existing type modules
export * from './api.types';
export * from './auth.types';
export * from './channels.types';
export * from './subscription.types';
export * from './ui.types';
export * from './usage.types';

// Common utility types
export interface TimestampFields {
  created_at: string;
  updated_at: string;
}

export interface BaseEntity extends TimestampFields {
  id: string;
}