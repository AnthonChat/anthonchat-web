import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/db/server";

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, x-internal-api-key",
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

type NormalizedStatus =
  | "trialing"
  | "trial_expired"
  | "subscribed"
  | "unsubscribed"
  | "canceled"
  | "past_due";

interface StripeSubscription {
  id: string;
  status: string;
  cancel_at_period_end: boolean | null;
  current_period_start: number | null;
  current_period_end: number | null;
  trial_end: number | null;
  created: number;
}

function normalizeStatus(
  stripeStatus: string | null | undefined,
  subscription: StripeSubscription | null
): NormalizedStatus {
  // If there's no subscription at all, it's unsubscribed
  if (!subscription) {
    return "unsubscribed";
  }

  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      // Still considered subscribed; caller can inspect cancel_at_period_end
      return "subscribed";
    case "past_due": {
      // If no paid billing period has started, treat as trial_expired (trial ended without successful first payment)
      const startedPaid =
        !!subscription.current_period_start &&
        Number(subscription.current_period_start) > 0;

      if (!startedPaid) {
        return "trial_expired";
      }
      return "past_due";
    }
    case "canceled":
      return "canceled";
    // Stripe possible extra states
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    default:
      return "unsubscribed";
  }
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

  const customerId =
    (user.stripe_customer_id as string | null | undefined) || null;

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
    .select(
      "id, status, cancel_at_period_end, current_period_start, current_period_end, trial_end, created"
    )
    .eq("customer", customerId)
    .order("created", { ascending: false })
    .limit(1);

  if (error) {
    return { error: "Failed to query subscriptions", details: error } as const;
  }

  const sub = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { subscription: sub } as const;
}

async function buildStatusPayload(userId: string) {
  const resolved = await resolveUserAndCustomer(userId);
  if ("error" in resolved) {
    return {
      statusCode: resolved.status,
      body: { error: resolved.error },
    };
  }

  const { service, customerId } = resolved;

  // No Stripe customer means no subscriptions at all
  if (!customerId) {
    return {
      statusCode: 200,
      body: {
        userId,
        normalized_status: "unsubscribed" satisfies NormalizedStatus,
        has_active_subscription: false,
        stripe_status: null,
        cancel_at_period_end: false,
        current_period_start: null,
        current_period_end: null,
        trial_end: null,
      },
    };
  }

  const { subscription, error } = await fetchLatestSubscriptionForCustomer(
    service,
    customerId
  );

  if (error) {
    return {
      statusCode: 500,
      body: { error: "Subscription lookup failed" },
    };
  }

  if (!subscription) {
    return {
      statusCode: 200,
      body: {
        userId,
        normalized_status: "unsubscribed" satisfies NormalizedStatus,
        has_active_subscription: false,
        stripe_status: null,
        cancel_at_period_end: false,
        current_period_start: null,
        current_period_end: null,
        trial_end: null,
      },
    };
  }

  const stripeStatus = (subscription.status as string | null) ?? null;
  const cancelAtPeriodEnd =
    (subscription.cancel_at_period_end as boolean | null) ?? null;

  const normalized = normalizeStatus(stripeStatus, subscription as StripeSubscription | null);

  // active, trialing, or trial_expired are considered based on their actual state
  const hasActive =
    normalized === "subscribed" || normalized === "trialing" ? true : false;

  return {
    statusCode: 200,
    body: {
      userId,
      normalized_status: normalized,
      has_active_subscription: hasActive,
      stripe_status: stripeStatus,
      cancel_at_period_end: !!cancelAtPeriodEnd,
      current_period_start:
        (subscription.current_period_start as number | null) ?? null,
      current_period_end:
        (subscription.current_period_end as number | null) ?? null,
      trial_end: (subscription.trial_end as number | null) ?? null,
    },
  };
}

// GET /api/user/subscription/status?userId=...
export async function GET(request: NextRequest) {
  try {
    // Server-to-server auth
    const provided = getProvidedApiKey(request);
    const expected =
      process.env.N8N_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const result = await buildStatusPayload(userId);
    return new NextResponse(JSON.stringify(result.body), {
      status: result.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_STATUS_GET_ERROR]", { error });
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}

// POST /api/user/subscription/status  { "userId": "..." }
export async function POST(request: NextRequest) {
  try {
    // Server-to-server auth
    const provided = getProvidedApiKey(request);
    const expected =
      process.env.N8N_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId }: { userId?: string } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const result = await buildStatusPayload(userId);
    return new NextResponse(JSON.stringify(result.body), {
      status: result.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_STATUS_POST_ERROR]", { error });
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}