"use client";

import CompactLanguageSwitcher from './CompactLanguageSwitcher';
import { CompactThemeToggle } from './CompactThemeToggle';

interface FloatingControlsProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  themeVariant?: 'dropdown' | 'cycle';
}

/**
 * Minimal overlay controls for login/signup contexts:
 * - Fixed positioning with configurable location
 * - Semi-transparent background with hover effects
 * - Vertical stack layout with proper spacing
 * - Optimized for minimal interference with content
 */
export default function FloatingControls({
  className = "",
  position = 'top-right',
  themeVariant = 'cycle'
}: FloatingControlsProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-50
        flex flex-col gap-2 p-3
        bg-background border border-border rounded-lg shadow-lg
        transition-all duration-200 ease-in-out
        hover:shadow-xl
        ${className}
      `}
      role="group"
      aria-label="Floating language and theme controls"
    >
      <CompactLanguageSwitcher className="text-xs" />
      <div className="h-px w-full bg-border" aria-hidden="true" />
      <CompactThemeToggle
        variant={themeVariant}
        className="self-center"
      />
    </div>
  );
}