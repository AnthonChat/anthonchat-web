/**
 * URL parameter utilities for handling query parameters in registration and channel linking flows
 */

/**
 * Extract URL parameters from a URL string or URLSearchParams object
 * @param source - URL string, URLSearchParams, or Request object
 * @returns Object with extracted parameters
 */
export function extractUrlParams(source: string | URLSearchParams | Request): Record<string, string> {
  let searchParams: URLSearchParams;

  if (typeof source === 'string') {
    try {
      const url = new URL(source);
      searchParams = url.searchParams;
    } catch {
      // If it's not a valid URL, treat it as a query string
      searchParams = new URLSearchParams(source.startsWith('?') ? source.slice(1) : source);
    }
  } else if (source instanceof URLSearchParams) {
    searchParams = source;
  } else if (source instanceof Request) {
    const url = new URL(source.url);
    searchParams = url.searchParams;
  } else {
    return {};
  }

  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}

/**
 * Validate a URL parameter value
 * @param value - Parameter value to validate
 * @param options - Validation options
 * @returns True if valid, false otherwise
 */
export function validateUrlParam(
  value: string | null | undefined,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: string[];
  } = {}
): boolean {
  const { required = false, minLength, maxLength, pattern, allowedValues } = options;

  // Check if required
  if (required && (!value || value.trim() === '')) {
    return false;
  }

  // If not required and empty, it's valid
  if (!value || value.trim() === '') {
    return !required;
  }

  const trimmedValue = value.trim();

  // Check length constraints
  if (minLength !== undefined && trimmedValue.length < minLength) {
    return false;
  }

  if (maxLength !== undefined && trimmedValue.length > maxLength) {
    return false;
  }

  // Check pattern
  if (pattern && !pattern.test(trimmedValue)) {
    return false;
  }

  // Check allowed values
  if (allowedValues && !allowedValues.includes(trimmedValue)) {
    return false;
  }

  return true;
}

/**
 * Build a URL with parameters
 * @param baseUrl - Base URL
 * @param params - Parameters to add
 * @param options - Build options
 * @returns Complete URL with parameters
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: Record<string, string | null | undefined>,
  options: {
    preserveExisting?: boolean;
    removeEmpty?: boolean;
  } = {}
): string {
  const { preserveExisting = true, removeEmpty = true } = options;

  try {
    // Handle relative URLs by using a dummy base
    const isRelative = !baseUrl.includes('://');
    const urlToUse = isRelative ? `https://dummy.com${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}` : baseUrl;
    
    const url = new URL(urlToUse);
    
    // If not preserving existing, clear current params
    if (!preserveExisting) {
      url.search = '';
    }

    // Add new parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        if (removeEmpty) {
          url.searchParams.delete(key);
        }
        return;
      }

      const stringValue = String(value);
      if (removeEmpty && stringValue.trim() === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, stringValue);
      }
    });

    const finalUrl = isRelative ? url.pathname + url.search + url.hash : url.toString();
    return finalUrl;
  } catch (error) {
    // If URL construction fails, return the base URL
    console.error('Failed to build URL with params:', error);
    return baseUrl;
  }
}

/**
 * Common parameter validation patterns
 */
export const URL_PARAM_PATTERNS = {
  // Channel ID: alphanumeric with underscores and hyphens
  CHANNEL_ID: /^[a-zA-Z0-9_-]+$/,
  
  // Nonce: supports both UUID format and base64url pattern
  NONCE: /^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}|[a-zA-Z0-9_-]+)$/,
  
  // Email: basic email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Locale: two-letter language code
  LOCALE: /^[a-z]{2}$/,
} as const;

/**
 * Validate channel linking parameters
 * @param params - Parameters to validate
 * @returns Validation result with details
 */
export function validateChannelLinkingParams(params: {
  link?: string | null;
  channel?: string | null;
  message?: string | null;
}): {
  isValid: boolean;
  errors: string[];
  validParams: {
    link?: string;
    channel?: string;
    message?: string;
  };
} {
  const errors: string[] = [];
  const validParams: { link?: string; channel?: string; message?: string } = {};

  // Validate link (nonce)
  if (params.link) {
    if (validateUrlParam(params.link, {
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: URL_PARAM_PATTERNS.NONCE,
    })) {
      validParams.link = params.link.trim();
    } else {
      errors.push('Invalid link parameter format');
    }
  }

  // Validate channel
  if (params.channel) {
    if (validateUrlParam(params.channel, {
      required: true,
      minLength: 1,
      maxLength: 64,
      pattern: URL_PARAM_PATTERNS.CHANNEL_ID,
    })) {
      validParams.channel = params.channel.trim();
    } else {
      errors.push('Invalid channel parameter format');
    }
  }

  // Validate message (optional, just length check)
  if (params.message) {
    if (validateUrlParam(params.message, {
      maxLength: 500,
    })) {
      validParams.message = params.message.trim();
    } else {
      errors.push('Message parameter too long');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validParams,
  };
}