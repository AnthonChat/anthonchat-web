/**
 * Componente toast personalizzato per la verifica dei canali
 * Implementa l'architettura definita in TOAST_SYSTEM_ARCHITECTURE_DESIGN.md
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationData } from '@/lib/notifications/types';

interface VerificationToastProps {
  verification: VerificationData;
  onRetry: () => void;
  onCancel: () => void;
  onCopyCommand: () => void;
  onOpenDeepLink: () => void;
  progress?: number;
  className?: string;
}

export function VerificationToast({
  verification,
  onRetry,
  onCancel,
  onCopyCommand,
  onOpenDeepLink,
  progress,
  className
}: VerificationToastProps) {
  const { channelName, status, command, deepLink } = verification;

  const getStatusText = () => {
    switch (status) {
      case 'polling':
        return 'Attendendo conferma...';
      case 'failed':
        return 'Verifica fallita';
      case 'expired':
        return 'Verifica scaduta';
      case 'starting':
        return 'Avvio verifica...';
      default:
        return 'In elaborazione...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'polling':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-destructive';
      case 'expired':
        return 'text-orange-600 dark:text-orange-400';
      case 'starting':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("space-y-3 min-w-[320px] max-w-[420px]", className)}>
      {/* Header con titolo e pulsante di chiusura */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-5 truncate">
            Verifica {channelName}
          </h4>
          <p className={cn("text-xs leading-4 mt-1", getStatusColor())}>
            {getStatusText()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          aria-label="Chiudi notifica"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Progress bar se presente */}
      {progress !== undefined && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Comando da copiare */}
      {command && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Invia questo comando:
          </p>
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md border">
            <code className="flex-1 text-xs font-mono text-foreground truncate" title={command}>
              {command}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyCommand}
              className="h-6 w-6 p-0 shrink-0 hover:bg-background/80"
              aria-label="Copia comando"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Azioni */}
      <div className="flex gap-2 pt-1">
        {deepLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDeepLink}
            className="flex-1 h-8 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Apri {channelName}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex-1 h-8 text-xs"
          disabled={status === 'starting'}
        >
          <RefreshCw className={cn(
            "h-3 w-3 mr-1.5",
            status === 'starting' && "animate-spin"
          )} />
          Riprova
        </Button>
      </div>
    </div>
  );
}