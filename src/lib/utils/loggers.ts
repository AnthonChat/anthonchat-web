// Temporary specialized loggers - will be rebuilt during refactor
import { createLogger, LogLevel } from './logger';

// Specialized loggers for different application contexts
export const authLogger = createLogger('AUTH');
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DATABASE');
export const analyticsLogger = createLogger('ANALYTICS');
export const cacheLogger = createLogger('CACHE');
export const channelLogger = createLogger('CHANNEL');
export const dateLogger = createLogger('DATE');
export const errorLogger = createLogger('ERROR');
export const hookLogger = createLogger('HOOK');
export const middlewareLogger = createLogger('MIDDLEWARE');
export const notificationLogger = createLogger('NOTIFICATION');
export const tierLogger = createLogger('TIER');
export const timeLogger = createLogger('TIME');
export const uiLogger = createLogger('UI');
export const usageLogger = createLogger('USAGE');
export const userLogger = createLogger('USER');
export const subscriptionLogger = createLogger('SUBSCRIPTION');

// Export all loggers as an object for convenience
export const loggers = {
  auth: authLogger,
  api: apiLogger,
  db: dbLogger,
  analytics: analyticsLogger,
  cache: cacheLogger,
  channel: channelLogger,
  date: dateLogger,
  error: errorLogger,
  hook: hookLogger,
  middleware: middlewareLogger,
  notification: notificationLogger,
  tier: tierLogger,
  time: timeLogger,
  ui: uiLogger,
  usage: usageLogger,
  user: userLogger,
  subscription: subscriptionLogger,
};