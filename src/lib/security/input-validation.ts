/**
 * Comprehensive input validation for channel linking security
 * Provides strict validation for all channel and nonce parameters
 */

import { sanitizeChannelId, sanitizeNonce } from '@/lib/utils/sanitization';
import { validateNonceFormat, validateChannelId } from '@/lib/utils/channel-validation';
import { z } from 'zod';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
  securityFlags: string[];
}

/**
 * Security validation configuration
 */
export interface SecurityValidationConfig {
  maxLength: number;
  allowedCharacters: RegExp;
  requiredFormat?: RegExp;
  blacklistedPatterns: RegExp[];
  rateLimitKey?: string;
}

/**
 * Predefined security configurations for different parameter types
 */
export const SECURITY_CONFIGS = {
  nonce: {
    maxLength: 128,
    allowedCharacters: /^[a-zA-Z0-9_-]+$/,
    requiredFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    blacklistedPatterns: [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /<[^>]*>/,
      /['"]/,
    ],
  },
  channelId: {
    maxLength: 64,
    allowedCharacters: /^[a-z0-9_-]+$/,
    blacklistedPatterns: [
      /script/i,
      /javascript/i,
      /admin/i,
      /system/i,
      /root/i,
      /<[^>]*>/,
      /['"]/,
    ],
  },
  userHandle: {
    maxLength: 100,
    allowedCharacters: /^[a-zA-Z0-9@+._-]+$/,
    blacklistedPatterns: [
      /script/i,
      /javascript/i,
      /<[^>]*>/,
      /['"]/,
      /\.\./,
      /\/\//,
    ],
  },
  email: {
    maxLength: 254,
    allowedCharacters: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    blacklistedPatterns: [
      /script/i,
      /javascript/i,
      /<[^>]*>/,
      /['"]/,
    ],
  },
} as const;

// Zod schemas for secure input validation
const blacklistRefinement = (patterns: readonly RegExp[], label: string) => (val: string) =>
  !patterns.some((p) => p.test(val)) || `${label} contains prohibited characters or patterns`;

const NonceSchema = z
  .string()
  .trim()
  .min(1, 'nonce cannot be empty')
  .max(
    SECURITY_CONFIGS.nonce.maxLength,
    `nonce exceeds maximum length of ${SECURITY_CONFIGS.nonce.maxLength} characters`
  )
  .regex(SECURITY_CONFIGS.nonce.allowedCharacters, 'nonce contains invalid characters')
  .refine(
    blacklistRefinement(SECURITY_CONFIGS.nonce.blacklistedPatterns, 'nonce'),
    'nonce contains prohibited characters or patterns'
  )
  .regex(SECURITY_CONFIGS.nonce.requiredFormat!, 'nonce does not match required format')
  .refine((val) => validateNonceFormat(val), 'Invalid nonce format');

const ChannelIdSchema = z
  .string()
  .trim()
  .min(1, 'channelId cannot be empty')
  .max(
    SECURITY_CONFIGS.channelId.maxLength,
    `channelId exceeds maximum length of ${SECURITY_CONFIGS.channelId.maxLength} characters`
  )
  .regex(SECURITY_CONFIGS.channelId.allowedCharacters, 'channelId contains invalid characters')
  .refine(
    blacklistRefinement(SECURITY_CONFIGS.channelId.blacklistedPatterns, 'channelId'),
    'channelId contains prohibited characters or patterns'
  )
  .refine((val) => validateChannelId(val).isValid, 'Invalid channel ID');

const UserHandleSchema = z
  .string()
  .trim()
  .min(1, 'userHandle cannot be empty')
  .max(
    SECURITY_CONFIGS.userHandle.maxLength,
    `userHandle exceeds maximum length of ${SECURITY_CONFIGS.userHandle.maxLength} characters`
  )
  .regex(SECURITY_CONFIGS.userHandle.allowedCharacters, 'userHandle contains invalid characters')
  .refine(
    blacklistRefinement(SECURITY_CONFIGS.userHandle.blacklistedPatterns, 'userHandle'),
    'userHandle contains prohibited characters or patterns'
  );

const EmailSchema = z
  .string()
  .trim()
  .max(
    SECURITY_CONFIGS.email.maxLength,
    `email exceeds maximum length of ${SECURITY_CONFIGS.email.maxLength} characters`
  )
  .regex(SECURITY_CONFIGS.email.allowedCharacters, 'Invalid email format')
  .transform((val) => val.toLowerCase());

const SECURITY_SCHEMAS = {
  nonce: NonceSchema,
  channelId: ChannelIdSchema,
  userHandle: UserHandleSchema,
  email: EmailSchema,
} as const;

/**
 * Comprehensive input validation with security checks
 */
export function validateSecureInput(
  input: string | null | undefined,
  type: keyof typeof SECURITY_CONFIGS,
  _customConfig?: Partial<SecurityValidationConfig>
): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    securityFlags: [],
  };

  // Check for null/undefined/empty
  if (!input || typeof input !== 'string') {
    result.errors.push(`${type} is required and must be a string`);
    return result;
  }

  const trimmedInput = input.trim();

  // Touch _customConfig to avoid unused param lint; future dynamic schemas may use it
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  _customConfig && (_customConfig.maxLength ?? _customConfig.allowedCharacters ?? _customConfig.requiredFormat);

  // Zod-based validation
  const schema = (SECURITY_SCHEMAS as Record<string, z.ZodTypeAny>)[type];
  if (schema) {
    const parsed = schema.safeParse(trimmedInput);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      result.errors.push(...messages);

      // Map messages to security flags for compatibility
      const m = messages.join(' | ').toLowerCase();
      if (m.includes('exceeds maximum length')) result.securityFlags.push('length_violation');
      if (m.includes('prohibited')) result.securityFlags.push('blacklisted_pattern');
      if (m.includes('invalid') && m.includes('characters')) result.securityFlags.push('invalid_characters');
      if (m.includes('required format')) result.securityFlags.push('format_violation');
      if (m.includes('invalid nonce')) result.securityFlags.push('invalid_nonce_format');

      result.securityFlags.push('zod_validation_failed');
      return result;
    }
    // If needed, we could use parsed.data for normalized value (email lowercasing),
    // but we keep downstream sanitization logic unchanged for backward compatibility.
  }

  // Additional type-specific validation
  let sanitizedValue = trimmedInput;
  
  switch (type) {
    case 'nonce':
      if (!validateNonceFormat(trimmedInput)) {
        result.errors.push('Invalid nonce format');
        result.securityFlags.push('invalid_nonce_format');
        return result;
      }
      sanitizedValue = sanitizeNonce(trimmedInput) || '';
      break;
      
    case 'channelId':
      const channelValidation = validateChannelId(trimmedInput);
      if (!channelValidation.isValid) {
        result.errors.push(channelValidation.error || 'Invalid channel ID');
        result.securityFlags.push('invalid_channel');
        return result;
      }
      sanitizedValue = sanitizeChannelId(trimmedInput) || '';
      break;
      
    case 'email':
      // Additional email validation
      if (!trimmedInput.includes('@') || !trimmedInput.includes('.')) {
        result.errors.push('Invalid email format');
        result.securityFlags.push('invalid_email_format');
        return result;
      }
      sanitizedValue = trimmedInput.toLowerCase();
      break;
  }

  if (!sanitizedValue) {
    result.errors.push(`${type} failed sanitization`);
    result.securityFlags.push('sanitization_failed');
    return result;
  }

  result.isValid = true;
  result.sanitizedValue = sanitizedValue;
  return result;
}

/**
 * Validate multiple inputs at once
 */
export function validateSecureInputs(inputs: {
  [key: string]: {
    value: string | null | undefined;
    type: keyof typeof SECURITY_CONFIGS;
    required?: boolean;
  };
}): {
  isValid: boolean;
  results: { [key: string]: ValidationResult };
  errors: string[];
  securityFlags: string[];
} {
  const results: { [key: string]: ValidationResult } = {};
  const allErrors: string[] = [];
  const allSecurityFlags: string[] = [];

  for (const [key, config] of Object.entries(inputs)) {
    // Skip validation for optional empty values
    if (!config.required && (!config.value || config.value.trim() === '')) {
      results[key] = {
        isValid: true,
        errors: [],
        securityFlags: [],
      };
      continue;
    }

    const result = validateSecureInput(config.value, config.type);
    results[key] = result;

    if (!result.isValid) {
      allErrors.push(...result.errors.map(error => `${key}: ${error}`));
      allSecurityFlags.push(...result.securityFlags);
    }
  }

  return {
    isValid: allErrors.length === 0,
    results,
    errors: allErrors,
    securityFlags: [...new Set(allSecurityFlags)], // Remove duplicates
  };
}

/**
 * Validate channel linking parameters with comprehensive security checks
 */
export function validateChannelLinkingInputs(params: {
  nonce?: string | null;
  channelId?: string | null;
  userHandle?: string | null;
  email?: string | null;
}): {
  isValid: boolean;
  sanitizedParams: {
    nonce?: string;
    channelId?: string;
    userHandle?: string;
    email?: string;
  };
  errors: string[];
  securityFlags: string[];
} {
  const validation = validateSecureInputs({
    nonce: {
      value: params.nonce,
      type: 'nonce',
      required: true,
    },
    channelId: {
      value: params.channelId,
      type: 'channelId',
      required: true,
    },
    userHandle: {
      value: params.userHandle,
      type: 'userHandle',
      required: false,
    },
    email: {
      value: params.email,
      type: 'email',
      required: false,
    },
  });

  const sanitizedParams: {
    nonce?: string;
    channelId?: string;
    userHandle?: string;
    email?: string;
  } = {};

  // Extract sanitized values
  for (const [key, result] of Object.entries(validation.results)) {
    if (result.isValid && result.sanitizedValue) {
      sanitizedParams[key as keyof typeof sanitizedParams] = result.sanitizedValue;
    }
  }

  return {
    isValid: validation.isValid,
    sanitizedParams,
    errors: validation.errors,
    securityFlags: validation.securityFlags,
  };
}

/**
 * Security headers and CSP validation
 */
export function validateSecurityHeaders(headers: Record<string, string>): {
  isValid: boolean;
  violations: string[];
  recommendations: string[];
} {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Check for required security headers
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
  ];

  for (const header of requiredHeaders) {
    if (!headers[header]) {
      violations.push(`Missing security header: ${header}`);
    }
  }

  // Check Content-Security-Policy
  if (!headers['content-security-policy']) {
    recommendations.push('Consider adding Content-Security-Policy header');
  }

  // Check for potentially dangerous headers
  const dangerousHeaders = ['x-powered-by', 'server'];
  for (const header of dangerousHeaders) {
    if (headers[header]) {
      recommendations.push(`Consider removing ${header} header to avoid information disclosure`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    recommendations,
  };
}

/**
 * IP address validation and sanitization
 */
export function validateAndSanitizeIP(ip: string | null | undefined): {
  isValid: boolean;
  sanitizedIP?: string;
  type?: 'ipv4' | 'ipv6';
  isPrivate?: boolean;
} {
  if (!ip || typeof ip !== 'string') {
    return { isValid: false };
  }

  const trimmedIP = ip.trim();

  // IPv4 validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = trimmedIP.match(ipv4Regex);
  
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    
    // Check if all octets are valid (0-255)
    if (octets.every(octet => octet >= 0 && octet <= 255)) {
      const isPrivate = 
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 127); // localhost
      
      return {
        isValid: true,
        sanitizedIP: trimmedIP,
        type: 'ipv4',
        isPrivate,
      };
    }
  }

  // IPv6 validation (basic)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  if (ipv6Regex.test(trimmedIP)) {
    const isPrivate = trimmedIP === '::1' || trimmedIP.startsWith('fc') || trimmedIP.startsWith('fd');
    
    return {
      isValid: true,
      sanitizedIP: trimmedIP.toLowerCase(),
      type: 'ipv6',
      isPrivate,
    };
  }

  return { isValid: false };
}

/**
 * User agent validation and sanitization
 */
export function validateAndSanitizeUserAgent(userAgent: string | null | undefined): {
  isValid: boolean;
  sanitizedUserAgent?: string;
  isSuspicious: boolean;
  flags: string[];
} {
  const flags: string[] = [];
  
  if (!userAgent || typeof userAgent !== 'string') {
    return {
      isValid: false,
      isSuspicious: true,
      flags: ['missing_user_agent'],
    };
  }

  const trimmed = userAgent.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      isSuspicious: true,
      flags: ['empty_user_agent'],
    };
  }

  if (trimmed.length > 1000) {
    flags.push('oversized_user_agent');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /script/i,
  ];

  let isSuspicious = false;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      flags.push('suspicious_pattern');
      isSuspicious = true;
      break;
    }
  }

  // Sanitize by removing potentially dangerous characters
  const sanitized = trimmed.replace(/[<>'"]/g, '');

  return {
    isValid: true,
    sanitizedUserAgent: sanitized,
    isSuspicious,
    flags,
  };
}