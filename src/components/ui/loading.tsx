"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function Loading({ size = "md", text, className }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-primary border-t-transparent",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground mt-2">{text}</p>
      )}
    </div>
  )
}

export function LoadingCard({ text = "Loading...", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("min-h-[200px] flex items-center justify-center p-4", className)}>
      <Loading text={text} />
    </div>
  )
}

export function LoadingTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-4 bg-muted rounded w-4" />
          <div className="h-4 bg-muted rounded flex-1" />
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Generic wrapper to render a skeleton while loading.
 * Falls back to a minimal LoadingCard if no skeleton is provided.
 */
export interface LoadingWrapperProps {
  isLoading?: boolean
  skeleton?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function LoadingWrapper({
  isLoading = false,
  skeleton,
  className,
  children,
}: LoadingWrapperProps) {
  if (isLoading) {
    return <div className={cn("relative", className)}>{skeleton ?? <LoadingCard />}</div>
  }
  return <>{children}</>
}

/**
 * SubscriptionCard skeleton used by features/subscription/SubscriptionCard
 */
export function SubscriptionCardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-1/3" />
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-1/4" />
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <Skeleton className="h-3 w-1/4 rounded-full" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/**
 * SubscriptionManagement skeleton used by features/subscription/SubscriptionManagement
 */
export function SubscriptionManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Current Subscription Status Card */}
      <div className="p-4 sm:p-6 space-y-4 border rounded-lg">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="p-4 sm:p-6 border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}