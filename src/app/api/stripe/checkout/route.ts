import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/db/server";
import { createCheckoutSession, getStripeCustomerByEmail } from "@/lib/stripe";
import { getTierByPriceId } from "@/lib/queries/tiers";

export async function OPTIONS() {
  // CORS preflight for checkout POST
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user claims
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = claims.claims.sub;
    const userEmail = claims.claims.email;

    const { priceId, trial_period_days } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Validate the price ID exists in our tiers
    const tier = await getTierByPriceId(priceId);
    if (!tier) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("email, stripe_customer_id")
      .eq("id", userId)
      .single();

    const email = userProfile?.email || userEmail;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = userProfile?.stripe_customer_id;

    if (!customerId) {
      // Check if customer exists in Stripe
      const existingCustomer = await getStripeCustomerByEmail(email);

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        return NextResponse.json(
          { error: "Customer does not exist" },
          { status: 400 }
        );
      }
    }

    // Enforce "trial only once" on the server-side before creating a checkout session
    const service = createServiceRoleClient();
    const { data: priorTrials } = await service
      .schema("stripe")
      .from("subscriptions")
      .select("id, trial_start, trial_end")
      .eq("customer", customerId)
      .not("trial_start", "is", null)
      .limit(1);

    const hasHadTrial = Array.isArray(priorTrials) && priorTrials.length > 0;
    const requestedTrialDays =
      typeof trial_period_days === "number"
        ? Number(trial_period_days)
        : undefined;
    const effectiveTrialDays = hasHadTrial ? undefined : requestedTrialDays;

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${request.nextUrl.origin}/dashboard/subscription?success=true`,
      cancelUrl: `${request.nextUrl.origin}/dashboard/subscription?canceled=true`,
      userId: userId,
      trialPeriodDays: effectiveTrialDays,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("STRIPE_CHECKOUT_ERROR", { error });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
