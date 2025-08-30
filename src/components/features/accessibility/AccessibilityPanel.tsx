"use client";

import { useEffect, useRef, memo } from "react";
import { X, Sun, Moon, Monitor, Globe, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  locales, 
  extractLocaleFromPath, 
  getPathWithLocale, 
  type Locale 
} from "@/i18n/routing";

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const languageNames: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano'
};

const flagEmojis: Record<Locale, string> = {
  en: '🇺🇸',
  it: '🇮🇹'
};

/**
 * Accessibility panel with language and theme controls.
 * Features:
 * - Modal-style panel with backdrop
 * - Language switching with visual indicators
 * - Theme selection with icons
 * - Keyboard navigation and focus management
 * - Responsive positioning based on trigger location
 */
export const AccessibilityPanel = memo(function AccessibilityPanel({
  isOpen,
  onClose,
  triggerRef,
  position = 'bottom-right'
}: AccessibilityPanelProps) {
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }

      // Trap focus within panel
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;

        const focusableElements = panel.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, triggerRef]);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    const { pathnameWithoutLocale } = extractLocaleFromPath(pathname);
    const newPath = getPathWithLocale(pathnameWithoutLocale || '/', newLocale);
    
    router.push(newPath);
    onClose();
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  // Panel positioning
  const getPositionClasses = () => {
    const isBottom = position.includes('bottom');
    const isRight = position.includes('right');
    
    if (isBottom && isRight) return 'bottom-20 right-6';
    if (isBottom && !isRight) return 'bottom-20 left-6';
    if (!isBottom && isRight) return 'top-20 right-6';
    return 'top-20 left-6';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <Card
        ref={panelRef}
        className={cn(
          "fixed z-50 w-80 max-w-[calc(100vw-2rem)]",
          "bg-background/95 backdrop-blur-md border shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          getPositionClasses()
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-panel-title"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 
              id="accessibility-panel-title"
              className="text-lg font-semibold flex items-center gap-2"
            >
              <Globe className="h-5 w-5" />
              Accessibility Settings
            </h2>
            <Button
              ref={firstFocusableRef}
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close accessibility settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Language Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Language</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {locales.map((loc) => (
                <Button
                  key={loc}
                  variant={locale === loc ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLanguageChange(loc)}
                  className="justify-start gap-2"
                  aria-pressed={locale === loc}
                >
                  <span role="img" aria-hidden="true">
                    {flagEmojis[loc]}
                  </span>
                  <span>{languageNames[loc]}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Theme Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Theme</h3>
            </div>
            <div className="space-y-2">
              <Button
                variant={theme === 'light' ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange('light')}
                className="w-full justify-start gap-2"
                aria-pressed={theme === 'light'}
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className="w-full justify-start gap-2"
                aria-pressed={theme === 'dark'}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange('system')}
                className="w-full justify-start gap-2"
                aria-pressed={theme === 'system'}
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>

          {/* Current Status */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Current: {languageNames[locale as Locale]}, {theme} theme</div>
            <div>Press Esc to close, Tab to navigate</div>
          </div>
        </div>
      </Card>
    </>
  );
});

AccessibilityPanel.displayName = "AccessibilityPanel";