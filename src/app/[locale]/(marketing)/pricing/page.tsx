import { createClient } from "@/lib/db/server";
import { getUserSubscription } from "@/lib/queries/subscription";
import { PricingPageClient } from "./PricingPageClient";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  let subscription = null;
  let isAuthenticated = false;
  let userId: string | undefined = undefined;

  if (claims?.claims?.sub) {
    isAuthenticated = true;
    userId = claims.claims.sub;
    // Fetch subscription data for authenticated users
    subscription = await getUserSubscription(userId);
  }

  return (
    <PricingPageClient
      isAuthenticated={isAuthenticated}
      subscription={subscription}
      userId={userId}
    />
  );
}
