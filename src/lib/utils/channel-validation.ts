/**
 * Channel validation utilities for enhanced registration and channel linking
 * Provides nonce validation, channel validation, and related security functions
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Database } from '@/lib/db/schemas/public';

/**
 * Supported channel types
 */
export const SUPPORTED_CHANNELS = ['telegram', 'whatsapp'] as const;
export type SupportedChannel = typeof SUPPORTED_CHANNELS[number];

/**
 * Channel configuration interface
 */
export interface ChannelConfig {
  id: SupportedChannel;
  name: string;
  linkMethod: Database['public']['Enums']['link_method'];
  handlePattern: RegExp;
  handleDescription: string;
  maxHandleLength: number;
  isActive: boolean;
}

/**
 * Channel configurations
 */
export const CHANNEL_CONFIGS: Record<SupportedChannel, ChannelConfig> = {
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    linkMethod: 'username',
    handlePattern: /^(@[\w\d_]{5,32}|\d+)$/,
    handleDescription: '@username or numeric chat_id',
    maxHandleLength: 33, // @username (32 chars) + @
    isActive: true,
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    linkMethod: 'phone_number',
    handlePattern: /^\+?\d{10,15}$/,
    handleDescription: 'Phone number with optional + prefix',
    maxHandleLength: 16, // +15 digits max
    isActive: true,
  },
} as const;

/**
 * Nonce validation result
 */
export interface NonceValidationResult {
  isValid: boolean;
  isExpired: boolean;
  error?: string;
  verification?: {
    id: string;
    channelId: string;
    userHandle: string | null;
    expiresAt: string;
    isRegistration: boolean;
  };
}

/**
 * Channel validation result
 */
export interface ChannelValidationResult {
  isValid: boolean;
  isSupported: boolean;
  error?: string;
  config?: ChannelConfig;
}

/**
 * Nonce format validation - checks if nonce has correct UUID format
 */
export function validateNonceFormat(nonce: string): boolean {
  if (!nonce || typeof nonce !== 'string') {
    return false;
  }

  // UUID v4 format: 8-4-4-4-12 hexadecimal characters
  // More flexible regex that accepts any valid UUID format (not just v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(nonce);
}

/**
 * Check if nonce is expired based on current time
 */
export function isNonceExpired(expiresAt: string): boolean {
  if (!expiresAt) {
    return true;
  }

  try {
    const expiryTime = new Date(expiresAt).getTime();
    // Check if the date is valid (NaN means invalid date)
    if (isNaN(expiryTime)) {
      return true; // Treat invalid dates as expired
    }
    const currentTime = Date.now();
    return currentTime > expiryTime;
  } catch (error) {
    console.error('Error parsing expiry date:', error);
    return true; // Treat invalid dates as expired
  }
}

/**
 * Generate a secure nonce for channel verification
 */
export function generateNonce(): string {
  return randomUUID();
}

/**
 * Validate nonce against database and check expiration
 * Requires service role client to bypass RLS for pending registrations
 */
export async function validateNonce(
  nonce: string,
  channelId?: string
): Promise<NonceValidationResult> {
  // First check format
  if (!validateNonceFormat(nonce)) {
    return {
      isValid: false,
      isExpired: false,
      error: 'Invalid nonce format',
    };
  }

  try {
    // Get service role client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    
    if (!supabaseUrl || !supabaseSecretKey) {
      return {
        isValid: false,
        isExpired: false,
        error: 'Database configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    // Build query
    let query = supabase
      .from('channel_verifications')
      .select('id, channel_id, user_handle, expires_at, user_id')
      .eq('nonce', nonce);

    // Add channel filter if provided
    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    const { data: verification, error } = await query.single();

    if (error || !verification) {
      return {
        isValid: false,
        isExpired: false,
        error: 'Nonce not found',
      };
    }

    // Check expiration
    const expired = isNonceExpired(verification.expires_at);

    return {
      isValid: !expired,
      isExpired: expired,
      error: expired ? 'Nonce has expired' : undefined,
      verification: {
        id: verification.id,
        channelId: verification.channel_id,
        userHandle: verification.user_handle,
        expiresAt: verification.expires_at,
        isRegistration: verification.user_id === null,
      },
    };
  } catch (error) {
    console.error('Error validating nonce:', error);
    return {
      isValid: false,
      isExpired: false,
      error: 'Database error during validation',
    };
  }
}
/**
 * Val
idate channel ID format and check if it's supported
 */
export function validateChannelId(channelId: string): ChannelValidationResult {
  if (!channelId || typeof channelId !== 'string') {
    return {
      isValid: false,
      isSupported: false,
      error: 'Channel ID is required',
    };
  }

  // Normalize channel ID
  const normalizedChannelId = channelId.toLowerCase().trim();

  // Check if channel is supported
  if (!SUPPORTED_CHANNELS.includes(normalizedChannelId as SupportedChannel)) {
    return {
      isValid: false,
      isSupported: false,
      error: `Unsupported channel: ${channelId}. Supported channels: ${SUPPORTED_CHANNELS.join(', ')}`,
    };
  }

  const config = CHANNEL_CONFIGS[normalizedChannelId as SupportedChannel];

  // Check if channel is active
  if (!config.isActive) {
    return {
      isValid: false,
      isSupported: true,
      error: `Channel ${channelId} is currently inactive`,
      config,
    };
  }

  return {
    isValid: true,
    isSupported: true,
    config,
  };
}

/**
 * Check if a channel is supported
 */
export function isSupportedChannel(channelId: string): boolean {
  if (!channelId || typeof channelId !== 'string') {
    return false;
  }

  const normalizedChannelId = channelId.toLowerCase().trim();
  return SUPPORTED_CHANNELS.includes(normalizedChannelId as SupportedChannel);
}

/**
 * Get channel configuration for a specific channel
 */
export function getChannelConfig(channelId: string): ChannelConfig | null {
  if (!isSupportedChannel(channelId)) {
    return null;
  }

  const normalizedChannelId = channelId.toLowerCase().trim() as SupportedChannel;
  return CHANNEL_CONFIGS[normalizedChannelId];
}

/**
 * Validate user handle format for a specific channel
 */
export function validateUserHandle(channelId: string, userHandle: string): {
  isValid: boolean;
  error?: string;
} {
  const config = getChannelConfig(channelId);
  
  if (!config) {
    return {
      isValid: false,
      error: `Unsupported channel: ${channelId}`,
    };
  }

  if (!userHandle || typeof userHandle !== 'string') {
    return {
      isValid: false,
      error: 'User handle is required',
    };
  }

  // Check length
  if (userHandle.length > config.maxHandleLength) {
    return {
      isValid: false,
      error: `Handle too long. Maximum ${config.maxHandleLength} characters for ${config.name}`,
    };
  }

  // Check pattern
  if (!config.handlePattern.test(userHandle)) {
    return {
      isValid: false,
      error: `Invalid handle format for ${config.name}. Expected: ${config.handleDescription}`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Get all supported channels with their configurations
 */
export function getAllChannelConfigs(): ChannelConfig[] {
  return Object.values(CHANNEL_CONFIGS);
}

/**
 * Get active channels only
 */
export function getActiveChannels(): ChannelConfig[] {
  return getAllChannelConfigs().filter(config => config.isActive);
}

/**
 * Comprehensive channel and nonce validation for linking operations
 */
export async function validateChannelLinkingData(
  nonce: string,
  channelId: string,
  userHandle?: string
): Promise<{
  isValid: boolean;
  errors: string[];
  nonceResult?: NonceValidationResult;
  channelResult?: ChannelValidationResult;
  handleResult?: { isValid: boolean; error?: string };
}> {
  const errors: string[] = [];

  // Validate nonce
  const nonceResult = await validateNonce(nonce, channelId);
  if (!nonceResult.isValid) {
    errors.push(nonceResult.error || 'Invalid nonce');
  }

  // Validate channel
  const channelResult = validateChannelId(channelId);
  if (!channelResult.isValid) {
    errors.push(channelResult.error || 'Invalid channel');
  }

  // Validate user handle if provided
  let handleResult: { isValid: boolean; error?: string } | undefined;
  if (userHandle) {
    handleResult = validateUserHandle(channelId, userHandle);
    if (!handleResult.isValid) {
      errors.push(handleResult.error || 'Invalid user handle');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    nonceResult,
    channelResult,
    handleResult,
  };
}

/**
 * Security utilities for channel validation
 */
export const ChannelValidationSecurity = {
  /**
   * Rate limiting key for nonce validation attempts
   */
  getRateLimitKey: (nonce: string, ip?: string) => {
    const noncePrefix = nonce.substring(0, 8);
    return `nonce_validation:${noncePrefix}:${ip || 'unknown'}`;
  },

  /**
   * Sanitize channel ID for logging
   */
  sanitizeChannelIdForLogging: (channelId: string) => {
    return channelId?.toLowerCase().trim() || 'unknown';
  },

  /**
   * Sanitize user handle for logging (preserve privacy)
   */
  sanitizeUserHandleForLogging: (userHandle: string) => {
    if (!userHandle || userHandle.length <= 3) {
      return 'xxx';
    }
    return userHandle.substring(0, 3) + '...';
  },

  /**
   * Sanitize nonce for logging (preserve privacy)
   */
  sanitizeNonceForLogging: (nonce: string) => {
    if (!nonce || nonce.length <= 8) {
      return 'xxx...';
    }
    return nonce.substring(0, 8) + '...';
  },
} as const;