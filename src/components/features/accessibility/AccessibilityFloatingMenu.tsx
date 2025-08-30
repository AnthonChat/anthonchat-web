"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AccessibilityTrigger } from "./AccessibilityTrigger";
import { AccessibilityPanel } from "./AccessibilityPanel";

interface AccessibilityFloatingMenuProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
  disabled?: boolean;
}

/**
 * Main accessibility floating menu component that orchestrates the trigger and panel.
 * Features:
 * - Manages open/close state
 * - Handles click outside to close
 * - Provides keyboard shortcuts (Alt+A to open)
 * - Respects user preferences for reduced motion
 * - Page-specific visibility controls
 */
export default function AccessibilityFloatingMenu({
  position = 'bottom-right',
  className,
  disabled = false
}: AccessibilityFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global keyboard shortcut (Alt+A for Accessibility)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      
      // Alt+A opens the accessibility menu
      if (event.altKey && event.key.toLowerCase() === 'a' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          handleClose();
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isOpen, handleClose]);

  // Don't render if disabled
  if (disabled) {
    return null;
  }

  return (
    <>
      <AccessibilityTrigger
        ref={triggerRef}
        onClick={handleToggle}
        isOpen={isOpen}
        position={position}
        className={className}
      />
      
      <AccessibilityPanel
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={triggerRef}
        position={position}
      />
    </>
  );
}