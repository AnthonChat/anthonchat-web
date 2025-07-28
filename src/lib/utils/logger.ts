// lib/utils/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  includeStackTrace: boolean;
  contextPrefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private storage: LogEntry[] = [];
  private sessionId: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: process.env.NODE_ENV !== 'production',
      maxStorageEntries: 1000,
      includeStackTrace: false,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    const prefix = this.config.contextPrefix ? `[${this.config.contextPrefix}]` : '';
    
    return `${timestamp} ${prefix}${contextStr} [${levelName}] ${message}`;
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    
    const lines = stack.split('\n');
    // Remove the first 3 lines (Error, this method, and the calling log method)
    return lines.slice(3).join('\n');
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    userId?: string,
    requestId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId,
      sessionId: this.sessionId,
      requestId,
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    userId?: string,
    requestId?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.createLogEntry(level, message, context, data, userId, requestId);
    
    // Store in memory if enabled
    if (this.config.enableStorage) {
      this.storage.push(logEntry);
      
      // Trim storage if it exceeds max entries
      if (this.storage.length > this.config.maxStorageEntries) {
        this.storage = this.storage.slice(-this.config.maxStorageEntries);
      }
    }

    // Console output if enabled
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, message, context);
      const consoleData = data ? [formattedMessage, data] : [formattedMessage];
      
      if (this.config.includeStackTrace && level >= LogLevel.ERROR) {
        consoleData.push('\nStack trace:', this.getStackTrace());
      }

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(...consoleData);
          break;
        case LogLevel.INFO:
          console.info(...consoleData);
          break;
        case LogLevel.WARN:
          console.warn(...consoleData);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(...consoleData);
          break;
      }
    }
  }

  // Public logging methods
  debug(message: string, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, data, userId, requestId);
  }

  info(message: string, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, data, userId, requestId);
  }

  warn(message: string, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, data, userId, requestId);
  }

  error(message: string, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.ERROR, message, context, data, userId, requestId);
  }

  fatal(message: string, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.FATAL, message, context, data, userId, requestId);
  }

  // Utility methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setContext(contextPrefix: string): void {
    this.config.contextPrefix = contextPrefix;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.storage.filter(entry => entry.level >= level);
    }
    return [...this.storage];
  }

  clearLogs(): void {
    this.storage = [];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Group logging for related operations
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG) && this.config.enableConsole) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG) && this.config.enableConsole) {
      console.groupEnd();
    }
  }

  // Structured logging for API calls
  apiCall(
    method: string,
    url: string,
    status?: number,
    duration?: number,
    userId?: string,
    requestId?: string
  ): void {
    const message = `API ${method} ${url}`;
    const data = {
      method,
      url,
      status,
      duration: duration ? `${duration}ms` : undefined,
    };

    if (status && status >= 400) {
      this.error(message, 'API', data, userId, requestId);
    } else {
      this.info(message, 'API', data, userId, requestId);
    }
  }

  // Database operation logging
  dbOperation(
    operation: string,
    table: string,
    duration?: number,
    error?: Error,
    userId?: string,
    requestId?: string
  ): void {
    const message = `DB ${operation} on ${table}`;
    const data = {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      error: error?.message,
    };

    if (error) {
      this.error(message, 'DATABASE', data, userId, requestId);
    } else {
      this.debug(message, 'DATABASE', data, userId, requestId);
    }
  }

  // User action logging
  userAction(
    action: string,
    userId: string,
    metadata?: unknown,
    requestId?: string
  ): void {
    this.info(`User action: ${action}`, 'USER', metadata, userId, requestId);
  }

  // Security event logging
  securityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: unknown,
    userId?: string,
    requestId?: string
  ): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                 severity === 'high' ? LogLevel.ERROR :
                 severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Security event: ${event}`, 'SECURITY', details, userId, requestId);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers for different contexts
export const createLogger = (contextPrefix: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger({ ...config, contextPrefix });
};

// Convenience functions for quick logging
export const log = {
  debug: (message: string, data?: unknown) => logger.debug(message, undefined, data),
  info: (message: string, data?: unknown) => logger.info(message, undefined, data),
  warn: (message: string, data?: unknown) => logger.warn(message, undefined, data),
  error: (message: string, data?: unknown) => logger.error(message, undefined, data),
  fatal: (message: string, data?: unknown) => logger.fatal(message, undefined, data),
};

export default logger;