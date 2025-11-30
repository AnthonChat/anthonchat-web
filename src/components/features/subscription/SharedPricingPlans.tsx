"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocaleLink } from "@/components/ui/locale-link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

import { getAvailablePlans, SubscriptionPlan } from "@/lib/queries/plans";
import { UserSubscription } from "@/lib/queries/subscription";

interface SharedPricingPlansProps {
  /**
   * Whether the user is authenticated
   */
  isAuthenticated?: boolean;
  /**
   * User's current subscription (null if not subscribed or not authenticated)
   */
  subscription?: UserSubscription | null;
  /**
   * User ID (required for authenticated users)
   */
  userId?: string;
  /**
   * Callback when checkout completes successfully
   */
  onCheckoutSuccess?: () => void;
}

export function SharedPricingPlans({
  isAuthenticated = false,
  subscription = null,
  onCheckoutSuccess,
}: SharedPricingPlansProps) {
  const t = useTranslations("marketing.cost");
  const [isYearly, setIsYearly] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(
    null
  );

  // Fetch plans from Stripe
  useEffect(() => {
    async function fetchPlans() {
      setPlansLoading(true);
      try {
        const plans = await getAvailablePlans();
        setAvailablePlans(plans);
      } catch (error) {
        console.error("Failed to fetch plans", { error });
        toast.error("Could not load subscription plans.");
      } finally {
        setPlansLoading(false);
      }
    }

    fetchPlans();
  }, []);

  // Trial configuration based on product metadata
  const isPlanEligibleForTrial = useCallback((plan: SubscriptionPlan) => {
    const freeTrialDays = plan.metadata?.free_trial;
    return (
      freeTrialDays &&
      !isNaN(Number(freeTrialDays)) &&
      Number(freeTrialDays) > 0
    );
  }, []);

  const getTrialDaysForPlan = useCallback(
    (plan: SubscriptionPlan) => {
      if (!isPlanEligibleForTrial(plan)) return 0;
      const freeTrialDays = plan.metadata?.free_trial;
      return Number(freeTrialDays) || 0;
    },
    [isPlanEligibleForTrial]
  );

  // Handle Stripe checkout for authenticated users
  const handleUpgrade = async (planSlug?: string) => {
    if (!planSlug) return;

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

    setIsCheckoutLoading(planSlug);

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
        onCheckoutSuccess?.();
      }
    } catch (error) {
      console.error("CHECKOUT_ERROR", { error, planSlug });
      toast.error("Failed to start checkout process");
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  // Check if a plan is the current plan
  const isCurrentPlan = useCallback(
    (plan: SubscriptionPlan) => {
      if (!subscription) return false;
      const productMetadata = subscription.product?.metadata as Record<
        string,
        unknown
      > | null;
      const productSlug = productMetadata?.slug as string | undefined;
      return productSlug === plan.metadata?.slug;
    },
    [subscription]
  );

  // Sort and prepare plans
  const sortedPlans = [...availablePlans].sort((a, b) => {
    const selectedInterval = isYearly ? "year" : "month";
    const priceA =
      a.prices.find((p) => p.recurring?.interval === selectedInterval)
        ?.unit_amount || 0;
    const priceB =
      b.prices.find((p) => p.recurring?.interval === selectedInterval)
        ?.unit_amount || 0;

    // Handle free plans (price = 0) - put them first
    if (priceA === 0 && priceB === 0) return 0;
    if (priceA === 0) return -1;
    if (priceB === 0) return 1;

    // Sort by price ascending (lowest to highest)
    return priceA - priceB;
  });

  // Calculate savings for yearly billing
  const calculateSavings = (plan: SubscriptionPlan) => {
    const monthlyPrice = plan.prices.find(
      (p) => p.recurring?.interval === "month"
    );
    const yearlyPrice = plan.prices.find(
      (p) => p.recurring?.interval === "year"
    );

    const monthlyCost = monthlyPrice?.unit_amount
      ? monthlyPrice.unit_amount / 100
      : 0;
    const yearlyCost = yearlyPrice?.unit_amount
      ? yearlyPrice.unit_amount / 100
      : 0;
    const yearlyMonthlyCost = yearlyCost / 12;

    if (monthlyCost > 0 && yearlyMonthlyCost > 0) {
      return ((monthlyCost - yearlyMonthlyCost) / monthlyCost) * 100;
    }
    return 0;
  };

  // Coming Soon placeholder plans (from translations)
  const comingSoonPlans = [
    {
      key: "pro",
      name: t("plans.pro.name"),
      description: t("plans.pro.description"),
      features: [
        t("plans.pro.features.1"),
        t("plans.pro.features.2"),
        t("plans.pro.features.3"),
        t("plans.pro.features.4"),
        t("plans.pro.features.5"),
      ],
      badge: t("plans.pro.badge"),
      cta: t("plans.pro.cta"),
    },
    {
      key: "team",
      name: t("plans.team.name"),
      description: t("plans.team.description"),
      features: [
        t("plans.team.features.1"),
        t("plans.team.features.2"),
        t("plans.team.features.3"),
        t("plans.team.features.4"),
        t("plans.team.features.5"),
      ],
      badge: t("plans.team.badge"),
      cta: t("plans.team.cta"),
    },
  ];

  // Calculate how many placeholder plans we need
  const placeholderPlansNeeded = Math.max(0, 3 - sortedPlans.length);
  const placeholdersToShow = comingSoonPlans.slice(0, placeholderPlansNeeded);

  // Render loading state
  if (plansLoading) {
    return (
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4"
            >
              {t("title")}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground mb-8"
            >
              {t("subtitle")}
            </motion.p>
          </div>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4"
          >
            {t("title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground mb-8"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center space-x-4 mb-8"
          >
            <Label
              htmlFor="billing-mode"
              className={`text-sm font-medium cursor-pointer ${
                !isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("toggle.monthly")}
            </Label>
            <Switch
              id="billing-mode"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label
              htmlFor="billing-mode"
              className={`text-sm font-medium cursor-pointer ${
                isYearly ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("toggle.yearly")}
              <span className="ml-2 inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {t("toggle.save")}
              </span>
            </Label>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {sortedPlans.map((plan, index) => {
            const selectedInterval = isYearly ? "year" : "month";
            const selectedPrice = plan.prices.find(
              (p) => p.recurring?.interval === selectedInterval
            );
            const monthlyPrice = plan.prices.find(
              (p) => p.recurring?.interval === "month"
            );

            const isPopular = plan.metadata?.popular === "true";
            const planIsCurrentPlan = isCurrentPlan(plan);
            const savings = calculateSavings(plan);
            const trialDays = getTrialDaysForPlan(plan);
            const planSlug = plan.metadata?.slug;

            // Determine if this plan is available for purchase
            const hasValidPrice = !!selectedPrice?.unit_amount;
            const isActive = hasValidPrice;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${
                    isPopular
                      ? "border-primary shadow-lg scale-105 z-10"
                      : "border-border"
                  } ${!isActive ? "opacity-80" : ""} ${
                    planIsCurrentPlan ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {planIsCurrentPlan && (
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                      {hasValidPrice ? (
                        <>
                          €
                          {((selectedPrice?.unit_amount || 0) / 100).toFixed(2)}
                          <span className="ml-1 text-xl font-medium text-muted-foreground tracking-normal">
                            /{selectedInterval === "year" ? "year" : "month"}
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    {isYearly && hasValidPrice && monthlyPrice?.unit_amount && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          €
                          {(
                            (selectedPrice?.unit_amount || 0) /
                            100 /
                            12
                          ).toFixed(2)}
                          /month billed yearly
                        </p>
                        {savings > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 border-green-200 text-xs"
                          >
                            Save {savings.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    )}
                    {trialDays > 0 && !subscription && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {trialDays} day free trial
                      </Badge>
                    )}
                    <CardDescription className="mt-4 text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-4">
                      {/* Dynamically generate features based on plan name */}
                      {(() => {
                        const planName = plan.name?.toLowerCase() || "";
                        let features: string[] = [];

                        if (planName.includes("basic")) {
                          features = [
                            "Access to Anthon AI Coach",
                            "Available on WhatsApp & Telegram",
                            "Basic Performance Analytics",
                            "Community Support",
                          ];
                        } else if (planName.includes("pro")) {
                          features = [
                            "Everything in Basic",
                            "Priority AI Response",
                            "Advanced Analytics & Trends",
                            "Voice Notes Support",
                            "Pre-Match Visualization Audio",
                          ];
                        } else if (planName.includes("team")) {
                          features = [
                            "Everything in Pro",
                            "Coach Dashboard",
                            "Team Performance Reports",
                            "Custom Protocols",
                            "Dedicated Account Manager",
                          ];
                        } else {
                          // Fallback: use description or generic features
                          const descFeatures = plan.description?.split(", ");
                          if (descFeatures && descFeatures.length > 1) {
                            features = descFeatures;
                          } else {
                            features = [
                              "Full access to Anthon AI",
                              "Premium support",
                              "Advanced capabilities",
                            ];
                          }
                        }

                        return features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                            <span className="text-muted-foreground text-sm">
                              {feature}
                            </span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {isAuthenticated ? (
                      // Authenticated user - show checkout or current plan button
                      planIsCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          <Crown className="h-4 w-4 mr-2" />
                          Current Plan
                        </Button>
                      ) : hasValidPrice ? (
                        <Button
                          className="w-full"
                          onClick={() => handleUpgrade(planSlug)}
                          disabled={isCheckoutLoading === planSlug}
                        >
                          {isCheckoutLoading === planSlug ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : trialDays > 0 && !subscription ? (
                            `Start ${trialDays}-Day Free Trial`
                          ) : (
                            "Upgrade Now"
                          )}
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      )
                    ) : (
                      // Guest user - redirect to signup
                      <Button
                        className="w-full"
                        variant={isActive ? "default" : "outline"}
                        disabled={!isActive}
                        asChild={isActive}
                      >
                        {isActive ? (
                          <LocaleLink href="/signup?redirectTo=/dashboard/subscription">
                            {trialDays > 0
                              ? `Start ${trialDays}-Day Free Trial`
                              : "Start Now"}
                          </LocaleLink>
                        ) : (
                          <span>Coming Soon</span>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
          {/* Coming Soon placeholder plans */}
          {placeholdersToShow.map((placeholder, index) => (
            <motion.div
              key={placeholder.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (sortedPlans.length + index) * 0.1 + 0.3 }}
            >
              <Card className="relative h-full flex flex-col border-border opacity-80">
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">{placeholder.badge}</Badge>
                </div>

                <CardHeader>
                  <CardTitle className="text-2xl">{placeholder.name}</CardTitle>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                    <span className="text-3xl text-muted-foreground">
                      {placeholder.badge}
                    </span>
                  </div>
                  <CardDescription className="mt-4 text-base">
                    {placeholder.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-4">
                    {placeholder.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                        <span className="text-muted-foreground text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    {placeholder.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
