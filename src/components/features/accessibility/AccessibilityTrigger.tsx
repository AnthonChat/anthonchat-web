"use client";

import { forwardRef, useEffect, useState } from "react";
import { Settings2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccessibilityTriggerProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * Floating island trigger button for accessibility menu.
 * Features:
 * - Positioned as a floating action button
 * - Shows current theme and language indicators
 * - Accessible with proper ARIA labels
 * - Smooth animations respecting motion preferences
 */
export const AccessibilityTrigger = forwardRef<
  HTMLButtonElement,
  AccessibilityTriggerProps
>(({ onClick, isOpen, className, position = "bottom-right" }, ref) => {
  const { theme, systemTheme } = useTheme();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  const currentTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    setMounted(true);
  }, []);

  const ThemeIcon = mounted
    ? currentTheme === "dark"
      ? Moon
      : currentTheme === "light"
      ? Sun
      : Monitor
    : Monitor;

  return (
    <Button
      ref={ref}
      onClick={onClick}
      variant="outline"
      size="lg"
      className={cn(
        "fixed z-50 h-14 w-14 rounded-full shadow-lg border-2",
        "bg-background/80 backdrop-blur-md border-border/50",
        "hover:bg-background/90 hover:border-border/70 hover:shadow-xl",
        "focus:bg-background/90 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
        "transition-all duration-200 ease-in-out",
        "group active:scale-95",
        positionClasses[position],
        className
      )}
      aria-label={
        mounted
          ? `Accessibility settings. Current: ${locale.toUpperCase()}, ${
              currentTheme ?? "system"
            } theme. ${isOpen ? "Menu open" : "Click to open menu"}`
          : `Accessibility settings. Current: ${locale.toUpperCase()}. ${
              isOpen ? "Menu open" : "Click to open menu"
            }`
      }
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      <div className="relative flex items-center justify-center">
        {/* Main accessibility icon */}
        <Settings2
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen && "rotate-45"
          )}
        />

        {/* Language indicator badge */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <span className="text-xs font-bold leading-none">
            {locale.toUpperCase().charAt(0)}
          </span>
        </div>

        {/* Theme indicator badge */}
        <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-muted border border-border flex items-center justify-center">
          <ThemeIcon className="h-2 w-2" />
        </div>
      </div>

      {/* Pulse animation for focus indication */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-primary/30",
          "scale-110 animate-pulse opacity-0",
          "group-focus-visible:opacity-100 transition-opacity duration-200"
        )}
        aria-hidden="true"
      />
    </Button>
  );
});

AccessibilityTrigger.displayName = "AccessibilityTrigger";
