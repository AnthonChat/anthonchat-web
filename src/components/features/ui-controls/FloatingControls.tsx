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
        flex flex-col gap-2 p-2 
        bg-background/80 backdrop-blur-sm 
        border border-border/50 rounded-lg shadow-lg
        opacity-60 hover:opacity-100 
        transition-all duration-300 ease-in-out
        ${className}
      `}
      role="group"
      aria-label="Floating language and theme controls"
    >
      <CompactLanguageSwitcher className="text-xs" />
      <div className="h-px w-full bg-border/50" aria-hidden="true" />
      <CompactThemeToggle 
        variant={themeVariant} 
        className="self-center"
      />
    </div>
  );
}