/**
 * Audit trail system for security monitoring and compliance
 * Tracks all significant operations and state changes
 */

import { getLogger, OperationType } from './channel-operations-logger';

/**
 * Audit event types
 */
export enum AuditEventType {
  USER_REGISTRATION = 'user_registration',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  CHANNEL_LINKED = 'channel_linked',
  CHANNEL_UNLINKED = 'channel_unlinked',
  CHANNEL_VERIFICATION = 'channel_verification',
  NONCE_GENERATED = 'nonce_generated',
  NONCE_VALIDATED = 'nonce_validated',
  RATE_LIMIT_TRIGGERED = 'rate_limit_triggered',
  SECURITY_VIOLATION = 'security_violation',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change',
  ADMIN_ACTION = 'admin_action',
}

/**
 * Audit context information
 */
export interface AuditContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  timestamp?: string;
}

/**
 * Audit event data
 */
export interface AuditEvent {
  eventType: AuditEventType;
  resource: string;
  resourceId?: string;
  action: string;
  success: boolean;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason?: string;
  context: AuditContext;
}

/**
 * Audit trail configuration
 */
export interface AuditConfig {
  enableAuditTrail: boolean;
  retentionDays: number;
  includeStateChanges: boolean;
  includeMetadata: boolean;
  sensitiveDataHandling: 'redact' | 'hash' | 'exclude';
}

/**
 * Default audit configuration
 */
const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enableAuditTrail: true,
  retentionDays: 365, // 1 year retention
  includeStateChanges: true,
  includeMetadata: true,
  sensitiveDataHandling: 'redact',
};

/**
 * Audit Trail class
 */
export class AuditTrail {
  private static instance: AuditTrail;
  private config: AuditConfig;
  private logger: ReturnType<typeof getLogger>;

  private constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    this.logger = getLogger();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<AuditConfig>): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail(config);
    }
    return AuditTrail.instance;
  }

  /**
   * Record an audit event
   */
  public async recordEvent(event: AuditEvent): Promise<void> {
    if (!this.config.enableAuditTrail) {
      return;
    }

    try {
      // Sanitize sensitive data
      const sanitizedEvent = this.sanitizeAuditEvent(event);

      // Log the audit event
      await this.logger.logAudit({
        operation: this.determineOperationType(sanitizedEvent.action),
        action: sanitizedEvent.action,
        resource: sanitizedEvent.resource,
        resourceId: sanitizedEvent.resourceId,
        previousState: sanitizedEvent.previousState,
        newState: sanitizedEvent.newState,
        success: sanitizedEvent.success,
        reason: sanitizedEvent.reason,
        message: this.generateAuditMessage(sanitizedEvent),
        userId: sanitizedEvent.context.userId,
        sessionId: sanitizedEvent.context.sessionId,
        ip: sanitizedEvent.context.ip,
        userAgent: sanitizedEvent.context.userAgent,
        requestId: sanitizedEvent.context.requestId,
      });

      // Log to console for immediate visibility in development
      if (process.env.NODE_ENV === 'development') {
        console.info('AUDIT_TRAIL:', {
          eventType: sanitizedEvent.eventType,
          resource: sanitizedEvent.resource,
          action: sanitizedEvent.action,
          success: sanitizedEvent.success,
          userId: sanitizedEvent.context.userId,
          timestamp: sanitizedEvent.context.timestamp || new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error('Failed to record audit event:', error);
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  /**
   * Record user registration event
   */
  public async recordUserRegistration(
    userId: string,
    email: string,
    success: boolean,
    context: AuditContext,
    reason?: string
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.USER_REGISTRATION,
      resource: 'user',
      resourceId: userId,
      action: 'register',
      success,
      newState: { email, userId },
      reason,
      context,
    });
  }

  /**
   * Record user login event
   */
  public async recordUserLogin(
    userId: string,
    email: string,
    success: boolean,
    context: AuditContext,
    reason?: string
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.USER_LOGIN,
      resource: 'user',
      resourceId: userId,
      action: 'login',
      success,
      metadata: { email },
      reason,
      context,
    });
  }

  /**
   * Record channel linking event
   */
  public async recordChannelLinking(
    userId: string,
    channelId: string,
    channelType: string,
    success: boolean,
    context: AuditContext,
    previousState?: Record<string, unknown>,
    reason?: string
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.CHANNEL_LINKED,
      resource: 'channel',
      resourceId: `${channelType}:${channelId}`,
      action: 'link',
      success,
      previousState,
      newState: {
        userId,
        channelId,
        channelType,
        linkedAt: new Date().toISOString(),
      },
      reason,
      context,
    });
  }

  /**
   * Record nonce validation event
   */
  public async recordNonceValidation(
    nonce: string,
    channelId: string,
    success: boolean,
    context: AuditContext,
    reason?: string
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.NONCE_VALIDATED,
      resource: 'nonce',
      resourceId: this.sanitizeNonce(nonce),
      action: 'validate',
      success,
      metadata: { channelId },
      reason,
      context,
    });
  }

  /**
   * Record rate limiting event
   */
  public async recordRateLimitTriggered(
    key: string,
    operation: string,
    context: AuditContext,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.RATE_LIMIT_TRIGGERED,
      resource: 'rate_limit',
      resourceId: key,
      action: 'triggered',
      success: true, // Rate limit working as intended
      metadata: {
        operation,
        ...metadata,
      },
      context,
    });
  }

  /**
   * Record security violation
   */
  public async recordSecurityViolation(
    violationType: string,
    severity: string,
    resource: string,
    context: AuditContext,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.SECURITY_VIOLATION,
      resource,
      action: 'security_violation',
      success: false, // Security violations are failures
      metadata: {
        violationType,
        severity,
        ...details,
      },
      reason: `Security violation: ${violationType}`,
      context,
    });
  }

  /**
   * Record data access event
   */
  public async recordDataAccess(
    resource: string,
    resourceId: string,
    action: string,
    success: boolean,
    context: AuditContext,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.DATA_ACCESS,
      resource,
      resourceId,
      action,
      success,
      metadata,
      context,
    });
  }

  /**
   * Record admin action
   */
  public async recordAdminAction(
    adminUserId: string,
    action: string,
    resource: string,
    resourceId: string,
    success: boolean,
    context: AuditContext,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>
  ): Promise<void> {
    await this.recordEvent({
      eventType: AuditEventType.ADMIN_ACTION,
      resource,
      resourceId,
      action,
      success,
      previousState,
      newState,
      metadata: { adminUserId },
      context,
    });
  }

  /**
   * Generate human-readable audit message
   */
  private generateAuditMessage(event: AuditEvent): string {
    const action = event.success ? 'succeeded' : 'failed';
    const user = event.context.userId ? ` by user ${event.context.userId}` : '';
    const resource = event.resourceId ? `${event.resource} ${event.resourceId}` : event.resource;
    
    return `${event.action} on ${resource} ${action}${user}`;
  }

  /**
   * Sanitize audit event data
   */
  private sanitizeAuditEvent(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };

    // Handle sensitive data based on configuration
    if (this.config.sensitiveDataHandling === 'redact') {
      sanitized.previousState = this.redactSensitiveData(event.previousState);
      sanitized.newState = this.redactSensitiveData(event.newState);
      sanitized.metadata = this.redactSensitiveData(event.metadata);
    } else if (this.config.sensitiveDataHandling === 'exclude') {
      if (!this.config.includeStateChanges) {
        sanitized.previousState = undefined;
        sanitized.newState = undefined;
      }
      if (!this.config.includeMetadata) {
        sanitized.metadata = undefined;
      }
    }

    return sanitized;
  }

  /**
   * Redact sensitive data from objects
   */
  private redactSensitiveData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!data) {
      return data;
    }

    const redacted = { ...data };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'nonce',
      'email',
      'phone',
      'ssn',
      'credit_card',
      'api_key',
    ];

    for (const field of sensitiveFields) {
      if (redacted[field]) {
        if (field === 'email') {
          redacted[field] = this.sanitizeEmail(String(redacted[field]));
        } else if (field === 'nonce') {
          redacted[field] = this.sanitizeNonce(String(redacted[field]));
        } else {
          redacted[field] = '[REDACTED]';
        }
      }
    }

    return redacted;
  }

  /**
   * Sanitize email for audit logs
   */
  private sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '[INVALID_EMAIL]';
    }
    
    const parts = email.split('@');
    if (parts.length !== 2) {
      return '[INVALID_EMAIL]';
    }
    
    const [local, domain] = parts;
    const sanitizedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***';
    
    return `${sanitizedLocal}@${domain}`;
  }

  /**
   * Sanitize nonce for audit logs
   */
  private sanitizeNonce(nonce: string): string {
    if (!nonce || typeof nonce !== 'string') {
      return '[INVALID_NONCE]';
    }
    
    return nonce.length > 8 ? nonce.substring(0, 8) + '...' : nonce;
  }

  /**
   * Determine operation type based on action
   */
  private determineOperationType(action: string): OperationType {
    // Map audit actions to operation types
    switch (action.toLowerCase()) {
      case 'link':
      case 'unlink':
        return OperationType.CHANNEL_LINKING;
      case 'validate':
        return OperationType.NONCE_VALIDATION;
      case 'login':
      case 'logout':
      case 'register':
        return OperationType.USER_AUTHENTICATION;
      case 'rate_limit':
        return OperationType.RATE_LIMITING;
      case 'validate_input':
        return OperationType.INPUT_VALIDATION;
      case 'security_violation':
        return OperationType.SECURITY_VIOLATION;
      default:
        return OperationType.ERROR_HANDLING;
    }
  }

  /**
   * Get audit statistics
   */
  public async getAuditStatistics(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    successRate: number;
    securityViolations: number;
  }> {
    // This would typically query the database
    // For now, return placeholder data
    return {
      totalEvents: 0,
      eventsByType: {},
      successRate: 0,
      securityViolations: 0,
    };
  }

  /**
   * Clean up old audit records
   */
  public async cleanupOldRecords(): Promise<number> {
    // This would typically delete old records from the database
    // Implementation depends on the storage mechanism
    return 0;
  }
}

/**
 * Convenience functions for common audit scenarios
 */

/**
 * Get audit trail instance
 */
export function getAuditTrail(config?: Partial<AuditConfig>): AuditTrail {
  return AuditTrail.getInstance(config);
}

/**
 * Record successful channel linking
 */
export async function auditChannelLinkingSuccess(
  userId: string,
  channelId: string,
  channelType: string,
  context: AuditContext
): Promise<void> {
  const audit = getAuditTrail();
  await audit.recordChannelLinking(
    userId,
    channelId,
    channelType,
    true,
    context
  );
}

/**
 * Record failed channel linking
 */
export async function auditChannelLinkingFailure(
  userId: string,
  channelId: string,
  channelType: string,
  reason: string,
  context: AuditContext
): Promise<void> {
  const audit = getAuditTrail();
  await audit.recordChannelLinking(
    userId,
    channelId,
    channelType,
    false,
    context,
    undefined,
    reason
  );
}

/**
 * Record user authentication event
 */
export async function auditUserAuthentication(
  userId: string,
  email: string,
  action: 'login' | 'logout' | 'register',
  success: boolean,
  context: AuditContext,
  reason?: string
): Promise<void> {
  const audit = getAuditTrail();
  
  switch (action) {
    case 'register':
      await audit.recordUserRegistration(userId, email, success, context, reason);
      break;
    case 'login':
      await audit.recordUserLogin(userId, email, success, context, reason);
      break;
    case 'logout':
      await audit.recordEvent({
        eventType: AuditEventType.USER_LOGOUT,
        resource: 'user',
        resourceId: userId,
        action: 'logout',
        success,
        metadata: { email },
        reason,
        context,
      });
      break;
  }
}

/**
 * Record security violation
 */
export async function auditSecurityViolation(
  violationType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  resource: string,
  context: AuditContext,
  details?: Record<string, unknown>
): Promise<void> {
  const audit = getAuditTrail();
  await audit.recordSecurityViolation(
    violationType,
    severity,
    resource,
    context,
    details
  );
}