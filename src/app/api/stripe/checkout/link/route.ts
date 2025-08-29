import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/db/server";
import {
  createCheckoutSession,
  getStripeCustomerByEmail,
  createStripeCustomer,
} from "@/lib/stripe";
import { getTierBySlug } from "@/lib/queries/tiers";

/**
 * Server-to-server endpoint (for n8n) to generate a Stripe Checkout link
 * for a given userId. Optionally accepts priceId or tierSlug to pick a price.
 *
 * Security:
 * - Requires header: x-internal-api-key: <N8N_INTERNAL_API_KEY> OR Authorization: Bearer <N8N_INTERNAL_API_KEY>
 *
 * Request (POST JSON):
 * {
 *   "userId": "uuid",                       // required
 *   "priceId": "price_...",                 // optional
 *   "tierSlug": "basic",                    // optional (used if priceId not provided)
 *   "trial_period_days": 0,                 // optional; ignored if user already had a trial or force_no_trial = true
 *   "force_no_trial": true                  // optional; forces no trial in the generated session
 * }
 *
 * Response:
 * {
 *   "sessionId": "cs_test_...",
 *   "url": "https://checkout.stripe.com/..."
 * }
 */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, x-internal-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function getProvidedApiKey(req: NextRequest) {
  const headerKey = req.headers.get("x-internal-api-key")?.trim();
  const authHeader = req.headers.get("authorization");
  const bearerKey = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
  return headerKey || bearerKey;
}

export async function POST(request: NextRequest) {
  try {
    // 1) AuthZ: Server-to-server key
    const provided = getProvidedApiKey(request);
    const expected = process.env.N8N_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Parse body
    const {
      userId,
      priceId: bodyPriceId,
      tierSlug,
      trial_period_days,
      force_no_trial,
    }: {
      userId?: string;
      priceId?: string;
      tierSlug?: string;
      trial_period_days?: number;
      force_no_trial?: boolean;
    } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // 3) Resolve user and/or Stripe customer
    const service = createServiceRoleClient();
    const { data: userRow, error: userErr } = await service
      .from("users")
      .select("id, email, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (userErr || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = userRow.stripe_customer_id as string | null;
    const email = (userRow.email as string | null) || null;

    if (!customerId) {
      // Try lookup by email in Stripe
      if (!email) {
        return NextResponse.json(
          { error: "User does not have an email; cannot resolve Stripe customer." },
          { status: 400 },
        );
      }
      const existing = await getStripeCustomerByEmail(email);
      if (existing) {
        customerId = existing.id;
      } else {
        // Create a new Stripe customer for this email
        const created = await createStripeCustomer(email);
        customerId = created.id;
      }

      // Persist on user for future calls
      await service
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // 4) Determine priceId
    let priceId = bodyPriceId?.trim();
    if (!priceId && tierSlug) {
      const tier = await getTierBySlug(tierSlug);
      if (tier && tier.prices?.length) {
        // Prefer monthly recurring price if available
        const monthly = tier.prices.find((p) => {
          const recur = p.recurring as { interval?: string } | null;
          return recur?.interval === "month";
        });
        priceId = (monthly || tier.prices[0]).id;
      }
    }
    if (!priceId) {
      // Fallback: environment default price for "Basic" or default checkout
      priceId = process.env.STRIPE_DEFAULT_PRICE_ID || "";
    }
    if (!priceId) {
      return NextResponse.json(
        { error: "priceId could not be resolved (provide priceId, tierSlug, or set STRIPE_DEFAULT_PRICE_ID)" },
        { status: 400 },
      );
    }

    // 5) Enforce "trial once" rule
    let effectiveTrialDays: number | undefined = undefined;

    if (!force_no_trial && typeof trial_period_days === "number" && trial_period_days > 0) {
      // Check prior trials for this customer
      const { data: priorTrials, error: trialsErr } = await service
        .schema("stripe")
        .from("subscriptions")
        .select("id, trial_start, trial_end")
        .eq("customer", customerId)
        .not("trial_start", "is", null)
        .limit(1);

      const hasHadTrial =
        !!trialsErr ? false : Array.isArray(priorTrials) && priorTrials.length > 0;

      effectiveTrialDays = hasHadTrial ? undefined : trial_period_days;
    }

    // 6) Create Stripe checkout session
    const origin = request.nextUrl.origin;
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${origin}/dashboard/subscription?success=true`,
      cancelUrl: `${origin}/dashboard/subscription?canceled=true`,
      userId,
      trialPeriodDays: effectiveTrialDays,
    });

    // 7) Return checkout URL
    return new NextResponse(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("[GENERATE_CHECKOUT_LINK_ERROR]", { error });
    return new NextResponse(
      JSON.stringify({ error: "Failed to generate checkout link" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}