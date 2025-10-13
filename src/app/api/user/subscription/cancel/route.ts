import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/db/server";
import { stripe } from "@/lib/stripe";

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-api-key",
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

async function resolveUserAndCustomer(userId: string) {
  const service = createServiceRoleClient();

  const { data: user, error: userErr } = await service
    .from("users")
    .select("id, email, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !user) {
    return { error: "User not found", status: 404 } as const;
  }

  const customerId = (user.stripe_customer_id as string | null | undefined) || null;

  return {
    service,
    userId: user.id as string,
    customerId,
  } as const;
}

async function fetchLatestSubscriptionForCustomer(
  service: ReturnType<typeof createServiceRoleClient>,
  customerId: string
) {
  const { data, error } = await service
    .schema("stripe")
    .from("subscriptions")
    .select("id, status, cancel_at_period_end")
    .eq("customer", customerId)
    .order("created", { ascending: false })
    .limit(1);

  if (error) {
    return { error: "Failed to query subscriptions", details: error } as const;
  }

  const sub = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { subscription: sub } as const;
}

// POST /api/user/subscription/cancel { userId }
export async function POST(request: NextRequest) {
  try {
    const provided = getProvidedApiKey(request);
    const expected = process.env.N8N_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;

    let bodyUserId: string | undefined;

    // If internal key present and valid, allow server-to-server call
    if (expected && provided && provided === expected) {
      const parsed: { userId?: string } = await request.json();
      bodyUserId = parsed.userId;
    } else {
      // Otherwise, allow an authenticated user via supabase session cookie
      const client = await createClient();
      const { data: claims, error: authError } = await client.auth.getClaims();
      if (authError || !claims) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      bodyUserId = claims.claims.sub;
    }

    if (!bodyUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const resolved = await resolveUserAndCustomer(bodyUserId);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

  const { service, customerId } = resolved;
    if (!customerId) {
      return NextResponse.json({ error: "No stripe customer for user" }, { status: 404 });
    }

    const { subscription, error } = await fetchLatestSubscriptionForCustomer(service, customerId);
    if (error) {
      console.error("[SUBSCRIPTION_CANCEL_LOOKUP_ERROR]", { error });
      return NextResponse.json({ error: "Subscription lookup failed" }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found for customer" }, { status: 404 });
    }

    // If already set to cancel at period end, respond accordingly
    if ((subscription.cancel_at_period_end as boolean) === true) {
      return NextResponse.json({ message: "already_cancelled_at_period_end", subscription }, { status: 200 });
    }

    // Update via Stripe API to set cancel_at_period_end: true
    try {
      const updated = await stripe.subscriptions.update(subscription.id as string, {
        cancel_at_period_end: true,
      });

      // Optionally update local DB is done by webhooks; still return the updated stripe response
      return NextResponse.json({ message: "cancel_scheduled", subscription: updated }, { status: 200 });
    } catch (err) {
      console.error("[STRIPE_SUBSCRIPTION_CANCEL_ERROR]", { error: err });
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  } catch (error) {
    console.error("[SUBSCRIPTION_CANCEL_POST_ERROR]", { error });
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
