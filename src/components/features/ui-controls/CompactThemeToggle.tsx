'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useEffect, useState, memo } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CompactThemeToggleProps {
  className?: string;
  variant?: 'dropdown' | 'cycle';
}

/**
 * Enhanced theme toggle with system theme support:
 * - Supports light/dark/system themes
 * - Two variants: dropdown (full control) or cycle (simple toggle)
 * - Icon-based with sun/moon/monitor icons
 * - Smooth transitions and animations
 * - Compact design optimized for headers
 * - Memoized to prevent unnecessary re-renders
 */
export const CompactThemeToggle = memo(function CompactThemeToggle({
  className = "",
  variant = 'dropdown'
}: CompactThemeToggleProps) {
  const { setTheme, theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${className}`}
        disabled
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    )
  }

  const currentTheme = theme === 'system' ? systemTheme : theme
  
  if (variant === 'cycle') {
    // Simple cycle through light -> dark -> system
    const cycleTheme = () => {
      if (theme === 'light') {
        setTheme('dark')
      } else if (theme === 'dark') {
        setTheme('system')
      } else {
        setTheme('light')
      }
    }

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={cycleTheme}
        className={`h-8 w-8 transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
        aria-label={`Current theme: ${theme}. Click to cycle themes.`}
      >
        {theme === 'light' && (
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300" />
        )}
        {theme === 'dark' && (
          <Moon className="h-4 w-4 rotate-0 scale-100 transition-all duration-300" />
        )}
        {theme === 'system' && (
          <Monitor className="h-4 w-4 rotate-0 scale-100 transition-all duration-300" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  // Dropdown variant with full control
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-all duration-200 ${className}`}
          aria-label="Open theme selector"
        >
          {currentTheme === 'light' && (
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all" />
          )}
          {currentTheme === 'dark' && (
            <Moon className="h-4 w-4 rotate-0 scale-100 transition-all" />
          )}
          {theme === 'system' && (
            <Monitor className="h-4 w-4 rotate-0 scale-100 transition-all" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === 'system' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
});