"use client";

import { usePathname } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { LocaleErrorBoundary } from './LocaleErrorBoundary';
import LanguageThemeControls from './LanguageThemeControls';
import FloatingControls from './FloatingControls';
import CompactLanguageSwitcher from './CompactLanguageSwitcher';
import { CompactThemeToggle } from './CompactThemeToggle';

interface GlobalControlsProps {
  variant?: 'header' | 'floating' | 'minimal' | 'auto';
  className?: string;
  themeVariant?: 'dropdown' | 'cycle';
  spacing?: 'compact' | 'normal' | 'relaxed';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Context-aware wrapper that renders appropriate control variant:
 * - Auto-detects context based on current route
 * - Renders optimal layout for each context
 * - Supports manual override via variant prop
 * - Maintains consistent behavior across the application
 */
export default function GlobalControls({
  variant = 'auto',
  className = "",
  themeVariant = 'dropdown',
  spacing = 'normal',
  position = 'top-right'
}: GlobalControlsProps) {
  const pathname = usePathname();
  
  // Enable keyboard shortcuts globally
  useKeyboardShortcuts();

  // Auto-detect context if variant is 'auto'
  const getVariant = (): 'header' | 'floating' | 'minimal' => {
    if (variant !== 'auto') {
      return variant;
    }

    // Login/signup contexts - use floating
    if (pathname?.includes('/login') || pathname?.includes('/signup')) {
      return 'floating';
    }

    // Marketing pages - use header
    if (pathname === '/' || pathname?.includes('/privacy') || pathname?.includes('/terms')) {
      return 'header';
    }

    // Dashboard and app contexts - use header
    if (pathname?.includes('/dashboard')) {
      return 'header';
    }

    // Default to minimal for unknown contexts
    return 'minimal';
  };

  const detectedVariant = getVariant();

  // Render appropriate variant wrapped in error boundary
  return (
    <LocaleErrorBoundary>
      {(() => {
        switch (detectedVariant) {
          case 'floating':
            return (
              <FloatingControls
                className={className}
                position={position}
                themeVariant={themeVariant}
              />
            );

          case 'minimal':
            return (
              <div
                className={`flex items-center gap-2 ${className}`}
                role="group"
                aria-label="Language and theme controls"
              >
                <CompactLanguageSwitcher />
                <CompactThemeToggle variant={themeVariant} />
              </div>
            );

          case 'header':
          default:
            return (
              <LanguageThemeControls
                className={className}
                themeVariant={themeVariant}
                spacing={spacing}
              />
            );
        }
      })()}
    </LocaleErrorBoundary>
  );
}

// Export individual components for direct use
export {
  LanguageThemeControls,
  FloatingControls,
  CompactLanguageSwitcher,
  CompactThemeToggle
};