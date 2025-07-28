// hooks/useLogger.ts

import { useCallback, useEffect, useRef } from 'react';
import { logger, createLogger, LogLevel, type LoggerConfig } from '@/lib/utils/logger';
import { useAuth } from './useAuth';

interface UseLoggerOptions {
  context?: string;
  config?: Partial<LoggerConfig>;
  autoLogPageViews?: boolean;
  autoLogUserActions?: boolean;
}

export function useLogger(options: UseLoggerOptions = {}) {
  const { context, config, autoLogPageViews = false, autoLogUserActions = false } = options;
  const { user } = useAuth();
  const loggerRef = useRef(context ? createLogger(context, config) : logger);
  const requestIdRef = useRef<string>('');

  // Generate a unique request ID for this component instance
  useEffect(() => {
    requestIdRef.current = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Auto-log page views
  useEffect(() => {
    if (autoLogPageViews && typeof window !== 'undefined') {
      loggerRef.current.info(
        `Page view: ${window.location.pathname}`,
        'PAGE_VIEW',
        { 
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        user?.id,
        requestIdRef.current
      );
    }
  }, [autoLogPageViews, user?.id]);

  const logDebug = useCallback((message: string, data?: unknown) => {
    loggerRef.current.debug(message, undefined, data, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logInfo = useCallback((message: string, data?: unknown) => {
    loggerRef.current.info(message, undefined, data, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logWarn = useCallback((message: string, data?: unknown) => {
    loggerRef.current.warn(message, undefined, data, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logError = useCallback((message: string, data?: unknown) => {
    loggerRef.current.error(message, undefined, data, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logFatal = useCallback((message: string, data?: unknown) => {
    loggerRef.current.fatal(message, undefined, data, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logUserAction = useCallback((action: string, metadata?: unknown) => {
    if (user?.id) {
      loggerRef.current.userAction(action, user.id, metadata, requestIdRef.current);
    }
  }, [user?.id]);

  const logApiCall = useCallback((
    method: string,
    url: string,
    status?: number,
    duration?: number
  ) => {
    loggerRef.current.apiCall(method, url, status, duration, user?.id, requestIdRef.current);
  }, [user?.id]);

  const logPerformance = useCallback((label: string, startTime: number) => {
    const duration = performance.now() - startTime;
    loggerRef.current.info(
      `Performance: ${label}`,
      'PERFORMANCE',
      { duration: `${duration.toFixed(2)}ms` },
      user?.id,
      requestIdRef.current
    );
    return duration;
  }, [user?.id]);

  const startTimer = useCallback((label: string) => {
    loggerRef.current.time(label);
    return performance.now();
  }, []);

  const endTimer = useCallback((label: string, startTime?: number) => {
    loggerRef.current.timeEnd(label);
    if (startTime) {
      return logPerformance(label, startTime);
    }
  }, [logPerformance]);

  const logGroup = useCallback((label: string) => {
    loggerRef.current.group(label);
  }, []);

  const logGroupEnd = useCallback(() => {
    loggerRef.current.groupEnd();
  }, []);

  // Auto-log user actions on component interactions
  useEffect(() => {
    if (!autoLogUserActions || typeof window === 'undefined') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        const buttonText = button?.textContent?.trim() || 'Unknown button';
        logUserAction('button_click', {
          buttonText,
          elementId: button?.id,
          className: button?.className,
          timestamp: new Date().toISOString()
        });
      }
    };

    const handleFormSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      logUserAction('form_submit', {
        formId: form.id,
        formAction: form.action,
        timestamp: new Date().toISOString()
      });
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleFormSubmit);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, [autoLogUserActions, logUserAction]);

  return {
    // Basic logging methods
    debug: logDebug,
    info: logInfo,
    warn: logWarn,
    error: logError,
    fatal: logFatal,
    
    // Specialized logging methods
    userAction: logUserAction,
    apiCall: logApiCall,
    performance: logPerformance,
    
    // Performance timing
    startTimer,
    endTimer,
    
    // Grouping
    group: logGroup,
    groupEnd: logGroupEnd,
    
    // Logger instance access
    logger: loggerRef.current,
    requestId: requestIdRef.current,
    
    // Utility methods
    setLevel: (level: LogLevel) => loggerRef.current.setLevel(level),
    getLogs: () => loggerRef.current.getLogs(),
    clearLogs: () => loggerRef.current.clearLogs(),
  };
}