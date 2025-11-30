"use client";

import { useState } from "react";
import { useSafeTranslations } from "@/hooks/use-safe-translations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Gift,
  Clock,
  RefreshCw,
  History,
} from "lucide-react";
import { calculateTrialInfo } from "@/utils/trial-calculations";
import {
  formatNextBilling,
  formatUsagePeriod,
  formatCurrentBillingPeriod,
  formatBillingInterval,
} from "@/utils/time-formatting";
import { toast } from "sonner";
import { UserSubscription } from "@/lib/queries/subscription";
import {
  SubscriptionManagementSkeleton,
  LoadingWrapper,
} from "@/components/ui/loading";

interface SubscriptionStatusProps {
  subscription: UserSubscription | null;
  pastSubscription?: UserSubscription | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Dashboard-only component that displays current subscription status,
 * billing information, and cancel functionality.
 * This component is meant to be used alongside SharedPricingPlans.
 */
export function SubscriptionStatus({
  subscription,
  pastSubscription,
  isLoading = false,
  onRefresh,
}: SubscriptionStatusProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  return (
    <LoadingWrapper
      isLoading={isLoading}
      skeleton={<SubscriptionManagementSkeleton />}
    >
      <SubscriptionStatusContent
        subscription={subscription}
        pastSubscription={pastSubscription}
        isActionLoading={isActionLoading}
        setIsActionLoading={setIsActionLoading}
        onRefresh={onRefresh}
        showCancelDialog={showCancelDialog}
        setShowCancelDialog={setShowCancelDialog}
      />
    </LoadingWrapper>
  );
}

function SubscriptionStatusContent({
  subscription,
  pastSubscription,
  isActionLoading,
  setIsActionLoading,
  onRefresh,
  showCancelDialog,
  setShowCancelDialog,
}: {
  subscription: UserSubscription | null;
  pastSubscription?: UserSubscription | null;
  isActionLoading: boolean;
  setIsActionLoading: (loading: boolean) => void;
  onRefresh?: () => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (show: boolean) => void;
}) {
  const t = useSafeTranslations("dashboard");
  const trialInfo = calculateTrialInfo({
    status: subscription?.status || "",
    current_period_start: subscription?.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : undefined,
    current_period_end: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : undefined,
  });

  const nextBillingDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const activePlan = {
    name: subscription?.product?.name ?? "No active plan",
    features: [
      `Tokens: ${
        subscription?.features?.tokens_limit
          ? subscription.features.tokens_limit.toLocaleString()
          : "N/A"
      } per month`,
      `Requests: ${
        subscription?.features?.requests_limit
          ? subscription.features.requests_limit.toLocaleString()
          : "N/A"
      } per month`,
      `History: ${subscription?.features?.history_limit ?? "N/A"} days`,
    ],
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelAtPeriodEnd = async () => {
    if (!subscription) return;

    setIsActionLoading(true);
    setShowCancelDialog(false);
    try {
      const res = await fetch("/api/user/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // server will infer user from session
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || "failed to schedule cancellation");
      }

      switch (payload?.message) {
        case "already_cancelled_at_period_end":
          toast.info(t("subscriptionMgmt.current.cancelAlreadyScheduled"));
          break;
        case "subscription_already_canceled":
          toast.info(t("subscriptionMgmt.current.cancelAlreadyCanceled"));
          break;
        case "subscription_missing":
        case "no_subscription_for_customer":
          toast.info(t("subscriptionMgmt.current.cancelNoSubscription"));
          break;
        case "cancel_scheduled":
          toast.success(t("subscriptionMgmt.current.cancelSuccess"));
          break;
        default:
          toast.success(t("subscriptionMgmt.current.cancelSuccess"));
          break;
      }

      // Ask parent to refresh subscription data
      onRefresh?.();
    } catch (err) {
      console.error("CANCEL_SUBSCRIPTION_ERROR", { err });
      toast.error(t("subscriptionMgmt.current.cancelError"));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper function to format date from Unix timestamp
  const formatDate = (timestamp: number | undefined | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Helper function to get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "canceled":
        return {
          label: t("subscriptionMgmt.pastStatus.canceled"),
          variant: "destructive" as const,
        };
      case "past_due":
        return {
          label: t("subscriptionMgmt.pastStatus.pastDue"),
          variant: "outline" as const,
        };
      case "unpaid":
        return {
          label: t("subscriptionMgmt.pastStatus.unpaid"),
          variant: "outline" as const,
        };
      case "incomplete":
        return {
          label: t("subscriptionMgmt.pastStatus.incomplete"),
          variant: "secondary" as const,
        };
      case "incomplete_expired":
        return {
          label: t("subscriptionMgmt.pastStatus.incompleteExpired"),
          variant: "destructive" as const,
        };
      default:
        return {
          label: status,
          variant: "secondary" as const,
        };
    }
  };

  // Show past subscription history when there's no active subscription
  if (!subscription) {
    // If there's a past subscription, show its history
    if (pastSubscription) {
      const statusInfo = getStatusInfo(pastSubscription.status);

      return (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <History className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">
                    {t("subscriptionMgmt.past.title")}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  {t("subscriptionMgmt.past.description")}
                </CardDescription>
              </div>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="h-8 px-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">
                    {t("subscriptionMgmt.common.refresh")}
                  </span>
                  <span className="xs:hidden">Refresh</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                  <h3 className="font-semibold text-base sm:text-lg leading-tight">
                    {pastSubscription.product?.name ||
                      t("subscriptionMgmt.past.unknownPlan")}
                  </h3>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("subscriptionMgmt.past.periodInfo")}
                  </span>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("subscriptionMgmt.past.startedOn")}
                    </span>
                    <span className="text-sm">
                      {formatDate(pastSubscription.current_period_start)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("subscriptionMgmt.past.endedOn")}
                    </span>
                    <span className="text-sm">
                      {formatDate(pastSubscription.current_period_end)}
                    </span>
                  </div>

                  {pastSubscription.billing_interval && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("subscriptionMgmt.billingCycle")}
                      </span>
                      <span className="text-sm">
                        {formatBillingInterval(
                          pastSubscription.billing_interval,
                          pastSubscription.billing_interval_count || 1
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("subscriptionMgmt.past.renewMessage")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    // No subscription at all (neither active nor past)
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">
                  {t("subscriptionMgmt.current.title")}
                </span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t("subscriptionMgmt.current.description")}
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 px-3 text-xs sm:text-sm whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">
                  {t("subscriptionMgmt.common.refresh")}
                </span>
                <span className="xs:hidden">Refresh</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {t("subscriptionMgmt.status.noActiveSubscription")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("subscriptionMgmt.available.description")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">
                  {t("subscriptionMgmt.current.title")}
                </span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t("subscriptionMgmt.current.description")}
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 px-3 text-xs sm:text-sm whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">
                  {t("subscriptionMgmt.common.refresh")}
                </span>
                <span className="xs:hidden">Refresh</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                <h3 className="font-semibold text-base sm:text-lg leading-tight">
                  {subscription?.status === "trialing"
                    ? `${
                        subscription?.product?.name ||
                        t("subscriptionMgmt.common.freeTrial")
                      }`
                    : subscription?.product?.name ||
                      t("subscription.subscriptionTitle", {
                        default: "Subscription Plan",
                      })}
                </h3>
                {subscription?.status === "trialing" && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/30 shadow-sm text-xs"
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    <span className="hidden xs:inline">
                      {t("subscriptionMgmt.common.freeTrial")}
                    </span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {subscription?.status === "trialing"
                  ? trialInfo?.isExpired
                    ? t("subscriptionMgmt.status.trialExpired")
                    : t("subscriptionMgmt.status.trialActive")
                  : t("subscriptionMgmt.status.subscriptionPlan")}
              </p>
            </div>
            {subscription?.status === "trialing" &&
              trialInfo &&
              !trialInfo.isExpired && (
                <div className="text-center sm:text-right">
                  <div className="text-lg sm:text-xl font-bold text-primary">
                    {trialInfo.daysRemaining}{" "}
                    {t("subscriptionMgmt.common.daysLeft")}
                  </div>
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {subscription.status === "trialing"
                    ? t("subscriptionMgmt.trial.period")
                    : t("subscriptionMgmt.billingInfo")}
                </span>
              </div>

              {subscription.status === "trialing" ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
                    {formatUsagePeriod(
                      subscription.current_period_start
                        ? new Date(
                            subscription.current_period_start * 1000
                          ).toISOString()
                        : null,
                      subscription.current_period_end
                        ? new Date(
                            subscription.current_period_end * 1000
                          ).toISOString()
                        : null
                    )}
                  </div>
                  {trialInfo && (
                    <div className="space-y-4 bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                          {t("subscriptionMgmt.trial.progressLabel")}
                        </span>
                        <span className="font-semibold text-foreground">
                          {trialInfo.daysPassed}{" "}
                          {t("subscriptionMgmt.trial.started", {
                            days: "",
                          }).replace("{days}", "")}{" "}
                          {t("subscriptionMgmt.trial.progressLabel")}
                        </span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-4 overflow-hidden shadow-inner">
                        <div
                          className="h-4 rounded-full transition-all duration-700 ease-out bg-primary shadow-sm"
                          style={{
                            width: `${Math.min(
                              (trialInfo.daysPassed / trialInfo.totalDays) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">
                            {t("subscriptionMgmt.trial.started", {
                              days: trialInfo.daysPassed,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-primary font-semibold">
                          <Gift className="h-3.5 w-3.5" />
                          <span>
                            {t("subscriptionMgmt.trial.remaining", {
                              days: trialInfo.daysRemaining,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("subscriptionMgmt.billingCycle")}
                      </span>
                      <span className="text-sm font-medium">
                        {formatBillingInterval(
                          subscription.billing_interval || "month",
                          subscription.billing_interval_count || 1
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("subscriptionMgmt.currentPeriod")}
                      </span>
                      <span className="text-sm">
                        {formatCurrentBillingPeriod(
                          subscription.current_period_start,
                          subscription.current_period_end
                        )}
                      </span>
                    </div>

                    {nextBillingDate && (
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/50">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t("subscriptionMgmt.nextBilling")}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {formatNextBilling(nextBillingDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {subscription?.features && (
            <div>
              <h4 className="font-medium mb-3 text-sm sm:text-base">
                {t("subscriptionMgmt.planFeatures")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {activePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-destructive">
            {t("subscriptionMgmt.current.cancelButton", {
              default: "Cancel subscription",
            })}
          </CardTitle>
          <CardDescription>
            {t("subscriptionMgmt.actions.description", {
              default: "Manage your subscription settings.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.cancel_at_period_end && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("subscriptionMgmt.current.cancelledAtPeriodEnd")}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancel button: show when user has an active or trialing subscription and cancellation not already scheduled */}
          {!subscription.cancel_at_period_end &&
            subscription.status !== "canceled" &&
            subscription.status !== "unsubscribed" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex-1">
                  <h4 className="font-medium text-sm sm:text-base mb-1">
                    {t("subscriptionMgmt.current.cancelButton", {
                      default: "Cancel subscription",
                    })}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("subscriptionMgmt.current.cancelConfirm")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleCancelClick}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto"
                >
                  {t("subscriptionMgmt.current.cancelButton", {
                    default: "Cancel subscription",
                  })}
                </Button>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Alert Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("subscriptionMgmt.current.cancelButton")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("subscriptionMgmt.current.cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              {t("common.actions.cancel", { default: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAtPeriodEnd}
              disabled={isActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isActionLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.actions.processing", { default: "Processing..." })}
                </>
              ) : (
                t("subscriptionMgmt.current.cancelButton")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
