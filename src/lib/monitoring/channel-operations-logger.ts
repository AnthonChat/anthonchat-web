/**
 * Log levels for different types of events
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Operation types for channel linking
 */
export enum OperationType {
  CHANNEL_LINKING = 'channel_linking',
  NONCE_VALIDATION = 'nonce_validation',
  USER_AUTHENTICATION = 'user_authentication',
  RATE_LIMITING = 'rate_limiting',
  INPUT_VALIDATION = 'input_validation',
  ERROR_HANDLING = 'error_handling',
  SECURITY_VIOLATION = 'security_violation',
}

/**
 * Base log entry structure
 */
export interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  operation: OperationType;
  message: string;
  sessionId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Channel linking specific log entry
 */
export interface ChannelLinkingLogEntry extends BaseLogEntry {
  operation: OperationType.CHANNEL_LINKING;
  channelId?: string;
  nonce?: string; // Sanitized (first 8 chars)
  userState?: 'new_user' | 'existing_logged_in' | 'existing_logged_out';
  linkingResult?: 'success' | 'failed' | 'rate_limited' | 'validation_failed';
  retryAttempt?: number;
  errorType?: string;
  fallbackUsed?: boolean;
}

/**
 * Security violation log entry
 */
export interface SecurityViolationLogEntry extends BaseLogEntry {
  operation: OperationType.SECURITY_VIOLATION;
  violationType: 'input_validation' | 'rate_limit_exceeded' | 'suspicious_activity' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  blocked: boolean;
  actionTaken?: string;
}

/**
 * Error tracking log entry
 */
export interface ErrorLogEntry extends BaseLogEntry {
  operation: OperationType.ERROR_HANDLING;
  errorType: string;
  errorMessage: string;
  stackTrace?: string[];
  context: Record<string, unknown>;
  recoveryAction?: string;
  userImpact: 'none' | 'minor' | 'major' | 'critical';
}

/**
 * Audit trail log entry
 */
export interface AuditLogEntry extends BaseLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  success: boolean;
  reason?: string;
}

/**
 * Performance metrics log entry
 */
export interface PerformanceLogEntry extends BaseLogEntry {
  operation: OperationType;
  duration: number; // milliseconds
  success: boolean;
  cacheHit?: boolean;
  dbQueries?: number;
  externalApiCalls?: number;
}

/**
 * Union type for all log entries
 */
export type LogEntry = 
  | ChannelLinkingLogEntry 
  | SecurityViolationLogEntry 
  | ErrorLogEntry 
  | AuditLogEntry 
  | PerformanceLogEntry 
  | BaseLogEntry;

/**
 * Logger configuration
 */
export interface LoggerConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  enableExternalLogging: boolean;
  logLevel: LogLevel;
  sanitizePersonalData: boolean;
  includeStackTrace: boolean;
  maxLogEntrySize: number;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  enableConsoleLogging: true,
  enableFileLogging: false,
enableExternalLogging: false,
  logLevel: LogLevel.INFO,
  sanitizePersonalData: true,
  includeStackTrace: false,
  maxLogEntrySize: 10000, // 10KB
};

/**
 * Channel Operations Logger class
 */
export class ChannelOperationsLogger {
  private static instance: ChannelOperationsLogger;
  private config: LoggerConfig;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<LoggerConfig>): ChannelOperationsLogger {
    if (!ChannelOperationsLogger.instance) {
      ChannelOperationsLogger.instance = new ChannelOperationsLogger(config);
    }
    return ChannelOperationsLogger.instance;
  }

  /**
   * Log a channel linking operation
   */
  public async logChannelLinking(entry: Omit<ChannelLinkingLogEntry, 'timestamp' | 'level'>): Promise<void> {
    const logEntry: ChannelLinkingLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      level: entry.linkingResult === 'success' ? LogLevel.INFO : LogLevel.WARN,
      nonce: this.sanitizeNonce(entry.nonce),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log a security violation
   */
  public async logSecurityViolation(entry: Omit<SecurityViolationLogEntry, 'timestamp' | 'level' | 'operation'>): Promise<void> {
    const logEntry: SecurityViolationLogEntry = {
      ...entry,
      operation: OperationType.SECURITY_VIOLATION,
      timestamp: new Date().toISOString(),
      level: this.getSecurityLogLevel(entry.severity),
      details: this.sanitizeLogData(entry.details),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log an error with context
   */
  public async logError(entry: Omit<ErrorLogEntry, 'timestamp' | 'level' | 'operation'>): Promise<void> {
    const logEntry: ErrorLogEntry = {
      ...entry,
      operation: OperationType.ERROR_HANDLING,
      timestamp: new Date().toISOString(),
      level: this.getErrorLogLevel(entry.userImpact),
      context: this.sanitizeLogData(entry.context),
      stackTrace: this.config.includeStackTrace ? entry.stackTrace : undefined,
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log an audit trail entry
   */
  public async logAudit(entry: Omit<AuditLogEntry, 'timestamp' | 'level'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      level: entry.success ? LogLevel.INFO : LogLevel.WARN,
      previousState: this.sanitizeLogData(entry.previousState),
      newState: this.sanitizeLogData(entry.newState),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log performance metrics
   */
  public async logPerformance(entry: Omit<PerformanceLogEntry, 'timestamp' | 'level'>): Promise<void> {
    const logEntry: PerformanceLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log a general operation
   */
  public async log(
    level: LogLevel,
    operation: OperationType,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const logEntry: BaseLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      ...this.sanitizeLogData(context || {}),
    };

    await this.writeLog(logEntry);
  }

  /**
   * Create a performance timer
   */
  public createPerformanceTimer(operation: OperationType, context?: Record<string, unknown>) {
    const startTime = Date.now();
    
    return {
      end: async (success: boolean = true, additionalContext?: Record<string, unknown>) => {
        const duration = Date.now() - startTime;
        
        await this.logPerformance({
          operation,
          duration,
          success,
          message: `${operation} completed in ${duration}ms`,
          ...context,
          ...additionalContext,
        });
      },
    };
  }

  /**
   * Write log entry to configured outputs
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    // Check log level
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Truncate if too large
    const truncatedEntry = this.truncateLogEntry(entry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.writeToConsole(truncatedEntry);
    }

    // File logging (if implemented)
    if (this.config.enableFileLogging) {
      await this.writeToFile(truncatedEntry);
    }

    // External logging service (if implemented)
    if (this.config.enableExternalLogging) {
      await this.writeToExternalService(truncatedEntry);
    }
  }

  /**
   * Write to console with appropriate formatting
   */
  private writeToConsole(entry: LogEntry): void {
    const logMethod = this.getConsoleMethod(entry.level);
    const formattedEntry = this.formatForConsole(entry);
    
    logMethod(formattedEntry);
  }

  /**
   * Write to file (placeholder for file logging implementation)
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    // Implementation would depend on the file logging strategy
    // Could use fs.appendFile or a logging library like Winston
    console.debug('File logging not implemented:', entry);
  }

  /**
   * Write to external service (placeholder for external logging)
   */
  private async writeToExternalService(entry: LogEntry): Promise<void> {
    // Implementation would depend on the external service
    // Could be Datadog, New Relic, CloudWatch, etc.
    console.debug('External logging not implemented:', entry);
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const entryLevelIndex = levels.indexOf(level);
    
    return entryLevelIndex >= currentLevelIndex;
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const operation = (entry.operation || 'UNKNOWN').toUpperCase().padEnd(20);
    
    let formatted = `[${timestamp}] ${level} ${operation} ${entry.message}`;
    
    // Add context for specific log types
    if ('channelId' in entry && entry.channelId) {
      formatted += ` | Channel: ${entry.channelId}`;
    }
    
    if ('userId' in entry && entry.userId) {
      formatted += ` | User: ${entry.userId}`;
    }
    
    if ('ip' in entry && entry.ip) {
      formatted += ` | IP: ${entry.ip}`;
    }

    return formatted;
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  private sanitizeLogData(data: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!data || !this.config.sanitizePersonalData) {
      return data || {};
    }

    const sanitized = { ...data };
    
    // Remove or sanitize sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'email', 'phone'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (field === 'email') {
          sanitized[field] = this.sanitizeEmail(String(sanitized[field]));
        } else {
          sanitized[field] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize email for logging
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
   * Sanitize nonce for logging
   */
  private sanitizeNonce(nonce?: string): string | undefined {
    if (!nonce) {
      return undefined;
    }
    
    return nonce.length > 8 ? nonce.substring(0, 8) + '...' : nonce;
  }

  /**
   * Get log level for security violations
   */
  private getSecurityLogLevel(severity: 'low' | 'medium' | 'high' | 'critical'): LogLevel {
    switch (severity) {
      case 'low':
        return LogLevel.INFO;
      case 'medium':
        return LogLevel.WARN;
      case 'high':
        return LogLevel.ERROR;
      case 'critical':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.WARN;
    }
  }

  /**
   * Get log level for errors based on user impact
   */
  private getErrorLogLevel(userImpact: 'none' | 'minor' | 'major' | 'critical'): LogLevel {
    switch (userImpact) {
      case 'none':
        return LogLevel.DEBUG;
      case 'minor':
        return LogLevel.INFO;
      case 'major':
        return LogLevel.ERROR;
      case 'critical':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Truncate log entry if it exceeds maximum size
   */
  private truncateLogEntry(entry: LogEntry): LogEntry {
    const serialized = JSON.stringify(entry);
    
    if (serialized.length <= this.config.maxLogEntrySize) {
      return entry;
    }

    // Create truncated version
    const truncated = { ...entry };
    truncated.message = truncated.message.substring(0, 500) + '... [TRUNCATED]';
    
    // Remove large fields
    if ('context' in truncated) {
      truncated.context = { truncated: true, originalSize: serialized.length };
    }
    
    if ('details' in truncated) {
      truncated.details = { truncated: true, originalSize: serialized.length };
    }

    return truncated;
  }
}

/**
 * Convenience functions for common logging scenarios
 */

/**
 * Get logger instance
 */
export function getLogger(config?: Partial<LoggerConfig>): ChannelOperationsLogger {
  return ChannelOperationsLogger.getInstance(config);
}

/**
 * Log successful channel linking
 */
export async function logChannelLinkingSuccess(
  userId: string,
  channelId: string,
  userState: 'new_user' | 'existing_logged_in' | 'existing_logged_out',
  context?: Record<string, unknown>
): Promise<void> {
  const logger = getLogger();
  
  await logger.logChannelLinking({
    operation: OperationType.CHANNEL_LINKING,
    message: 'Channel linking completed successfully',
    userId,
    channelId,
    userState,
    linkingResult: 'success',
    ...context,
  });
}

/**
 * Log failed channel linking
 */
export async function logChannelLinkingFailure(
  userId: string,
  channelId: string,
  error: string,
  errorType: string,
  context?: Record<string, unknown>
): Promise<void> {
  const logger = getLogger();
  
  await logger.logChannelLinking({
    operation: OperationType.CHANNEL_LINKING,
    message: `Channel linking failed: ${error}`,
    userId,
    channelId,
    linkingResult: 'failed',
    errorType,
    ...context,
  });
}

/**
 * Log security violation
 */
export async function logSecurityViolation(
  violationType: 'input_validation' | 'rate_limit_exceeded' | 'suspicious_activity' | 'unauthorized_access',
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  details: Record<string, unknown>,
  context?: Record<string, unknown>
): Promise<void> {
  const logger = getLogger();
  
  await logger.logSecurityViolation({
    violationType,
    severity,
    message,
    details,
    blocked: severity === 'high' || severity === 'critical',
    ...context,
  });
}

/**
 * Log application error
 */
export async function logApplicationError(
  error: Error,
  errorType: string,
  userImpact: 'none' | 'minor' | 'major' | 'critical',
  context?: Record<string, unknown>
): Promise<void> {
  const logger = getLogger();
  
  await logger.logError({
    errorType,
    errorMessage: error.message,
    stackTrace: error.stack?.split('\n'),
    userImpact,
    context: context || {},
    message: `Application error: ${error.message}`,
  });
}