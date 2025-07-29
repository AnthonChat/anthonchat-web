// Authentication related types
import type { User, Session } from '@supabase/supabase-js';

// Auth state interface
export interface UseAuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Signup data
export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
}

// Password reset request
export interface PasswordResetRequest {
  email: string;
}

// Password update data
export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

// Auth provider types
export type AuthProvider = 'google' | 'github' | 'discord';

// Auth error types
export interface AuthError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// User profile data
export interface UserProfile {
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  email?: string;
}

// Session management
export interface SessionInfo {
  user: User;
  session: Session;
  expiresAt: number;
}