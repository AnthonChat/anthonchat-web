"use client"

import React from "react"
import {
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type Point = { date: string; value: number }
type Series = { name: string; data: Point[]; color?: string }

interface AreaChartProps {
  title?: string
  description?: string
  series?: Series[]
  height?: number
  compact?: boolean
  className?: string
}

/**
 * Utility: returns true if any data point includes time-of-day (non-midnight)
 */
function hasTimeComponent(data: Point[]) {
  if (!data || data.length === 0) return false
  try {
    return data.some((p) => {
      const d = new Date(p.date)
      // If hours/minutes not zero => has time component
      return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
    })
  } catch {
    return false
  }
}

/**
 * Compute day boundary X positions (ISO strings) between first and last data point.
 * Boundaries are at local midnight between start and end.
 */
function computeDayBoundaries(data: Point[]) {
  const out: string[] = []
  if (!data || data.length === 0) return out
  const first = new Date(data[0].date)
  const last = new Date(data[data.length - 1].date)
  // Start from the next midnight after first (local)
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1)
  for (let t = start.getTime(); t <= last.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(new Date(t).toISOString())
  }
  return out
}

const defaultSeries: Series[] = [
  {
    name: "Visitors",
    color: "var(--chart-1)",
    data: (() => {
      const out: Point[] = []
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        out.push({
          date: d.toISOString().slice(0, 10),
          value: Math.round(100 + Math.sin(i / 5) * 30 + Math.random() * 30),
        })
      }
      return out
    })(),
  },
]

export default function AreaChart({
  title,
  description,
  series = defaultSeries,
  height = 250,
  compact = false,
  className,
}: AreaChartProps) {
  // Prefer the app primary color by default so charts match the UI.
  // Use `var(--primary)` token which is consistent with existing `text-primary` usage.
  const primaryColors = series.map((s) => s.color || "var(--primary)")
  const data = series[0]?.data ?? []

  const timeSeries = hasTimeComponent(data)
  const dayBoundaries = timeSeries ? computeDayBoundaries(data) : []

  // Compact mode: minimal chart suitable for inline KPI display.
  if (compact) {
    const s = series[0] ?? defaultSeries[0]
    return (
      <div className={className} style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReAreaChart data={s.data} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
            {/* Minimal axes / no grid for compact sparkline-like look */}
            <XAxis dataKey="date" axisLine={false} tick={false} />
            <YAxis hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke={s.color || primaryColors[0]}
              fill={s.color || primaryColors[0]}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </ReAreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>{title ?? "Area Chart"}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  // Space ticks to ~8 visible ticks by default to avoid overlap on small screens.
                  interval={Math.max(0, Math.floor((data.length - 1) / 8))}
                  tickFormatter={(v) => {
                    try {
                      const d = new Date(v)
                      if (timeSeries) {
                        // Show hours in 24h format without minutes, e.g. "14"
                        const hh = String(d.getHours()).padStart(2, "0")
                        return hh
                      }
                      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    } catch {
                      return String(v)
                    }
                  }}
                />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip labelFormatter={(v) => {
                try {
                  const d = new Date(String(v))
                  return timeSeries
                    ? d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                } catch {
                  return String(v)
                }
              }} />
              {/* Day boundary vertical reference lines (at local midnights) */}
              {dayBoundaries.map((iso) => (
                <ReferenceLine key={`day-${iso}`} x={iso} stroke="#e5e7eb" strokeDasharray="3 3" />
              ))}
              {series.map((s, idx) => (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey="value"
                  data={s.data}
                  name={s.name}
                  stroke={s.color || primaryColors[idx]}
                  fill={s.color || primaryColors[idx]}
                  fillOpacity={0.2}
                />
              ))}
            </ReAreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}