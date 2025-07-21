// lib/utils/loggers.ts

import { createLogger, LogLevel } from './logger';

// Specialized loggers for different application contexts
export const authLogger = createLogger('AUTH', {
  level: LogLevel.INFO,
  includeStackTrace: true,
});

export const apiLogger = createLogger('API', {
  level: LogLevel.DEBUG,
  includeStackTrace: false,
});

export const dbLogger = createLogger('DATABASE', {
  level: LogLevel.DEBUG,
  includeStackTrace: true,
});

export const analyticsLogger = createLogger('ANALYTICS', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const subscriptionLogger = createLogger('SUBSCRIPTION', {
  level: LogLevel.INFO,
  includeStackTrace: true,
});

export const channelLogger = createLogger('CHANNEL', {
  level: LogLevel.DEBUG,
  includeStackTrace: false,
});

export const usageLogger = createLogger('USAGE', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const stripeLogger = createLogger('STRIPE', {
  level: LogLevel.INFO,
  includeStackTrace: true,
});

export const realtimeLogger = createLogger('REALTIME', {
  level: LogLevel.DEBUG,
  includeStackTrace: false,
});

export const securityLogger = createLogger('SECURITY', {
  level: LogLevel.WARN,
  includeStackTrace: true,
});

export const uiLogger = createLogger('UI', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const hookLogger = createLogger('HOOK', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const middlewareLogger = createLogger('MIDDLEWARE', {
  level: LogLevel.INFO,
  includeStackTrace: true,
});

export const notificationLogger = createLogger('NOTIFICATION', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const tierLogger = createLogger('TIER', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const userLogger = createLogger('USER', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const dateLogger = createLogger('DATE', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

export const timeLogger = createLogger('TIME', {
  level: LogLevel.INFO,
  includeStackTrace: false,
});

// Export all loggers for easy access
export const loggers = {
  auth: authLogger,
  api: apiLogger,
  db: dbLogger,
  analytics: analyticsLogger,
  channel: channelLogger,
  usage: usageLogger,
  stripe: stripeLogger,
  realtime: realtimeLogger,
  security: securityLogger,
  subscription: subscriptionLogger,
  ui: uiLogger,
  hook: hookLogger,
  middleware: middlewareLogger,
  notification: notificationLogger,
  tier: tierLogger,
  user: userLogger,
  date: dateLogger,
  time: timeLogger,
};