/**
 * Channel linking utilities - centralized exports for enhanced registration and channel linking
 */

// Local imports for internal use
import { extractUrlParams, validateChannelLinkingParams } from './url-params';
import { sanitizeChannelLinkingParams } from './sanitization';
import { buildAuthRedirectUrl, buildCrossPageUrl, createSafeRedirect } from './redirect-helpers';
// URL parameter utilities
export {
  extractUrlParams,
  validateUrlParam,
  buildUrlWithParams,
  URL_PARAM_PATTERNS,
  validateChannelLinkingParams,
} from './url-params';

// String sanitization utilities
export {
  sanitizeChannelId,
  sanitizeNonce,
  escapeHtml,
  sanitizeEmail,
  sanitizeMessage,
  sanitizeLocale,
  sanitizeUrl,
  sanitizeChannelLinkingParams,
} from './sanitization';

// Redirect helper utilities
export {
  buildRedirectUrl,
  preserveParams,
  getRedirectPath,
  REDIRECT_PATHS,
  buildAuthRedirectUrl,
  buildDashboardRedirectUrl,
  buildSignupCompleteRedirectUrl,
  extractLocaleFromPath,
  buildCrossPageUrl,
  isValidRedirectUrl,
  createSafeRedirect,
} from './redirect-helpers';

// Channel validation utilities
export {
  validateNonceFormat,
  isNonceExpired,
  generateNonce,
  validateNonce,
  validateChannelId,
  isSupportedChannel,
  getChannelConfig,
  validateUserHandle,
  getAllChannelConfigs,
  getActiveChannels,
  validateChannelLinkingData,
  ChannelValidationSecurity,
  SUPPORTED_CHANNELS,
  CHANNEL_CONFIGS,
  type SupportedChannel,
  type ChannelConfig,
  type NonceValidationResult,
  type ChannelValidationResult,
} from './channel-validation';

/**
 * Common channel linking parameter names
 */
export const CHANNEL_LINKING_PARAMS = {
  LINK: 'link',
  CHANNEL: 'channel',
  MESSAGE: 'message',
  EMAIL: 'email',
  LOCALE: 'locale',
} as const;

/**
 * Channel linking utility functions for common operations
 */
export const ChannelLinkingUtils = {
  /**
   * Extract and validate channel linking parameters from URL
   */
  extractAndValidateParams: (source: string | URLSearchParams | Request) => {
    const params = extractUrlParams(source);
    return validateChannelLinkingParams({
      link: params.link,
      channel: params.channel,
      message: params.message,
    });
  },

  /**
   * Sanitize and validate channel linking parameters
   */
  sanitizeAndValidateParams: (params: {
    link?: string | null;
    channel?: string | null;
    message?: string | null;
    email?: string | null;
    locale?: string | null;
  }) => {
    const sanitized = sanitizeChannelLinkingParams(params);
    const validation = validateChannelLinkingParams(sanitized);
    
    return {
      ...validation,
      sanitizedParams: sanitized,
    };
  },

  /**
   * Build authentication redirect with preserved parameters
   */
  buildAuthRedirect: (
    destination: 'LOGIN' | 'SIGNUP' | 'SIGNUP_COMPLETE' | 'DASHBOARD',
    params: Record<string, string | null | undefined>,
    locale?: string
  ) => {
    return buildAuthRedirectUrl(destination, params, locale);
  },

  /**
   * Check if parameters indicate a channel linking flow
   */
  hasChannelLinkingParams: (params: Record<string, string | null | undefined>) => {
    return !!(params.link && params.channel);
  },

  /**
   * Create safe cross-page navigation URL
   */
  buildSafeNavigation: (
    fromPath: string,
    toPath: string,
    params: Record<string, string | null | undefined>
  ) => {
    const url = buildCrossPageUrl(fromPath, toPath, params);
    return createSafeRedirect(url);
  },
} as const;