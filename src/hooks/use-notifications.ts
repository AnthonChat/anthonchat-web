/**
 * Hook centralizzato per la gestione delle notifiche toast
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@/components/features/auth/AuthProvider';

// Importazioni dei tipi e utility
import type {
  NotificationData,
  ErrorNotificationOptions,
  NotificationAction,
  NotificationConfig
} from '@/lib/notifications/types';

import {
  NotificationType,
  NotificationErrorType
} from '@/lib/notifications/types';

import { 
  DEFAULT_NOTIFICATION_CONFIG,
  getNotificationTypeConfig,
  getErrorTypeConfig,
  getErrorMessage
} from '@/lib/notifications/config';

import {
  createErrorNotificationOptions
} from '@/lib/notifications/error-mapper';

/**
 * Hook centralizzato per la gestione delle notifiche
 */
export function useNotifications() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [activeToasts, setActiveToasts] = useState<Map<string, NotificationData>>(new Map());
  const toastIds = useRef<Map<string, string | number>>(new Map());

  /**
   * Genera ID univoco per il toast
   */
  const generateToastId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Chiude un toast specifico
   */
  const dismissToast = useCallback((toastId: string) => {
    const sonnerToastId = toastIds.current.get(toastId);
    if (sonnerToastId) {
      toast.dismiss(sonnerToastId);
      toastIds.current.delete(toastId);
    }
    
    setActiveToasts(prev => {
      const updated = new Map(prev);
      updated.delete(toastId);
      return updated;
    });

    console.info('NOTIFICATION_DISMISSED', { toastId });
  }, []);

  /**
   * Chiude tutti i toast attivi
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
    setActiveToasts(new Map());
    toastIds.current.clear();
    console.info('ALL_NOTIFICATIONS_DISMISSED');
  }, []);

  /**
   * Mostra toast di successo
   */
  const showSuccess = useCallback((
    title: string,
    message?: string,
    actions?: NotificationAction[],
    config?: Partial<NotificationConfig>
  ) => {
    const toastId = generateToastId();
    const typeConfig = getNotificationTypeConfig(NotificationType.SUCCESS);
    const finalConfig = { ...DEFAULT_NOTIFICATION_CONFIG, ...typeConfig, ...config };

    const sonnerToastId = toast.success(title, {
      description: message,
      duration: finalConfig.duration,
      action: actions?.[0] ? {
        label: actions[0].label,
        onClick: actions[0].onClick
      } : undefined
    });

    toastIds.current.set(toastId, sonnerToastId);

    const notificationData: NotificationData = {
      id: toastId,
      type: NotificationType.SUCCESS,
      title,
      message,
      actions,
      config: finalConfig,
      metadata: {
        timestamp: new Date()
      }
    };

    setActiveToasts(prev => new Map(prev).set(toastId, notificationData));

    console.info('NOTIFICATION_SHOWN', {
      type: 'success',
      title,
      toastId
    });

    return toastId;
  }, [generateToastId]);

  /**
   * Mostra toast di verifica con azioni contestuali
   */
  const showVerificationToast = useCallback((
    channelName: string,
    nonce: string,
    command?: string,
    deepLink?: string,
    config?: Partial<NotificationConfig>
  ) => {
    const toastId = generateToastId();
    const typeConfig = getNotificationTypeConfig(NotificationType.VERIFICATION);
    const finalConfig = { ...DEFAULT_NOTIFICATION_CONFIG, ...typeConfig, ...config };

    // Azioni per il toast di verifica
    const actions: NotificationAction[] = [];

    if (deepLink) {
      actions.push({
        label: `Apri ${channelName}`,
        onClick: () => {
          window.open(deepLink, '_blank');
          console.info('VERIFICATION_DEEPLINK_OPENED', {
            channelName,
            deepLink,
            toastId
          });
        },
        variant: 'default'
      });
    }

    const sonnerToastId = toast.loading(
      `Verifica ${channelName} in corso...`,
      {
        description: 'Attendendo conferma...',
        duration: finalConfig.duration,
        action: actions[0] ? {
          label: actions[0].label,
          onClick: actions[0].onClick
        } : undefined
      }
    );

    toastIds.current.set(toastId, sonnerToastId);

    const notificationData: NotificationData = {
      id: toastId,
      type: NotificationType.VERIFICATION,
      title: `Verifica ${channelName}`,
      message: 'Attendendo conferma...',
      actions,
      config: finalConfig,
      metadata: {
        context: 'channel_verification',
        operationId: nonce,
        timestamp: new Date(),
        details: { channelName, nonce, command, deepLink }
      }
    };

    setActiveToasts(prev => new Map(prev).set(toastId, notificationData));

    console.info('VERIFICATION_TOAST_SHOWN', {
      channelName,
      nonce,
      toastId
    });

    return toastId;
  }, [generateToastId]);

  /**
   * Mostra toast di errore con azioni contestuali
   */
  const showError = useCallback((
    title: string,
    message: string,
    options?: ErrorNotificationOptions
  ) => {
    const toastId = generateToastId();
    const typeConfig = getNotificationTypeConfig(NotificationType.ERROR);
    const errorConfig = options?.errorType ? getErrorTypeConfig(options.errorType) : {};
    const finalConfig = { 
      ...DEFAULT_NOTIFICATION_CONFIG, 
      ...typeConfig, 
      ...errorConfig, 
      ...options?.config 
    };

    const { errorType, context, originalError, customActions } = options || {};

    // Azione di default per errori
    let defaultAction: { label: string; onClick: () => void } | undefined;

    if (errorType === NotificationErrorType.VERIFICATION_POLLING_ERROR) {
      defaultAction = {
        label: 'Riprova',
        onClick: () => {
          console.info('VERIFICATION_POLLING_RETRY', {
            toastId,
            context,
            originalError
          });
        }
      };
    } else if (errorType === NotificationErrorType.NETWORK_ERROR) {
      defaultAction = {
        label: 'Riprova',
        onClick: () => {
          window.location.reload();
        }
      };
    } else if ([
      NotificationErrorType.AUTH_SESSION_EXPIRED,
      NotificationErrorType.AUTH_UNAUTHORIZED
    ].includes(errorType as NotificationErrorType)) {
      defaultAction = {
        label: 'Effettua Logout',
        onClick: async () => {
          try {
            await signOut();
            router.push('/login');
          } catch (error) {
            console.error('SIGNOUT_ERROR', { error });
          }
        }
      };
    }

    const actionToUse = customActions?.[0] || defaultAction;

    const sonnerToastId = toast.error(title, {
      description: message,
      duration: finalConfig.duration,
      action: actionToUse ? {
        label: actionToUse.label,
        onClick: actionToUse.onClick
      } : undefined
    });

    toastIds.current.set(toastId, sonnerToastId);

    const notificationData: NotificationData = {
      id: toastId,
      type: NotificationType.ERROR,
      title,
      message,
      actions: customActions,
      config: finalConfig,
      metadata: {
        errorType,
        context,
        timestamp: new Date(),
        details: { originalError }
      }
    };

    setActiveToasts(prev => new Map(prev).set(toastId, notificationData));

    // Log dell'errore
    console.error('NOTIFICATION_ERROR_SHOWN', {
      errorType,
      title,
      context,
      toastId,
      originalError
    });

    return toastId;
  }, [generateToastId, router, signOut]);

  /**
   * Gestisce specificamente il VERIFICATION_POLLING_ERROR
   */
  const handleVerificationPollingError = useCallback((
    channelName: string,
    error: unknown,
    retryFn?: () => Promise<void>
  ) => {
    const errorOptions = createErrorNotificationOptions(
      error,
      retryFn ? [{
        label: 'Riprova verifica',
        onClick: retryFn,
        variant: 'default' as const
      }] : undefined
    );

    const { title: resolvedTitle, message, userSuggestion } = getErrorMessage(NotificationErrorType.VERIFICATION_POLLING_ERROR);
    
    return showError(
      resolvedTitle || `Errore verifica ${channelName}`,
      `${message}. ${userSuggestion || ''}`,
      {
        ...errorOptions,
        config: {
          duration: 10000 // 10 secondi per polling errors
        }
      }
    );
  }, [showError]);

  /**
   * Cleanup automatico dei toast scaduti
   */
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActiveToasts(prev => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [id, notification] of updated.entries()) {
          const { config, metadata } = notification;
          if (config?.duration && config.duration > 0) {
            const elapsed = now - metadata!.timestamp.getTime();
            if (elapsed > config.duration) {
              updated.delete(id);
              toastIds.current.delete(id);
              hasChanges = true;
            }
          }
        }

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  return {
    // State
    activeToasts: Array.from(activeToasts.values()),
    
    // Actions
    showSuccess,
    showError,
    showVerificationToast,
    handleVerificationPollingError,
    dismissToast,
    dismissAll
  };
}