"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useUserSubscription } from "@/hooks/use-user-subscription";
import { SubscriptionManagement } from "@/components/features/subscription/SubscriptionManagement";

interface SubscriptionPageClientProps {
  userId: string;
}

export function SubscriptionPageClient({
  userId,
}: SubscriptionPageClientProps) {
  const searchParams = useSearchParams();
  const { subscription, isLoading, refetch } = useUserSubscription({ userId });

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

      // Refetch subscription data after a delay to allow webhook processing
      setTimeout(() => {
        refetch();
      }, 3000); // Increased delay and removed the second refetch to reduce flashing
    }

    if (canceled === "true") {
      toast.info("Payment was canceled. You can try again anytime.");
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, refetch]);

  return (
    <SubscriptionManagement
      subscription={subscription}
      isLoading={isLoading}
      onRefresh={refetch}
    />
  );
}
