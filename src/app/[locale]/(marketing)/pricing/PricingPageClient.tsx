"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Header, Footer, FAQ } from "@/components/features/marketing";
import { SharedPricingPlans } from "@/components/features/subscription/SharedPricingPlans";
import { UserSubscription } from "@/lib/queries/subscription";

interface PricingPageClientProps {
  isAuthenticated: boolean;
  subscription: UserSubscription | null;
  userId?: string;
}

export function PricingPageClient({
  isAuthenticated,
  subscription,
  userId,
}: PricingPageClientProps) {
  const searchParams = useSearchParams();

  // Handle Stripe redirect params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success(
        "Payment successful! Your subscription has been activated."
      );

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());
    }

    if (canceled === "true") {
      toast.info("Payment was canceled. You can try again anytime.");
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main className="pt-20">
        <SharedPricingPlans
          isAuthenticated={isAuthenticated}
          subscription={subscription}
          userId={userId}
        />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
