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
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

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

  const exportToCSV = () => {
    if (!series.length) return

    const csvData = series[0].data.map((point, index) => {
      const row: any = { date: point.date, [series[0].name]: point.value }
      series.slice(1).forEach(s => {
        const matchingPoint = s.data[index]
        row[s.name] = matchingPoint?.value || 0
      })
      return row
    })

    const headers = ['date', ...series.map(s => s.name)]
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'chart'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    if (!series.length) return

    const jsonData = {
      title: title || "Area Chart",
      description,
      series: series.map(s => ({
        name: s.name,
        data: s.data
      }))
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'chart'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>{title ?? "Area Chart"}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex items-center gap-2 px-6 pt-4 pb-3 sm:!py-0">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToJSON}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
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
              <Tooltip
                labelFormatter={(v) => {
                  try {
                    const d = new Date(String(v))
                    return timeSeries
                      ? d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  } catch {
                    return String(v)
                  }
                }}
                formatter={(value: number, name: string, props: any) => {
                  // Calculate trend from previous data point
                  const dataIndex = props.payload?.index
                  const seriesData = series.find(s => s.name === name)?.data
                  let trend = null
                  let trendPercent = null

                  if (seriesData && dataIndex > 0) {
                    const current = value
                    const previous = seriesData[dataIndex - 1]?.value
                    if (previous && previous > 0) {
                      trend = current - previous
                      trendPercent = ((trend / previous) * 100)
                    }
                  }

                  const trendIcon = trend !== null
                    ? (trend > 0 ? "↗" : trend < 0 ? "↘" : "→")
                    : ""
                  const trendColor = trend !== null
                    ? (trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#6b7280")
                    : "#6b7280"

                  return [
                    <div key="value" className="flex items-center gap-2">
                      <span className="font-medium">{value.toLocaleString()}</span>
                      {trend !== null && (
                        <span
                          className="text-xs"
                          style={{ color: trendColor }}
                        >
                          {trendIcon} {Math.abs(trendPercent!).toFixed(1)}%
                        </span>
                      )}
                    </div>,
                    name
                  ]
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              />
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