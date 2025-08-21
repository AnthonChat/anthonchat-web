"use client";

import CompactLanguageSwitcher from './CompactLanguageSwitcher';
import { CompactThemeToggle } from './CompactThemeToggle';

interface LanguageThemeControlsProps {
  className?: string;
  themeVariant?: 'dropdown' | 'cycle';
  spacing?: 'compact' | 'normal' | 'relaxed';
}

/**
 * Standard header integration component that combines language and theme controls:
 * - Horizontal flex layout with consistent spacing
 * - Responsive design that adapts to available space
 * - Configurable spacing and theme toggle variant
 * - Optimized for header/navigation contexts
 */
export default function LanguageThemeControls({
  className = "",
  themeVariant = 'dropdown',
  spacing = 'normal'
}: LanguageThemeControlsProps) {
  const spacingClasses = {
    compact: 'gap-2',
    normal: 'gap-3',
    relaxed: 'gap-4'
  };

  return (
    <div 
      className={`flex items-center ${spacingClasses[spacing]} ${className}`}
      role="group"
      aria-label="Language and theme controls"
    >
      <CompactLanguageSwitcher />
      <div className="h-4 w-px bg-border" aria-hidden="true" />
      <CompactThemeToggle variant={themeVariant} />
    </div>
  );
}