"use client";

import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { 
  locales, 
  getPathWithLocale, 
  isSupportedLocale, 
  defaultLocale,
  extractLocaleFromPath,
  type Locale 
} from '@/i18n/routing';

/**
 * Custom hook for global keyboard shortcuts:
 * - Alt+L: Cycle through available languages
 * - Alt+T: Cycle through theme options (light -> dark -> system)
 * - Prevents conflicts with browser shortcuts
 * - Works across all pages and contexts
 */
export function useKeyboardShortcuts() {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const activeLocale: Locale = isSupportedLocale((currentLocale ?? "") as string)
    ? ((currentLocale as unknown) as Locale)
    : defaultLocale;

  const cycleLanguage = useCallback(() => {
    const currentIndex = locales.indexOf(activeLocale);
    const nextIndex = (currentIndex + 1) % locales.length;
    const nextLocale = locales[nextIndex];
    
    const { pathnameWithoutLocale } = extractLocaleFromPath(pathname || "/");
    const basePath = pathnameWithoutLocale || "/";
    const newPath = getPathWithLocale(basePath, nextLocale);
    
    router.push(newPath);
  }, [activeLocale, pathname, router]);

  const cycleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Alt key combinations
      if (!event.altKey) return;
      
      // Prevent default browser behavior for our shortcuts
      if (event.key === 'l' || event.key === 'L') {
        event.preventDefault();
        cycleLanguage();
        return;
      }
      
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        cycleTheme();
        return;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cycleLanguage, cycleTheme]);

  return {
    cycleLanguage,
    cycleTheme,
    shortcuts: {
      language: 'Alt+L',
      theme: 'Alt+T'
    }
  };
}