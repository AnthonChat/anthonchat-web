/**
 * String sanitization utilities for secure handling of user input and parameters
 */

/**
 * Sanitize channel ID by removing invalid characters and normalizing format
 * @param channelId - Raw channel ID input
 * @returns Sanitized channel ID or null if invalid
 */
export function sanitizeChannelId(channelId: string | null | undefined): string | null {
  if (!channelId || typeof channelId !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  const cleaned = channelId.trim().toLowerCase();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  // Remove any characters that aren't alphanumeric, underscore, or hyphen
  const sanitized = cleaned.replace(/[^a-z0-9_-]/g, '');

  // Check length constraints (1-64 characters)
  if (sanitized.length < 1 || sanitized.length > 64) {
    return null;
  }

  // Ensure it doesn't start or end with special characters
  const normalized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  return normalized || null;
}

/**
 * Sanitize nonce by validating format and removing invalid characters
 * Supports both UUID format (with hyphens) and base64url format
 * @param nonce - Raw nonce input
 * @returns Sanitized nonce or null if invalid
 */
export function sanitizeNonce(nonce: string | null | undefined): string | null {
  if (!nonce || typeof nonce !== 'string') {
    return null;
  }

  // Remove whitespace
  const cleaned = nonce.trim();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  // Check for UUID format (8-4-4-4-12 hexadecimal digits with hyphens)
  const uuidPattern = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  if (uuidPattern.test(cleaned)) {
    return cleaned.toLowerCase(); // Normalize to lowercase
  }

  // Check for base64url format (letters, numbers, hyphens, underscores)
  const base64UrlPattern = /^[a-zA-Z0-9_-]+$/;
  if (base64UrlPattern.test(cleaned)) {
    // Check length constraints for base64url (8-128 characters for security)
    if (cleaned.length >= 8 && cleaned.length <= 128) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Escape HTML characters to prevent XSS attacks
 * @param input - Raw string input
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Sanitize email address by normalizing format and validating
 * @param email - Raw email input
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  const cleaned = email.trim().toLowerCase();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  // Basic email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(cleaned)) {
    return null;
  }

  // Check length constraints
  if (cleaned.length > 254) {
    return null;
  }

  return cleaned;
}

/**
 * Sanitize message content by removing dangerous characters and limiting length
 * @param message - Raw message input
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized message or null if invalid
 */
export function sanitizeMessage(
  message: string | null | undefined,
  maxLength: number = 500
): string | null {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // Remove leading/trailing whitespace but preserve internal whitespace
  const cleaned = message.trim();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  // Check length constraint
  if (cleaned.length > maxLength) {
    return null;
  }

  // Remove control characters but keep printable characters and common whitespace
  const sanitized = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized || null;
}

/**
 * Sanitize locale code by validating format
 * @param locale - Raw locale input
 * @returns Sanitized locale or null if invalid
 */
export function sanitizeLocale(locale: string | null | undefined): string | null {
  if (!locale || typeof locale !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  const cleaned = locale.trim().toLowerCase();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  // Validate two-letter language code format
  const localePattern = /^[a-z]{2}$/;
  if (!localePattern.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Sanitize URL by validating format and removing dangerous protocols
 * @param url - Raw URL input
 * @param allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string | null | undefined,
  allowedProtocols: string[] = ['http:', 'https:']
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Remove whitespace
  const cleaned = url.trim();

  // Check if empty after cleaning
  if (!cleaned) {
    return null;
  }

  try {
    const parsedUrl = new URL(cleaned);
    
    // Check if protocol is allowed
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return null;
    }

    // Return the normalized URL
    return parsedUrl.toString();
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Comprehensive sanitization for channel linking parameters
 * @param params - Raw parameters object
 * @returns Sanitized parameters object
 */
export function sanitizeChannelLinkingParams(params: {
  link?: string | null;
  channel?: string | null;
  message?: string | null;
  email?: string | null;
  locale?: string | null;
}): {
  link?: string;
  channel?: string;
  message?: string;
  email?: string;
  locale?: string;
} {
  const sanitized: {
    link?: string;
    channel?: string;
    message?: string;
    email?: string;
    locale?: string;
  } = {};

  // Sanitize each parameter
  const sanitizedLink = sanitizeNonce(params.link);
  if (sanitizedLink) {
    sanitized.link = sanitizedLink;
  }

  const sanitizedChannel = sanitizeChannelId(params.channel);
  if (sanitizedChannel) {
    sanitized.channel = sanitizedChannel;
  }

  const sanitizedMessage = sanitizeMessage(params.message);
  if (sanitizedMessage) {
    sanitized.message = sanitizedMessage;
  }

  const sanitizedEmail = sanitizeEmail(params.email);
  if (sanitizedEmail) {
    sanitized.email = sanitizedEmail;
  }

  const sanitizedLocale = sanitizeLocale(params.locale);
  if (sanitizedLocale) {
    sanitized.locale = sanitizedLocale;
  }

  return sanitized;
}