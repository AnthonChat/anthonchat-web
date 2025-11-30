/**
 * Redirect helper utilities for preserving parameters across navigation
 */

import { buildUrlWithParams } from "./url-params";
import { sanitizeChannelLinkingParams } from "./sanitization";

/**
 * Supported locales in the application
 */
const SUPPORTED_LOCALES = ["en", "it"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

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
  const { baseUrl = "", preserveEmpty = false, locale } = options;

  // Sanitize parameters
  const sanitizedParams = sanitizeChannelLinkingParams(params);

  // Build the base path with locale if provided
  let fullPath = targetPath;
  if (locale && isSupportedLocale(locale)) {
    // Ensure path starts with locale
    if (!targetPath.startsWith(`/${locale}`)) {
      fullPath = `/${locale}${
        targetPath.startsWith("/") ? "" : "/"
      }${targetPath}`;
    }
  }

  // Combine base URL with path
  const fullUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}${fullPath}`
    : fullPath;

  // Add parameters
  return buildUrlWithParams(fullUrl, sanitizedParams, {
    preserveExisting: false,
    removeEmpty: !preserveEmpty,
  });
}

/**
 * Preserve specific parameters across redirects (internal helper)
 */
function preserveParams(
  currentParams: Record<string, string | null | undefined>,
  paramsToPreserve: string[] = ["link", "channel", "message", "redirectTo"]
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
 * Common redirect destinations for the application
 */
export const REDIRECT_PATHS = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  SIGNUP_COMPLETE: "/signup/complete",
  DASHBOARD: "/dashboard",
  CHANNELS: "/dashboard/channels",
  HOME: "/",
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
  const redirectParams = { ...preserveParams(params, ["channel"]) };

  // Add context parameters
  if (context.channelLinked) {
    redirectParams.channel_linked = "true";
  }

  if (context.error) {
    redirectParams.error = context.error;
  }

  if (context.success) {
    redirectParams.success = context.success;
  }

  return buildRedirectUrl(REDIRECT_PATHS.DASHBOARD, redirectParams, {
    locale,
  });
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

  // Preserve redirectTo for post-auth navigation
  if (params.redirectTo) {
    redirectParams.redirectTo = params.redirectTo;
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
    redirectParams.skip_onboarding = "true";
  }

  if (context.channelLinkingError) {
    redirectParams.channel_error = "true";
  }

  if (context.fallbackOptions) {
    redirectParams.show_fallback = "true";
  }

  return buildRedirectUrl(REDIRECT_PATHS.SIGNUP_COMPLETE, redirectParams, {
    locale,
  });
}
