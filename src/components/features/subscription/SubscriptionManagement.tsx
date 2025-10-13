"use client";

import { useState, useEffect } from "react";
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
  Crown,
  Zap,
  Gift,
  Clock,
  Star,
  Rocket,
  RefreshCw,
} from "lucide-react";
import { calculateTrialInfo } from "@/utils/trial-calculations";
import {
  formatNextBilling,
  formatUsagePeriod,
  formatCurrentBillingPeriod,
  formatBillingInterval,
} from "@/utils/time-formatting";
import { cn } from "@/lib/utils";

// Stripe imports
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { UserSubscription } from "@/lib/queries/subscription";
import { getAvailablePlans, SubscriptionPlan } from "@/lib/queries/plans";

import {
  SubscriptionManagementSkeleton,
  LoadingWrapper,
} from "@/components/ui/loading";

interface SubscriptionManagementProps {
  subscription: UserSubscription | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function SubscriptionManagement({
  subscription,
  isLoading = false,
  onRefresh,
}: SubscriptionManagementProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      setPlansLoading(true);
      try {
        const plans = await getAvailablePlans();
        setAvailablePlans(plans);
      } catch (error) {
        console.error("Failed to fetch plans", {
          error,
        });
        toast.error("Could not load subscription plans.");
      } finally {
        setPlansLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return (
    <LoadingWrapper
      isLoading={isLoading || plansLoading}
      skeleton={<SubscriptionManagementSkeleton />}
    >
      <SubscriptionManagementContent
        subscription={subscription}
        availablePlans={availablePlans}
        isActionLoading={isActionLoading}
        setIsActionLoading={setIsActionLoading}
        plansLoading={plansLoading}
        isYearly={isYearly}
        setIsYearly={setIsYearly}
        onRefresh={onRefresh}
        showCancelDialog={showCancelDialog}
        setShowCancelDialog={setShowCancelDialog}
      />
    </LoadingWrapper>
  );
}

function SubscriptionManagementContent({
  subscription,
  availablePlans,
  isActionLoading,
  setIsActionLoading,
  plansLoading,
  isYearly,
  setIsYearly,
  onRefresh,
  showCancelDialog,
  setShowCancelDialog,
}: {
  subscription: UserSubscription | null;
  availablePlans: SubscriptionPlan[];
  isActionLoading: boolean;
  setIsActionLoading: (loading: boolean) => void;
  plansLoading: boolean;
  isYearly: boolean;
  setIsYearly: (isYearly: boolean) => void;
  onRefresh?: () => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (show: boolean) => void;
}) {
  const t = useSafeTranslations('dashboard');
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

  // Trial configuration based on product metadata
  const isPlanEligibleForTrial = (plan: SubscriptionPlan) => {
    // Check if the product has free_trial metadata
    const freeTrialDays = plan.metadata?.free_trial;
    return (
      freeTrialDays &&
      !isNaN(Number(freeTrialDays)) &&
      Number(freeTrialDays) > 0
    );
  };

  const getTrialDaysForPlan = (plan: SubscriptionPlan) => {
    if (!isPlanEligibleForTrial(plan)) return 0;

    const freeTrialDays = plan.metadata?.free_trial;
    return Number(freeTrialDays) || 0;
  };

  const handleUpgrade = async (planSlug?: string) => {
    if (!planSlug) {
      // Error
      return;
    }

    const plan = availablePlans.find((p) => p.metadata?.slug === planSlug);
    const selectedInterval = isYearly ? "year" : "month";
    const price = plan?.prices.find(
      (p) => p.recurring?.interval === selectedInterval
    );

    if (!price?.id) {
      toast.error(
        "Plan configuration error - selected billing interval not available"
      );
      return;
    }

    setIsActionLoading(true);

    try {
      const trialDays = plan ? getTrialDaysForPlan(plan) : 0;
      const isStartingTrial = !subscription || subscription.status !== "active";
      const shouldOfferTrial = isStartingTrial && trialDays > 0;

      // Create Stripe checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: price.id,
          tierSlug: planSlug,
          trial_period_days: shouldOfferTrial ? trialDays : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error("CHECKOUT_ERROR", {
        error,
        planSlug,
      });
      toast.error("Failed to start checkout process");
    } finally {
      setIsActionLoading(false);
    }
  };
 
  const planCount = availablePlans.length;
  
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "failed to schedule cancellation");
      }

      const data = await res.json().catch(() => ({}));
      if (data && data.message === "already_cancelled_at_period_end") {
        toast.info(t('subscriptionMgmt.current.cancelAlreadyScheduled'));
      } else {
        toast.success(t('subscriptionMgmt.current.cancelSuccess'));
      }

      // Ask parent to refresh subscription data
      onRefresh?.();
    } catch (err) {
      console.error("CANCEL_SUBSCRIPTION_ERROR", { err });
      toast.error(t('subscriptionMgmt.current.cancelError'));
    } finally {
      setIsActionLoading(false);
    }
  };
 
  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{t('subscriptionMgmt.current.title')}</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t('subscriptionMgmt.current.description')}
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
                <span className="hidden xs:inline">{t('subscriptionMgmt.common.refresh')}</span>
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
                    ? `${subscription?.product?.name || t('subscriptionMgmt.common.freeTrial')}`
                    : subscription
                    ? subscription?.product?.name || t('subscription.subscriptionTitle', { default: 'Subscription Plan' })
                    : t('subscription.statusTitle').replace('Status','').trim() || "No Active Subscription"}
                </h3>
                {subscription?.status === "trialing" && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/30 shadow-sm text-xs"
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    <span className="hidden xs:inline">{t('subscriptionMgmt.common.freeTrial')}</span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {subscription?.status === "trialing"
                  ? trialInfo?.isExpired
                    ? t('subscriptionMgmt.status.trialExpired')
                    : t('subscriptionMgmt.status.trialActive')
                  : subscription
                  ? t('subscriptionMgmt.status.subscriptionPlan')
                  : t('subscriptionMgmt.status.noActiveSubscription')}
              </p>
            </div>
            {subscription?.status === "trialing" &&
              trialInfo &&
              !trialInfo.isExpired && (
                <div className="text-center sm:text-right">
                  <div className="text-lg sm:text-xl font-bold text-primary">
                    {trialInfo.daysRemaining} {t('subscriptionMgmt.common.daysLeft')}
                  </div>
                </div>
              )}
          </div>

          {subscription && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {subscription.status === "trialing"
                      ? t('subscriptionMgmt.trial.period')
                      : t('subscriptionMgmt.billingInfo')}
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
                            {t('subscriptionMgmt.trial.progressLabel')}
                          </span>
                          <span className="font-semibold text-foreground">
                            {trialInfo.daysPassed} {t('subscriptionMgmt.trial.started', { days: '' }).replace('{days}', '')} {t('subscriptionMgmt.trial.progressLabel') /* placeholder to keep structure */}
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
                              {t('subscriptionMgmt.trial.started', { days: trialInfo.daysPassed })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-primary font-semibold">
                            <Gift className="h-3.5 w-3.5" />
                            <span>
                              {t('subscriptionMgmt.trial.remaining', { days: trialInfo.daysRemaining })}
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
                          {t('subscriptionMgmt.billingCycle')}
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
                          {t('subscriptionMgmt.currentPeriod')}
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
                            {t('subscriptionMgmt.nextBilling')}
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
          )}

          {subscription?.features && (
            <div>
              <h4 className="font-medium mb-3 text-sm sm:text-base">{t('subscriptionMgmt.planFeatures')}</h4>
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

      {/* Enhanced Available Plans */}
      {(!subscription || subscription.status === "trialing") && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl">{t('subscriptionMgmt.available.title')}</CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  {t('subscriptionMgmt.available.description')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center bg-muted/50 rounded-lg p-1 w-full sm:w-auto">
                  <Button
                    variant={!isYearly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsYearly(false)}
                    className="h-8 px-3 text-xs flex-1 sm:flex-initial"
                  >
                    {t('subscriptionMgmt.available.monthly')}
                  </Button>
                  <Button
                    variant={isYearly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsYearly(true)}
                    className="h-8 px-3 text-xs flex-1 sm:flex-initial"
                  >
                    {t('subscriptionMgmt.available.yearly')}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-4 sm:gap-6",
                planCount === 1
                  ? "grid-cols-1 place-items-center"
                  : planCount === 2
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {plansLoading ? (
                <div className="text-center text-muted-foreground">
                  {t('subscriptionMgmt.available.loading')}
                </div>
              ) : (
                availablePlans
                  .sort((a, b) => {
                    // Sort plans by price for the selected billing interval
                    const selectedInterval = isYearly ? "year" : "month";
                    const priceA =
                      a.prices.find(
                        (p) => p.recurring?.interval === selectedInterval
                      )?.unit_amount || 0;
                    const priceB =
                      b.prices.find(
                        (p) => p.recurring?.interval === selectedInterval
                      )?.unit_amount || 0;

                    // Handle free plans (price = 0) - put them first
                    if (priceA === 0 && priceB === 0) return 0;
                    if (priceA === 0) return -1;
                    if (priceB === 0) return 1;

                    // Sort by price ascending (lowest to highest)
                    return priceA - priceB;
                  })
                  .map((plan) => {
                    // Plan-specific icons and colors
                    const planName = plan.name?.toLowerCase() || "";
                    let IconComponent, iconColor, iconBgColor;

                    if (planName.includes("basic")) {
                      IconComponent = Star;
                      iconColor = "text-blue-600";
                      iconBgColor = "bg-blue-50";
                    } else if (planName.includes("standard")) {
                      IconComponent = Crown;
                      iconColor = "text-orange-600";
                      iconBgColor = "bg-orange-50";
                    } else if (planName.includes("pro")) {
                      IconComponent = Rocket;
                      iconColor = "text-purple-600";
                      iconBgColor = "bg-purple-50";
                    } else {
                      IconComponent = Zap;
                      iconColor = "text-gray-600";
                      iconBgColor = "bg-gray-50";
                    }

                    const productMetadata = subscription?.product
                      ?.metadata as Record<string, unknown> | null;
                    const productSlug = productMetadata?.slug as
                      | string
                      | undefined;
                    const isCurrentPlan = productSlug === plan.metadata?.slug;

                    // Get the price for the selected billing interval
                    const selectedInterval = isYearly ? "year" : "month";
                    const selectedPrice = plan.prices.find(
                      (p) => p.recurring?.interval === selectedInterval
                    );
                    const monthlyPrice = plan.prices.find(
                      (p) => p.recurring?.interval === "month"
                    );
                    const yearlyPrice = plan.prices.find(
                      (p) => p.recurring?.interval === "year"
                    );

                    // Calculate savings for yearly billing
                    const monthlyCost = monthlyPrice?.unit_amount
                      ? monthlyPrice.unit_amount / 100
                      : 0;
                    const yearlyCost = yearlyPrice?.unit_amount
                      ? yearlyPrice.unit_amount / 100
                      : 0;
                    const yearlyMonthlyCost = yearlyCost / 12;
                    const savings =
                      monthlyCost > 0 && yearlyMonthlyCost > 0
                        ? ((monthlyCost - yearlyMonthlyCost) / monthlyCost) *
                          100
                        : 0;

                    return (
                      <Card
                        key={plan.id}
                        className={cn(
                          "relative overflow-hidden transition-all duration-200 hover:shadow-lg flex flex-col h-full",
                          planCount === 1 && "w-full sm:max-w-md mx-auto",
                          isCurrentPlan
                            ? "ring-2 ring-primary shadow-lg"
                            : "hover:shadow-md border-border/50"
                        )}
                      >
                        {isCurrentPlan && (
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                            {t('subscriptionMgmt.available.currentPlan')}
                          </div>
                        )}


                        <CardHeader className="text-center">
                          <div
                            className={cn(
                              "mx-auto p-3 rounded-lg w-fit",
                              iconBgColor
                            )}
                          >
                            <IconComponent
                              className={cn("h-6 w-6", iconColor)}
                            />
                          </div>
                          <CardTitle className="text-xl font-bold">
                            {plan.name}
                          </CardTitle>
                          <div className="space-y-2">
                            <div className="text-2xl sm:text-3xl font-bold leading-tight">
                              {selectedPrice?.unit_amount
                                ? `${t('subscriptionMgmt.currency.symbol')}${(selectedPrice.unit_amount / 100).toFixed(
                                    2
                                  )}`
                                : "Contact us"}
                              <span className="text-sm font-normal text-muted-foreground">
                                /{selectedPrice?.recurring?.interval}
                              </span>
                            </div>
                            {isYearly &&
                              selectedPrice?.unit_amount &&
                              monthlyPrice?.unit_amount && (
                                <div className="text-xs text-muted-foreground">
                                  {t('subscriptionMgmt.currency.symbol')}
                                  {(
                                    selectedPrice.unit_amount /
                                    100 /
                                    12
                                  ).toFixed(2)}
                                  {t('subscriptionMgmt.available.billedYearlySuffix')}
                                </div>
                              )}
                            {isYearly && savings > 0 && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 border-green-200 text-xs"
                              >
                                {t('subscriptionMgmt.available.savePercent', { percent: savings.toFixed(0) })}
                              </Badge>
                            )}
                          </div>
                          {plan.metadata?.popular && (
                            <Badge
                              variant="default"
                              className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-purple-600"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              {t('subscriptionMgmt.available.popular')}
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1 flex flex-col p-4 sm:p-6">
                          {/* Enhanced feature list based on plan */}
                          <div className="space-y-3 flex-1">
                            {plan.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {plan.description}
                              </p>
                            )}

                            <ul className="space-y-2 sm:space-y-3">
                              {(() => {
                                const planName = plan.name?.toLowerCase() || "";
                                const features = [];

                                if (planName.includes("basic")) {
                                  features.push(
                                    t('subscriptionMgmt.features.essentialAi'),
                                    t('subscriptionMgmt.features.basicChat'),
                                    t('subscriptionMgmt.features.standardResponse'),
                                    t('subscriptionMgmt.features.emailSupport')
                                  );
                                } else if (planName.includes("standard")) {
                                  features.push(
                                    t('subscriptionMgmt.features.advancedAi'),
                                    t('subscriptionMgmt.features.priorityChat'),
                                    t('subscriptionMgmt.features.fasterResponse'),
                                    t('subscriptionMgmt.features.emailChatSupport'),
                                    t('subscriptionMgmt.features.advancedAnalytics')
                                  );
                                } else if (planName.includes("pro")) {
                                  features.push(
                                    t('subscriptionMgmt.features.premiumAi'),
                                    t('subscriptionMgmt.features.prioritySupport'),
                                    t('subscriptionMgmt.features.fastestResponse'),
                                    t('subscriptionMgmt.features.support247'),
                                    t('subscriptionMgmt.features.advancedAnalytics'),
                                    t('subscriptionMgmt.features.customIntegrations')
                                  );
                                } else {
                                  // Fallback: use description text if provided
                                  const descFeatures = plan.description?.split(", ");
                                  if (descFeatures && descFeatures.length > 0) {
                                    features.push(...descFeatures);
                                  } else {
                                    features.push(
                                      t('subscriptionMgmt.features.allIncluded'),
                                      t('subscriptionMgmt.features.premiumSupport'),
                                      t('subscriptionMgmt.features.advancedCapabilities')
                                    );
                                  }
                                }

                                return features.map((feature, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{feature}</span>
                                  </li>
                                ));
                              })()}
                            </ul>
                          </div>


                          {/* Action Button - Always at bottom */}
                          <div className="mt-auto pt-4">
                            {!isCurrentPlan && selectedPrice && (
                              <Button
                                onClick={() =>
                                  handleUpgrade(plan.metadata?.slug)
                                }
                                disabled={isActionLoading}
                                className={cn("w-full transition-all duration-200")}
                                size="lg"
                              >
                                {t('subscriptionMgmt.available.upgrade')}
                              </Button>
                            )}

                            {isCurrentPlan && (
                              <Button
                                variant="outline"
                                className="w-full"
                                disabled
                                size="lg"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('subscriptionMgmt.available.currentPlan')}
                              </Button>
                            )}

                            {!selectedPrice && (
                              <Button
                                variant="outline"
                                disabled
                                className="w-full"
                                size="lg"
                              >
                                {t('subscriptionMgmt.available.notAvailable', { interval: isYearly ? t('subscriptionMgmt.available.yearly') : t('subscriptionMgmt.available.monthly') })}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription Section - Bottom of Page */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-destructive">
              {t('subscriptionMgmt.current.cancelButton', { default: 'Cancel subscription' })}
            </CardTitle>
            <CardDescription>
              {t('subscriptionMgmt.actions.description', { default: 'Manage your subscription settings.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.cancel_at_period_end && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('subscriptionMgmt.current.cancelledAtPeriodEnd')}
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
                      {t('subscriptionMgmt.current.cancelButton', { default: 'Cancel subscription' })}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('subscriptionMgmt.current.cancelConfirm')}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleCancelClick}
                    disabled={isActionLoading}
                    className="w-full sm:w-auto"
                  >
                    {t('subscriptionMgmt.current.cancelButton', { default: 'Cancel subscription' })}
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription Alert Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('subscriptionMgmt.current.cancelButton')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('subscriptionMgmt.current.cancelConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              {t('common.actions.cancel', { default: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAtPeriodEnd}
              disabled={isActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isActionLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.actions.processing', { default: 'Processing...' })}
                </>
              ) : (
                t('subscriptionMgmt.current.cancelButton')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
