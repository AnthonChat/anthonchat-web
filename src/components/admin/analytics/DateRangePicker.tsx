"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter, useSearchParams } from "next/navigation"
import type { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  paramKey: string
  defaultPreset: "7d" | "30d" | "this_month" | "lifetime"
  allowAllTime?: boolean
  inheritFromKey?: string
  className?: string
  compact?: boolean
  /** When true, show an interval selector that writes `${paramKey}_interval` into the URL */
  showIntervalOptions?: boolean
}

function parseISODate(iso?: string | null): Date | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function addDays_helper(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function DateRangePicker({
  paramKey,
  defaultPreset,
  allowAllTime = true,
  inheritFromKey,
  className,
  compact = false,
  showIntervalOptions = false,
}: DateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get current values from URL params
  const currentPreset = searchParams.get(paramKey) || defaultPreset
  const startParam = searchParams.get(`${paramKey}_start`)
  const endParam = searchParams.get(`${paramKey}_end`)
  
  // Check if this picker has an override or should inherit
  const hasOverride = 
    searchParams.get(paramKey) !== null ||
    startParam !== null ||
    endParam !== null

  // Determine effective values (with inheritance)
  let effectivePreset = currentPreset
  let effectiveStart = startParam
  let effectiveEnd = endParam

  if (!hasOverride && inheritFromKey) {
    const inhPreset = searchParams.get(inheritFromKey) || defaultPreset
    const inhStart = searchParams.get(`${inheritFromKey}_start`)
    const inhEnd = searchParams.get(`${inheritFromKey}_end`)
    
    if (inhStart || inhEnd) {
      effectivePreset = "custom"
      effectiveStart = inhStart
      effectiveEnd = inhEnd
    } else {
      effectivePreset = inhPreset
      effectiveStart = null
      effectiveEnd = null
    }
  }

  // Convert URL params to DateRange for calendar
  const initialFrom = parseISODate(effectiveStart)
  const initialToExclusive = parseISODate(effectiveEnd)
  const initialTo = initialToExclusive ? addDays_helper(initialToExclusive, -1) : undefined

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialFrom,
    to: initialTo,
  })

  // Sync local state with URL parameters when they change
  React.useEffect(() => {
    const urlFrom = parseISODate(effectiveStart)
    const urlToExclusive = parseISODate(effectiveEnd)
    const urlTo = urlToExclusive ? addDays_helper(urlToExclusive, -1) : undefined
    
    setDate({
      from: urlFrom,
      to: urlTo,
    })
  }, [effectiveStart, effectiveEnd])

  const updateParams = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()))
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) sp.delete(k)
      else sp.set(k, v)
    }
    router.replace("?" + sp.toString())
  }

  const setPreset = (preset: "7d" | "30d" | "this_month" | "lifetime") => {
    updateParams({
      [paramKey]: preset,
      [`${paramKey}_start`]: null,
      [`${paramKey}_end`]: null,
    })
  }

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range)
    if (range?.from && range?.to) {
      // Convert to UTC and make end exclusive
      const startIso = new Date(Date.UTC(
        range.from.getFullYear(),
        range.from.getMonth(),
        range.from.getDate()
      )).toISOString()
      
      const endExclusive = addDays_helper(range.to, 1)
      const endIso = new Date(Date.UTC(
        endExclusive.getFullYear(),
        endExclusive.getMonth(),
        endExclusive.getDate()
      )).toISOString()
      
      updateParams({
        [paramKey]: "custom",
        [`${paramKey}_start`]: startIso,
        [`${paramKey}_end`]: endIso,
      })
    }
  }

  // Generate label (compact variant uses shorter text)
  const getLabel = (isCompact: boolean) => {
    if (effectivePreset === "custom") {
      // Use URL parameters for label to ensure consistency
      const urlFrom = parseISODate(effectiveStart)
      const urlToExclusive = parseISODate(effectiveEnd)
      const urlTo = urlToExclusive ? addDays_helper(urlToExclusive, -1) : undefined

      if (urlFrom && urlTo) {
        const fmt = isCompact ? "M/d" : "LLL dd, y"
        return `${format(urlFrom, fmt)} - ${format(urlTo, fmt)}`
      }

      // Fallback to local state if URL params not available
      if (date?.from && date?.to) {
        const fmt = isCompact ? "M/d" : "LLL dd, y"
        return `${format(date.from, fmt)} - ${format(date.to, fmt)}`
      }

      return isCompact ? "Range" : "Pick a date range"
    }

    if (isCompact) {
      switch (effectivePreset) {
        case "7d":
          return "7d"
        case "30d":
          return "30d"
        case "this_month":
          return "This mo"
        case "lifetime":
          return "All time"
        default:
          return "Range"
      }
    }

    switch (effectivePreset) {
      case "7d":
        return "Last 7 days"
      case "30d":
        return "Last 30 days"
      case "this_month":
        return "This month"
      case "lifetime":
        return "All time"
      default:
        return "Pick a date range"
    }
  }

  return (
    <div className={cn(compact ? "inline-flex items-center" : "grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              compact
                ? "h-7 w-auto min-w-[100px] max-w-[160px] justify-start text-left font-normal overflow-hidden whitespace-nowrap text-[11px] px-1.5"
                : "h-9 w-[280px] sm:w-[320px] max-w-[90vw] justify-start text-left font-normal overflow-hidden whitespace-nowrap text-sm",
              !date && "text-muted-foreground"
            )}
            aria-label="Select date range"
          >
            <CalendarIcon className={cn("mr-2 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            <span className="block truncate">{getLabel(compact)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(compact ? "p-0 w-[260px] max-w-[90vw]" : "p-0 w-[320px] sm:w-[360px] max-w-[90vw]")} align="start">
          <div className={cn("flex flex-col", compact ? "p-2" : "p-4")}>
            <div className={cn("flex flex-col mb-3", compact ? "gap-1" : "gap-2")}>
              <div className={cn("grid grid-cols-2", compact ? "gap-1" : "gap-2")}>
                <Button
                  variant={effectivePreset === "7d" ? "default" : "outline"}
                  className={cn(compact ? "h-7 text-[11px]" : "h-8 text-xs")}
                  onClick={() => setPreset("7d")}
                >
                  Last 7 days
                </Button>
                <Button
                  variant={effectivePreset === "30d" ? "default" : "outline"}
                  className={cn(compact ? "h-7 text-[11px]" : "h-8 text-xs")}
                  onClick={() => setPreset("30d")}
                >
                  Last 30 days
                </Button>
                <Button
                  variant={effectivePreset === "this_month" ? "default" : "outline"}
                  className={cn(compact ? "h-7 text-[11px]" : "h-8 text-xs")}
                  onClick={() => setPreset("this_month")}
                >
                  This month
                </Button>
                {allowAllTime && (
                  <Button
                    variant={effectivePreset === "lifetime" ? "default" : "outline"}
                    className={cn(compact ? "h-7 text-[11px]" : "h-8 text-xs")}
                    onClick={() => setPreset("lifetime")}
                  >
                    All time
                  </Button>
                )}
              </div>

              {/* Interval selector (optional via prop). Renders client-side only. */}
              {showIntervalOptions && typeof window !== "undefined" && (
                <div className={cn("flex items-center", compact ? "mt-1 gap-1" : "mt-2 gap-2")}>
                  <label className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>Interval</label>
                  <select
                    className={cn("rounded border px-2", compact ? "h-7 text-[11px]" : "h-8 text-xs")}
                    value={searchParams.get(`${paramKey}_interval`) || searchParams.get('interval') || "3h"}
                    onChange={(e) => {
                      const v = e.target.value || null
                      updateParams({ [`${paramKey}_interval`]: v })
                    }}
                  >
                    <option value="1h">1h</option>
                    <option value="3h">3h</option>
                    <option value="6h">6h</option>
                    <option value="12h">12h</option>
                    <option value="24h">24h</option>
                  </select>
                </div>
              )}
            </div>
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={1}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}