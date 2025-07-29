// Temporary simple logger replacement
// This will be replaced with a comprehensive logging system during refactor

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Simple logger interface that maps to console methods
const createSimpleLogger = (prefix: string) => ({
  debug: (message: string, context?: string, data?: unknown, userId?: string, requestId?: string) => {
    console.debug(`[${prefix}]`, message, data ? { context, data, userId, requestId } : '');
  },
  info: (message: string, context?: string, data?: unknown, userId?: string, requestId?: string) => {
    console.log(`[${prefix}]`, message, data ? { context, data, userId, requestId } : '');
  },
  warn: (message: string, context?: string, data?: unknown, userId?: string, requestId?: string) => {
    console.warn(`[${prefix}]`, message, data ? { context, data, userId, requestId } : '');
  },
  error: (message: string, context?: string, data?: unknown, userId?: string, requestId?: string) => {
    console.error(`[${prefix}]`, message, data ? { context, data, userId, requestId } : '');
  },
  fatal: (message: string, context?: string, data?: unknown, userId?: string, requestId?: string) => {
    console.error(`[${prefix}] FATAL:`, message, data ? { context, data, userId, requestId } : '');
  },
});

// Default logger
export const logger = createSimpleLogger('APP');

// Create logger function
export const createLogger = (contextPrefix: string) => createSimpleLogger(contextPrefix);

// Convenience functions
export const log = {
  debug: (message: string, data?: unknown) => console.debug(message, data),
  info: (message: string, data?: unknown) => console.log(message, data),
  warn: (message: string, data?: unknown) => console.warn(message, data),
  error: (message: string, data?: unknown) => console.error(message, data),
  fatal: (message: string, data?: unknown) => console.error('FATAL:', message, data),
};

export default logger;