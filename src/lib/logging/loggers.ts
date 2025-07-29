// Simple logger instances for different application contexts
// Replaces the temporary specialized loggers with the new logging system

import { createLogger } from './logger';

// Basic specialized loggers for different contexts
export const authLogger = createLogger('AUTH');
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DB');
export const uiLogger = createLogger('UI');

// Additional specialized loggers for specific features
export const channelLogger = createLogger('CHANNEL');
export const subscriptionLogger = createLogger('SUBSCRIPTION');
export const usageLogger = createLogger('USAGE');
export const userLogger = createLogger('USER');
export const tierLogger = createLogger('TIER');
export const middlewareLogger = createLogger('MIDDLEWARE');
export const errorLogger = createLogger('ERROR');
export const hookLogger = createLogger('HOOK');
export const timeLogger = createLogger('TIME');
export const dateLogger = createLogger('DATE');
export const stripeLogger = createLogger('STRIPE');

// Export all loggers as an object for convenience
export const loggers = {
  auth: authLogger,
  api: apiLogger,
  db: dbLogger,
  ui: uiLogger,
  channel: channelLogger,
  subscription: subscriptionLogger,
  usage: usageLogger,
  user: userLogger,
  tier: tierLogger,
  middleware: middlewareLogger,
  error: errorLogger,
  hook: hookLogger,
  time: timeLogger,
  date: dateLogger,
  stripe: stripeLogger,
};