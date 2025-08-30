/**
 * Redirect helper utilities for preserving parameters across navigation
 */

import { buildUrlWithParams } from './url-params';
import { sanitizeChannelLinkingParams } from './sanitization';

/**
 * Supported locales in the application
 */
const SUPPORTED_LOCALES = ['en', 'it'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/**
 * Check if a locale is supported
 * @param locale - Locale to check
 * @returns True if supported, false otherwise
 */
function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Build a redirect URL with preserved parameters
 * @param targetPath - Target path to redirect to
 * @param params - Parameters to preserve
 * @param options - Redirect options
 * @returns Complete redirect URL
 */
export function buildRedirectUrl(
  targetPath: string,
  params: Record<string, string | null | undefined> = {},
  options: {
    baseUrl?: string;
    preserveEmpty?: boolean;
    locale?: string;
  } = {}
): string {
  const { baseUrl = '', preserveEmpty = false, locale } = options;

  // Sanitize parameters
  const sanitizedParams = sanitizeChannelLinkingParams(params);

  // Build the base path with locale if provided
  let fullPath = targetPath;
  if (locale && isSupportedLocale(locale)) {
    // Ensure path starts with locale
    if (!targetPath.startsWith(`/${locale}`)) {
      fullPath = `/${locale}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
    }
  }

  // Combine base URL with path
  const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${fullPath}` : fullPath;

  // Add parameters
  return buildUrlWithParams(fullUrl, sanitizedParams, {
    preserveExisting: false,
    removeEmpty: !preserveEmpty,
  });
}

/**
 * Preserve specific parameters across redirects
 * @param currentParams - Current URL parameters
 * @param paramsToPreserve - List of parameter names to preserve
 * @returns Filtered parameters object
 */
export function preserveParams(
  currentParams: Record<string, string | null | undefined>,
  paramsToPreserve: string[] = ['link', 'channel', 'message']
): Record<string, string | null | undefined> {
  const preserved: Record<string, string | null | undefined> = {};

  paramsToPreserve.forEach((paramName) => {
    if (currentParams[paramName] !== undefined) {
      preserved[paramName] = currentParams[paramName];
    }
  });

  return preserved;
}

/**
 * Get locale-aware redirect path
 * @param path - Base path
 * @param locale - Target locale
 * @param options - Path options
 * @returns Locale-aware path
 */
export function getRedirectPath(
  path: string,
  locale?: string,
  options: {
    fallbackLocale?: string;
    removeLocaleFromPath?: boolean;
  } = {}
): string {
  const { fallbackLocale = 'en', removeLocaleFromPath = false } = options;

  // Remove existing locale from path if requested
  if (removeLocaleFromPath) {
    const pathWithoutLocale = path.replace(/^\/[a-z]{2}(\/|$)/, '/');
    path = pathWithoutLocale === '/' ? '/' : pathWithoutLocale;
  }

  // Determine target locale
  const targetLocale = locale && isSupportedLocale(locale) ? locale : fallbackLocale;

  // Add locale to path
  if (path === '/') {
    return `/${targetLocale}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${targetLocale}${cleanPath}`;
}

/**
 * Common redirect destinations for the application
 */
export const REDIRECT_PATHS = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  SIGNUP_COMPLETE: '/signup/complete',
  DASHBOARD: '/dashboard',
  CHANNELS: '/dashboard/channels',
  HOME: '/',
} as const;

/**
 * Build authentication redirect URL with preserved channel linking parameters
 * @param destination - Target destination
 * @param params - Current parameters
 * @param locale - Target locale
 * @returns Complete redirect URL
 */
export function buildAuthRedirectUrl(
  destination: keyof typeof REDIRECT_PATHS,
  params: Record<string, string | null | undefined> = {},
  locale?: string
): string {
  const targetPath = REDIRECT_PATHS[destination];
  const preservedParams = preserveParams(params);

  return buildRedirectUrl(targetPath, preservedParams, { locale });
}

/**
 * Build dashboard redirect URL with success/error context
 * @param params - Current parameters
 * @param context - Additional context
 * @param locale - Target locale
 * @returns Dashboard redirect URL
 */
export function buildDashboardRedirectUrl(
  params: Record<string, string | null | undefined> = {},
  context: {
    channelLinked?: boolean;
    error?: string;
    success?: string;
  } = {},
  locale?: string
): string {
  const redirectParams = { ...preserveParams(params, ['channel']) };

  // Add context parameters
  if (context.channelLinked) {
    redirectParams.channel_linked = 'true';
  }

  if (context.error) {
    redirectParams.error = context.error;
  }

  if (context.success) {
    redirectParams.success = context.success;
  }

  return buildRedirectUrl(REDIRECT_PATHS.DASHBOARD, redirectParams, { locale });
}

/**
 * Build login redirect URL with preserved channel parameters and message
 * @param params - Parameters to preserve including channel and link
 * @param locale - Target locale
 * @returns Login redirect URL
 */
export function buildLoginRedirectUrl(
  params: Record<string, string | null | undefined> = {},
  locale?: string
): string {
  const redirectParams: Record<string, string> = {};

  // Preserve channel linking parameters
  if (params.channel) {
    redirectParams.channel = params.channel;
  }
  
  if (params.link) {
    redirectParams.link = params.link;
  }

  // Add message for user feedback
  if (params.message) {
    redirectParams.message = params.message;
  }

  return buildRedirectUrl(REDIRECT_PATHS.LOGIN, redirectParams, { locale });
}

/**
 * Build signup complete redirect URL with channel linking context
 * @param params - Current parameters
 * @param context - Channel linking context
 * @param locale - Target locale
 * @returns Signup complete redirect URL
 */
export function buildSignupCompleteRedirectUrl(
  params: Record<string, string | null | undefined> = {},
  context: {
    skipOnboarding?: boolean;
    channelLinkingError?: boolean;
    fallbackOptions?: boolean;
  } = {},
  locale?: string
): string {
  const redirectParams = { ...preserveParams(params) };

  // Add context parameters
  if (context.skipOnboarding) {
    redirectParams.skip_onboarding = 'true';
  }

  if (context.channelLinkingError) {
    redirectParams.channel_error = 'true';
  }

  if (context.fallbackOptions) {
    redirectParams.show_fallback = 'true';
  }

  return buildRedirectUrl(REDIRECT_PATHS.SIGNUP_COMPLETE, redirectParams, { locale });
}

/**
 * Extract locale from current path
 * @param path - Current path
 * @returns Extracted locale or null
 */
export function extractLocaleFromPath(path: string): string | null {
  const match = path.match(/^\/([a-z]{2})(\/|$)/);
  if (match && isSupportedLocale(match[1])) {
    return match[1];
  }
  return null;
}

/**
 * Build cross-page navigation URL with parameter preservation
 * @param fromPath - Current path
 * @param toPath - Target path
 * @param params - Parameters to preserve
 * @returns Navigation URL with preserved parameters
 */
export function buildCrossPageUrl(
  fromPath: string,
  toPath: string,
  params: Record<string, string | null | undefined> = {}
): string {
  // Extract locale from current path
  const currentLocale = extractLocaleFromPath(fromPath);
  
  // Preserve channel linking parameters
  const preservedParams = preserveParams(params);

  return buildRedirectUrl(toPath, preservedParams, { locale: currentLocale || undefined });
}

/**
 * Validate redirect URL for security
 * @param url - URL to validate
 * @param allowedDomains - Allowed domains for external redirects
 * @returns True if safe to redirect, false otherwise
 */
export function isValidRedirectUrl(
  url: string,
  allowedDomains: string[] = []
): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Allow relative URLs (same origin)
    if (!parsedUrl.host) {
      return true;
    }

    // Check if domain is in allowed list
    return allowedDomains.includes(parsedUrl.hostname);
  } catch {
    // If URL parsing fails, only allow if it looks like a relative path
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * Create a safe redirect function that validates URLs
 * @param url - Target URL
 * @param fallbackUrl - Fallback URL if target is invalid
 * @param allowedDomains - Allowed domains for external redirects
 * @returns Safe redirect URL
 */
export function createSafeRedirect(
  url: string,
  fallbackUrl: string = '/',
  allowedDomains: string[] = []
): string {
  if (isValidRedirectUrl(url, allowedDomains)) {
    return url;
  }
  return fallbackUrl;
}