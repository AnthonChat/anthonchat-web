import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/db/server";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

export const getStripeCustomerByEmail = async (email: string) => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });
  return customers.data[0] || null;
};

export const createStripeCustomer = async (email: string, name?: string) => {
  return await stripe.customers.create({
    email,
    name,
  });
};

/**
 * Waits for a Stripe customer to be synced to the local database via webhooks
 * @param customerId - The Stripe customer ID to wait for
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 10 seconds)
 * @param intervalMs - Check interval in milliseconds (default: 500ms)
 * @returns Promise<boolean> - true if customer is found, false if timeout
 */
export const waitForCustomerSync = async (
  customerId: string,
  maxWaitMs: number = 10000,
  intervalMs: number = 100
): Promise<boolean> => {
  const supabase = createServiceRoleClient(); // Use service role for stripe schema access
  const startTime = Date.now();

  console.log(
    `[STRIPE_CUSTOMER_SYNC] Starting sync wait for customer: ${customerId}`
  );

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const { data, error } = await supabase
        .schema("stripe")
        .from("customers")
        .select("id, deleted")
        .eq("id", customerId)
        .eq("deleted", false)
        .maybeSingle();

      if (error) {
        console.log(`[STRIPE_CUSTOMER_SYNC] Query error: ${error.message}`);
      } else if (data) {
        console.log(`[STRIPE_CUSTOMER_SYNC] Customer found: ${customerId}`);
        return true;
      } else {
        console.log(
          `[STRIPE_CUSTOMER_SYNC] Customer not found yet: ${customerId}`
        );
      }
    } catch (err) {
      console.error(`[STRIPE_CUSTOMER_SYNC] Unexpected error:`, err);
    }

    // Wait before checking again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.log(
    `[STRIPE_CUSTOMER_SYNC] Timeout reached for customer: ${customerId}`
  );
  return false;
};

/**
 * Links an existing Stripe customer to a user account
 * This is useful for cases where the initial sync during signup failed
 * @param userId - The user ID to link the customer to
 * @param customerId - The Stripe customer ID to link
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const linkCustomerToUser = async (
  userId: string,
  customerId: string
): Promise<boolean> => {
  const { updateUserData } = await import("@/lib/queries/user");

  try {
    // First check if the customer exists in the stripe.customers table
    const supabase = createServiceRoleClient(); // Use service role for stripe schema access
    const { data: customer, error } = await supabase
      .schema("stripe")
      .from("customers")
      .select("id, email, deleted")
      .eq("id", customerId)
      .eq("deleted", false)
      .maybeSingle();

    if (error) {
      console.error(`[LINK_CUSTOMER] Database error: ${error.message}`);
      return false;
    }

    if (!customer) {
      console.error(
        `[LINK_CUSTOMER] Customer ${customerId} not found in local database`
      );
      return false;
    }

    console.log(
      `[LINK_CUSTOMER] Found customer in database: ${customerId} (${customer.email})`
    );

    // Update the user record
    await updateUserData(userId, {
      stripe_customer_id: customerId,
    });

    console.log(
      `[LINK_CUSTOMER] Successfully linked customer ${customerId} to user ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[LINK_CUSTOMER] Failed to link customer to user:", error);
    return false;
  }
};

/**
 * Debug function to check if a customer exists in the local database
 * @param customerId - The Stripe customer ID to check
 * @returns Promise<object | null> - Customer data if found, null otherwise
 */
export const debugCheckCustomerExists = async (customerId: string) => {
  try {
    const supabase = createServiceRoleClient(); // Use service role for stripe schema access
    const { data, error } = await supabase
      .schema("stripe")
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      console.error(`[DEBUG_CUSTOMER] Database error: ${error.message}`);
      return null;
    }

    console.log(
      `[DEBUG_CUSTOMER] Customer ${customerId}:`,
      data ? "FOUND" : "NOT FOUND"
    );
    if (data) {
      console.log(`[DEBUG_CUSTOMER] Customer details:`, {
        id: data.id,
        email: data.email,
        deleted: data.deleted,
        created: data.created,
        updated_at: data.updated_at,
      });
    }

    return data;
  } catch (error) {
    console.error("[DEBUG_CUSTOMER] Unexpected error:", error);
    return null;
  }
};

export const createCheckoutSession = async ({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
  trialPeriodDays,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  trialPeriodDays?: number;
}) => {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  };

  // For free trials, we don't require payment method collection upfront
  if (trialPeriodDays && trialPeriodDays > 0) {
    sessionConfig.payment_method_collection = "if_required";
    sessionConfig.subscription_data!.trial_period_days = trialPeriodDays;
  } else {
    sessionConfig.payment_method_types = ["card"];
  }

  // Apply a one-time €10 discount on first paid purchase for a specific price
  // - Controlled via env var FIRST_PURCHASE_DISCOUNT_PRICE_ID (falls back to explicit id)
  // - Coupon id can be provided via FIRST_PURCHASE_10_EUR_COUPON_ID; otherwise we try to find/create one
  try {
    const targetPriceId =
      process.env.FIRST_PURCHASE_DISCOUNT_PRICE_ID

    if (priceId === targetPriceId) {
      // Verify price currency is EUR to safely apply an amount_off EUR coupon
      let isEur = false;
      try {
        const supabase = createServiceRoleClient();
        const { data: priceRow } = await supabase
          .schema("stripe")
          .from("prices")
          .select("currency")
          .eq("id", priceId)
          .maybeSingle();
        isEur = (priceRow?.currency || "").toLowerCase() === "eur";
      } catch {
        // If we fail to resolve currency, be conservative and skip discount to avoid Stripe errors
        isEur = false;
      }

      if (!isEur) {
        console.warn(
          "[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Skipping discount: non-EUR price",
          { priceId }
        );
        return await stripe.checkout.sessions.create(sessionConfig);
      }
      // Determine prior payment and prior redemption of this coupon
      const supabase = createServiceRoleClient();
      const { data: paidInvoices, error: invErr } = await supabase
        .schema("stripe")
        .from("invoices")
        .select("id, status, paid, created")
        .eq("customer", customerId)
        .or("paid.eq.true,status.eq.paid")
        .order("created", { ascending: false })
        .limit(1);

      const hasPaidBefore = !!invErr
        ? false
        : Array.isArray(paidInvoices) && paidInvoices.length > 0;

      const couponId = await getOrCreateFirstPurchaseCouponEUR10();
      const hasRedeemedBefore = await hasCustomerRedeemedCoupon(customerId, couponId);

      if (!hasPaidBefore && !hasRedeemedBefore) {
        // Eligible for first-purchase discount (ensure enforced per-customer)
        const discounts: Stripe.Checkout.SessionCreateParams["discounts"] = [
          {
            coupon: couponId,
          },
        ];
        sessionConfig.discounts = discounts;
      }
    }
  } catch (err) {
    console.error("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Skipping discount due to error", {
      error: err instanceof Error ? err.message : String(err),
      customerId,
      priceId,
    });
    // Continue without discount
  }

  return await stripe.checkout.sessions.create(sessionConfig);
};

export const createSubscriptionWithTrial = async ({
  customerId,
  priceId,
  userId,
  trialPeriodDays,
  idempotencyKey,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  trialPeriodDays?: number;
  idempotencyKey?: string;
}) => {
  try {
    const params: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
    };

    if (trialPeriodDays && trialPeriodDays > 0) {
      // Stripe expects `trial_period_days` at top-level for subscriptions
      // when creating a subscription directly.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - stripe typings sometimes differ across versions
      params.trial_period_days = trialPeriodDays;
    }

    // If no trial is provided, ensure card is collected later via payment settings,
    // but for trial flows we generally don't require a payment method upfront.
    const options = idempotencyKey ? { idempotencyKey } : undefined;
    const subscription = await stripe.subscriptions.create(params, options);
    return subscription;
  } catch (error) {
    console.error("[CREATE_SUBSCRIPTION_WITH_TRIAL] Error creating subscription", {
      error: error instanceof Error ? error.message : error,
      customerId,
      priceId,
      userId,
    });
    throw error;
  }
};
export const createBillingPortalSession = async ({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

/**
 * Returns a coupon id that represents a one-time €10 off discount.
 * Priority:
 * 1) Use env var FIRST_PURCHASE_10_EUR_COUPON_ID if provided
 * 2) Look up an existing coupon with metadata.auto_key === 'first_purchase_eur_10'
 * 3) Create a new coupon (amount_off=1000, currency=eur, duration=once)
 */
async function getOrCreateFirstPurchaseCouponEUR10(): Promise<string> {
  const envCoupon = process.env.FIRST_PURCHASE_10_EUR_COUPON_ID?.trim();
  if (envCoupon) return envCoupon;

  // Try to find existing coupon tagged by our metadata key
  try {
    const existing = await stripe.coupons.list({ limit: 100 });
    const match = existing.data.find((c) => {
      const md = (c.metadata || {}) as Record<string, unknown>;
      return md["auto_key"] === "first_purchase_eur_10" && c.valid !== false;
    });
    if (match) return match.id;
  } catch (e) {
    console.warn("[FIRST_PURCHASE_COUPON] Failed to list coupons:", e);
  }

  // Create a new one if not found
  const created = await stripe.coupons.create({
    amount_off: 1000,
    currency: "eur",
    duration: "once",
    name: "First purchase €10 off",
    metadata: { auto_key: "first_purchase_eur_10" },
  });
  return created.id;
}

/**
 * Checks if the given customer already redeemed the first purchase coupon
 * by inspecting paid invoices for the presence of our coupon ID.
 */
async function hasCustomerRedeemedCoupon(
  customerId: string,
  couponId: string
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .schema("stripe")
      .from("invoices")
      .select("id, status, paid, discount, discounts, total_discount_amounts")
      .eq("customer", customerId)
      .or("paid.eq.true,status.eq.paid")
      .order("created", { ascending: false })
      .limit(50);

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return false;
    }

    const used = data.some((inv: { discount?: unknown; discounts?: unknown }) => {
      const extractCouponId = (obj: unknown): string | null => {
        if (!obj || typeof obj !== "object") return null;
        const o = obj as Record<string, unknown>;

        // coupon may be a string
        if (typeof o.coupon === "string") return o.coupon;

        // coupon may be an object with an id field
        if (o.coupon && typeof o.coupon === "object") {
          const c = o.coupon as Record<string, unknown>;
          if (typeof c.id === "string") return c.id;
        }

        // fallback fields
        if (typeof o.coupon_id === "string") return o.coupon_id;
        if (typeof o.id === "string") return o.id;

        return null;
      };

      // Check explicit coupon references
      try {
        // discount can be object with coupon info
        const d = inv.discount;
        if (d) {
          const dc = typeof d === "string" ? null : d;
          const dcCouponId = extractCouponId(dc);
          if (dcCouponId === couponId) return true;
        }

        // discounts may be array
        const discountsArr = Array.isArray(inv.discounts)
          ? (inv.discounts as unknown[])
          : typeof inv.discounts === "string"
            ? (JSON.parse(inv.discounts as string) as unknown[])
            : [];
        if (Array.isArray(discountsArr)) {
          for (const di of discountsArr) {
            const diCouponId = extractCouponId(di);
            if (diCouponId === couponId) return true;
          }
        }
      } catch {
        // ignore parse errors
      }

      // Fallback: if invoice shows discount amounts but we cannot attribute,
      // treat as not our coupon to avoid false positives
      return false;
    });

    return used;
  } catch {
    return false;
  }
}
