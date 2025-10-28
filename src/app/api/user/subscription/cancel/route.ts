import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/db/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

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
    userEmail: user.email as string | null,
  } as const;
}

async function findValidStripeCustomer(userEmail: string): Promise<string | null> {
  try {
    console.log("[FINDING_CUSTOMER_BY_EMAIL]", { userEmail });

    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10,
    });

    console.log("[CUSTOMERS_FOUND_BY_EMAIL]", {
      count: customers.data.length,
      customers: customers.data.map(c => ({ id: c.id, email: c.email, deleted: c.deleted }))
    });

    // Find active customer (not deleted)
    const activeCustomer = customers.data.find(cust => !cust.deleted);

    console.log("[ACTIVE_CUSTOMER_SELECTED]", {
      customerId: activeCustomer?.id,
      email: activeCustomer?.email
    });

    return activeCustomer?.id || null;
  } catch (error) {
    console.error("[FIND_STRIPE_CUSTOMER_ERROR]", {
      error: error instanceof Error ? error.message : String(error),
      userEmail,
      stripeMode: process.env.STRIPE_SECRET_KEY?.includes('sk_test') ? 'test' : 'live'
    });
    return null;
  }
}


async function syncSubscriptionRecord(
  service: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  try {
    const payload = {
      id: subscription.id,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at,
      canceled_at: subscription.canceled_at,
      // @ts-expect-error - These properties exist on the subscription object
      current_period_start: subscription.current_period_start ?? null,
      // @ts-expect-error - These properties exist on the subscription object
      current_period_end: subscription.current_period_end ?? null,
      ended_at: subscription.ended_at,
      billing_cycle_anchor: subscription.billing_cycle_anchor,
      created: subscription.created ?? null,
      trial_start: subscription.trial_start,
      trial_end: subscription.trial_end,
      metadata: subscription.metadata as Record<string, unknown>,
      items: subscription.items as unknown as Record<string, unknown>,
      object: subscription.object,
      updated_at: new Date().toISOString(),
    };

    await service
      .schema("stripe")
      .from("subscriptions")
      .upsert(payload, { onConflict: "id" });
  } catch (error) {
    console.warn("[SUBSCRIPTION_CANCEL_SYNC_ERROR]", {
      subscriptionId: subscription.id,
      error,
    });
  }
}


async function ensureStripeCustomer({
  service,
  currentCustomerId,
  userId,
  userEmail,
}: {
  service: ReturnType<typeof createServiceRoleClient>;
  currentCustomerId: string | null;
  userId: string;
  userEmail: string | null;
}): Promise<string | null> {
  // Always find the most recent valid customer by email
  // This ensures we always use the correct customer ID
  if (!userEmail) {
    return currentCustomerId; // Fall back to stored ID if no email
  }

  const validCustomerId = await findValidStripeCustomer(userEmail);
  if (!validCustomerId) {
    console.warn("[NO_VALID_CUSTOMER_FOUND]", { userId, userEmail });
    return currentCustomerId; // Fall back to stored ID
  }

  // Update database with correct customer ID if different
  if (validCustomerId !== currentCustomerId) {
    await service
      .from("users")
      .update({ stripe_customer_id: validCustomerId })
      .eq("id", userId);

    console.info("[STRIPE_CUSTOMER_UPDATED]", {
      userId,
      oldCustomerId: currentCustomerId,
      newCustomerId: validCustomerId,
      userEmail,
    });
  }

  return validCustomerId;
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

  const {
      service,
      customerId: existingCustomerId,
      userEmail,
      userId: resolvedUserId,
    } = resolved;

    const customerId = await ensureStripeCustomer({
      service,
      currentCustomerId: existingCustomerId,
      userId: resolvedUserId,
      userEmail,
    });

    console.log("[CUSTOMER_RESOLUTION]", {
      userId: resolvedUserId,
      originalCustomerId: existingCustomerId,
      resolvedCustomerId: customerId,
      userEmail,
    });

    if (!customerId) {
      return NextResponse.json({ error: "No stripe customer for user" }, { status: 404 });
    }

    // Find the user's active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    const activeSubscription = subscriptions.data.find(sub =>
      ["active", "trialing", "past_due"].includes(sub.status)
    );

    if (!activeSubscription) {
      console.warn("[SUBSCRIPTION_CANCEL_NO_ACTIVE_SUBSCRIPTION]", { customerId });
      return NextResponse.json(
        { message: "no_active_subscription", subscription: null },
        { status: 200 }
      );
    }

    // Check if already scheduled for cancellation
    if (activeSubscription.cancel_at_period_end) {
      console.log("[SUBSCRIPTION_CANCEL_ALREADY_SCHEDULED]", {
        subscriptionId: activeSubscription.id,
        customerId,
      });
      return NextResponse.json(
        { message: "already_cancelled_at_period_end", subscription: activeSubscription },
        { status: 200 }
      );
    }

    // Schedule cancellation at period end
    try {
      console.log("[SUBSCRIPTION_CANCEL_START]", {
        subscriptionId: activeSubscription.id,
        customerId,
        status: activeSubscription.status,
      });

      const updated = await stripe.subscriptions.update(activeSubscription.id, {
        cancel_at_period_end: true,
      });

      console.log("[SUBSCRIPTION_CANCEL_SCHEDULED]", {
        subscriptionId: updated.id,
        cancel_at_period_end: updated.cancel_at_period_end,
      });

      // Sync the updated subscription to database
      await syncSubscriptionRecord(service, updated);

      return NextResponse.json(
        { message: "cancel_scheduled", subscription: updated },
        { status: 200 }
      );
    } catch (error) {
      console.error("[SUBSCRIPTION_CANCEL_ERROR]", {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId: activeSubscription.id,
        customerId,
      });
      return NextResponse.json(
        { error: "Failed to schedule cancellation" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[SUBSCRIPTION_CANCEL_POST_ERROR]", { error });
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
