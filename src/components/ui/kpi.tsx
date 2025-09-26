"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface KPIProps {
  label: string
  value: number
  format?: "number" | "percentage" | "currency"
  thresholds?: {
    good: number
    warning: number
  }
  className?: string
  showTrend?: boolean
  trend?: number
}

export function KPI({
  label,
  value,
  format = "number",
  thresholds,
  className,
  showTrend = false,
  trend,
}: KPIProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case "percentage":
        return `${val.toFixed(1)}%`
      case "currency":
        return `$${val.toLocaleString()}`
      default:
        return val.toLocaleString()
    }
  }

  const getColorClass = () => {
    if (!thresholds) return "text-foreground"

    if (value >= thresholds.good) {
      return "text-green-600"
    } else if (value >= thresholds.warning) {
      return "text-yellow-600"
    } else {
      return "text-red-600"
    }
  }

  const getTrendIcon = () => {
    if (!showTrend || trend === undefined) return null

    const icon = trend > 0 ? "↗" : trend < 0 ? "↘" : "→"
    const color = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"

    return (
      <span className={cn("text-xs ml-1", color)}>
        {icon} {Math.abs(trend).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-2xl font-bold", getColorClass())}>
        {formatValue(value)}
        {getTrendIcon()}
      </div>
    </div>
  )
}