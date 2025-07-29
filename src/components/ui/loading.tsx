import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <Loader2 
      className={cn("animate-spin", sizeClasses[size], className)} 
    />
  );
}

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSpinner?: boolean;
}

function LoadingState({ 
  message = "Loading...", 
  size = "md", 
  className,
  showSpinner = true 
}: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div className="flex flex-col items-center gap-2">
        {showSpinner && <LoadingSpinner size={size} />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Enhanced skeleton components for specific use cases
export function SubscriptionCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("hover-lift overflow-hidden relative border-2", className)}>
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {/* Usage stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16 mb-4" />
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Card>
          ))}
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ChannelsOverviewSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("hover-lift overflow-hidden relative border-2", className)}>
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl bg-card border-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="w-24 h-5" />
                    <Skeleton className="w-32 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Action buttons skeleton */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscriptionManagementSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Current plan skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      
      {/* Available plans skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Generic loading wrapper for any component
interface LoadingWrapperProps {
  isLoading: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function LoadingWrapper({ 
  isLoading, 
  skeleton, 
  children, 
  className 
}: LoadingWrapperProps) {
  if (isLoading && skeleton) {
    return <div className={className}>{skeleton}</div>;
  }
  
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <LoadingState />
      </div>
    );
  }
  
  return <>{children}</>;
}