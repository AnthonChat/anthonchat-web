"use client";

import React from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import {
  Clock,
  Zap,
  Activity,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Calendar,
  Target,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";

// --- Step 1: Import the new data types and utility functions ---
import { UserSubscription } from "@/lib/queries/subscription";
import type { UsageData } from "@/lib/types/usage";
import { useRealtimeUsage } from "@/hooks/use-realtime-usage";
import { formatTrialTimeRemaining } from "@/utils/time-formatting";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedProgress } from "@/components/ui/animated-progress";


import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  SubscriptionCardSkeleton,
  LoadingWrapper,
} from "@/components/ui/loading";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";



// --- Step 2: Update the component's props interface ---
interface SubscriptionCardProps {
  subscription: UserSubscription | null;
  usage: UsageData;
  userId: string;
  isLoading?: boolean;
}

// Memoized usage display component for better performance
const UsageDisplay = React.memo(
  ({
    title,
    icon: Icon,
    used,
    limit,
    percent,
    getProgressColor,
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    used: number;
    limit: number;
    percent: number;
    getProgressColor: (percent: number) => string;
  }) => {
    const t = useTranslations('dashboard');
    // Ensure all values are valid numbers
    const safeUsed = typeof used === "number" && !isNaN(used) ? used : 0;
    const safeLimit =
      typeof limit === "number" && !isNaN(limit) && limit > 0 ? limit : 1;
    const safePercent =
      typeof percent === "number" && !isNaN(percent) ? percent : 0;

    // Calculate remaining and status
    const remaining = safeLimit - safeUsed;
    const isNearLimit = safePercent >= 90;
    const isOverLimit = safePercent > 100;
    const isHealthy = safePercent < 75;

    // Get status info
    const getStatusInfo = () => {
      if (isOverLimit) {
        return {
          status: "Over Limit",
          color: "destructive",
          icon: XCircle,
          description: "You have exceeded your usage limit",
        };
      }
      if (isNearLimit) {
        return {
          status: "Near Limit",
          color: "warning",
          icon: AlertTriangle,
          description: "You&apos;re approaching your usage limit",
        };
      }
      if (isHealthy) {
        return {
          status: "Healthy",
          color: "success",
          icon: CheckCircle,
          description: "Your usage is within normal limits",
        };
      }
      return {
        status: "Moderate",
        color: "secondary",
        icon: Info,
        description: "Your usage is at a moderate level",
      };
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Card className="cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {title}
              </CardTitle>
              <Badge
                variant={
                  isOverLimit
                    ? "destructive"
                    : isNearLimit
                    ? "secondary"
                    : "outline"
                }
                className="text-xs"
              >
                {safePercent.toFixed(0)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={safeUsed} />
              </div>
              <p className="text-xs text-muted-foreground">
                of {safeLimit.toLocaleString()}
              </p>
              <div className="relative mt-4">
                <div className="h-3 bg-border rounded-full overflow-hidden">
                  <AnimatedProgress
                    value={safePercent}
                    className={getProgressColor(safePercent)}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {safePercent.toFixed(1)}% used
                  </span>
                  {safePercent >= 90 && (
                    <span className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Near limit
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
          <SheetHeader className="space-y-4 px-6 pt-4 pb-3 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-xl flex-shrink-0 ${
                  isOverLimit
                    ? "bg-destructive/10 text-destructive"
                    : isNearLimit
                    ? "bg-warning/10 text-warning"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold leading-tight mb-1">
                  {title} Usage Details
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Comprehensive breakdown of your current {title.toLowerCase()}{" "}
                  usage and limits.
                </SheetDescription>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <Badge
                variant={
                  statusInfo.color as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline"
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {statusInfo.status}
              </Badge>
              <span className="text-sm text-muted-foreground flex-1">
                {statusInfo.description}
              </span>
            </div>
          </SheetHeader>

          <div className="px-6 pb-4 space-y-5 flex-1 overflow-y-auto">
            {/* Usage Overview Card */}
            <Card className="border-2 shadow-sm">
              <CardHeader className="pb-3 px-6 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Usage Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Current Usage</span>
                    <span className="text-muted-foreground font-medium text-sm">
                      {safePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-4 bg-border rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full relative",
                        getProgressColor(safePercent)
                      )}
                      style={{ width: `${Math.min(safePercent, 100)}%` }}
                    >
                      {safePercent > 100 && (
                        <div className="absolute inset-0 bg-destructive animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Usage Stats Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Used
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      <AnimatedNumber value={safeUsed} />
                    </div>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Remaining
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-lg font-bold",
                        remaining < 0 ? "text-destructive" : "text-success"
                      )}
                    >
                      <AnimatedNumber value={Math.abs(remaining)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 px-6 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Detailed Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-6 pb-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm font-medium">Total Limit</span>
                  <span className="font-bold text-base">
                    {safeLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm font-medium">Currently Used</span>
                  <span className="font-bold text-base">
                    {safeUsed.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm font-medium">Remaining</span>
                  <span
                    className={cn(
                      "font-bold text-base",
                      remaining < 0 ? "text-destructive" : "text-success"
                    )}
                  >
                    {remaining.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Usage Percentage</span>
                  <span
                    className={`font-bold text-base ${
                      isOverLimit
                        ? "text-destructive"
                        : isNearLimit
                        ? "text-warning"
                        : "text-primary"
                    }`}
                  >
                    {safePercent.toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {(isNearLimit || isOverLimit) && (
              <Card
                className={cn(
                  "border-2 shadow-sm",
                  isOverLimit
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-warning/50 bg-warning/5"
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    className={cn(
                      "text-base font-semibold flex items-center gap-2",
                      isOverLimit ? "text-destructive" : "text-warning"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {isOverLimit ? "Action Required" : "Recommendations"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  <div className="space-y-2">
                    {isOverLimit ? (
                      <>
                        <p className="text-sm text-destructive font-medium">
                          You have exceeded your {title.toLowerCase()} limit.
                          Your service may be restricted.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Consider upgrading your plan to avoid service
                          interruptions.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-warning font-medium">
                          You&apos;re approaching your {title.toLowerCase()}{" "}
                          limit.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Monitor your usage closely or consider upgrading to
                          avoid hitting the limit.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-1 px-1">
              <Button className="flex-1 h-10 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('subscription.upgradeButton')}
              </Button>
              <Button
                variant="outline"
                className="h-10 px-4 text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('subscription.refreshButton')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

UsageDisplay.displayName = "UsageDisplay";

// Main component with error boundary and optimizations
function SubscriptionCardContent({
  subscription,
  usage,
  userId,
}: SubscriptionCardProps) {
  const router = useLocaleRouter();
  const t = useTranslations('dashboard');

  // The real-time hook is initialized with the server-fetched usage data.
  const {
    usage: realtimeUsage,
    isConnected,
    error: realtimeError,
    reconnect,
    isInitialLoading,
  } = useRealtimeUsage({
    userId,
    initialUsage: usage,
    enabled: true,
  });

  const isTrialing = subscription?.status === "trialing";
  const isActive = subscription?.status === "active";
  const hasActiveSubscription = isTrialing || isActive;

  // --- Step 3: Handle numeric timestamps ---
  const trialTimeDisplay = React.useMemo(() => {
    return formatTrialTimeRemaining(
      subscription?.trial_end
        ? new Date((subscription.trial_end as number) * 1000).toISOString()
        : null
    );
  }, [subscription?.trial_end]);

  // Usage percentages are calculated using the real-time data from our hook.
  const tokensUsagePercent = React.useMemo(() => {
    const used = realtimeUsage.tokens_used ?? 0;
    const limit = realtimeUsage.tokens_limit ?? 10000;
    return limit > 0 ? (used / limit) * 100 : 0;
  }, [realtimeUsage.tokens_used, realtimeUsage.tokens_limit]);

  const requestsUsagePercent = React.useMemo(() => {
    const used = realtimeUsage.requests_used ?? 0;
    const limit = realtimeUsage.requests_limit ?? 100;
    return limit > 0 ? (used / limit) * 100 : 0;
  }, [realtimeUsage.requests_used, realtimeUsage.requests_limit]);

  const getProgressColor = React.useCallback((percent: number) => {
    if (percent >= 90) return "bg-destructive";
    if (percent >= 75) return "bg-warning";
    return "bg-primary";
  }, []);

  const handleUpgradeClick = React.useCallback(() => {
    router.push("/dashboard/subscription");
  }, [router]);

  // Show error state if realtime connection fails
  if (realtimeError && !isConnected) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="text-sm text-muted-foreground">
                Unable to load real-time data. {realtimeError}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift overflow-hidden relative border-2">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-lg shadow-lg">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {t('subscription.statusTitle')}
              </span>
            </div>
          </CardTitle>
          {/* Realtime status indicators removed */}
        </div>
        <CardDescription className="text-base font-semibold mt-2 text-muted-foreground">
          {subscription?.product?.name || t('subscription.noActive')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {isTrialing && trialTimeDisplay && (
          <div className="flex items-center gap-3 p-4 bg-warning/10 border-2 border-warning rounded-xl text-warning-foreground shadow-warning animate-scale-in">
            <div className="p-2 bg-warning rounded-lg">
              <Clock className="h-4 w-4 text-warning-foreground" />
            </div>
            <div>
              <p className="font-semibold text-warning">Trial Period Active</p>
              <p className="text-sm text-warning/80">{trialTimeDisplay}</p>
            </div>
          </div>
        )}

        {hasActiveSubscription &&
          (isInitialLoading ? (
            <div className="space-y-4">
              {/* Tokens Usage Skeleton */}
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-12 bg-muted animate-pulse rounded mb-4" />
                  <div className="relative mt-4">
                    <div className="h-3 bg-border rounded-full overflow-hidden">
                      <div className="h-3 w-1/3 bg-muted animate-pulse rounded-full" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requests Usage Skeleton */}
              <Card className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-12 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded mb-4" />
                  <div className="relative mt-4">
                    <div className="h-3 bg-border rounded-full overflow-hidden">
                      <div className="h-3 w-1/4 bg-muted animate-pulse rounded-full" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <UsageDisplay
                title="Tokens Used"
                icon={Zap}
                used={realtimeUsage.tokens_used ?? 0}
                limit={realtimeUsage.tokens_limit ?? 10000}
                percent={tokensUsagePercent}
                getProgressColor={getProgressColor}
              />

              <UsageDisplay
                title="Requests Used"
                icon={Activity}
                used={realtimeUsage.requests_used ?? 0}
                limit={realtimeUsage.requests_limit ?? 100}
                percent={requestsUsagePercent}
                getProgressColor={getProgressColor}
              />
            </>
          ))}

        {(isTrialing || !subscription) && (
          <div className="pt-6 border-t border-border/50">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleUpgradeClick}
            >
              <Zap className="h-5 w-5 mr-2 group-hover:animate-bounce" />
              {t('subscription.upgradeButton')}
            </Button>
          </div>
        )}

        {isActive && (
          <div className="pt-6 border-t border-border/50">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-semibold bg-card border-2 border-primary hover:bg-primary/10"
              onClick={handleUpgradeClick}
            >
              <TrendingUp className="h-5 w-5 mr-2 group-hover:scale-110" />
              {t('subscription.manageButton')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export the component wrapped with error boundary
export const SubscriptionCard = React.memo(function SubscriptionCard(
  props: SubscriptionCardProps
) {
  const { isLoading = false, ...restProps } = props;

  return (
    <ErrorBoundary
      fallback={
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to load subscription data</p>
                <p className="text-sm text-muted-foreground">
                  Please refresh the page or contact support if the problem
                  persists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoadingWrapper
        isLoading={isLoading}
        skeleton={<SubscriptionCardSkeleton />}
      >
        <SubscriptionCardContent {...restProps} />
      </LoadingWrapper>
    </ErrorBoundary>
  );
});
