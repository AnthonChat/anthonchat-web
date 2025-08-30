import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/db/server";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

export const getStripeCustomerByEmail = async (email: string): Promise<Stripe.Customer | null> => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });
  return customers.data[0] || null;
};

export const createStripeCustomer = async (email: string, name?: string): Promise<Stripe.Customer> => {
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
export const debugCheckCustomerExists = async (customerId: string): Promise<Record<string, unknown> | null> => {
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
}): Promise<Stripe.Checkout.Session> => {
  try {
    console.log("[CHECKOUT_INIT] createCheckoutSession input", {
      customerId,
      priceId,
      userId,
      trialPeriodDays,
    });
  } catch {
    // logging failure is non-critical; ignore to avoid blocking checkout flow.
  }

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
    // Typings for stripe's subscription_data may not include trial_period_days in some versions.
    // Set the runtime property via a safe unknown cast to avoid `any`.
    (sessionConfig.subscription_data as unknown as Record<string, unknown>).trial_period_days = trialPeriodDays;
  } else {
    sessionConfig.payment_method_types = ["card"];
  }

  // Apply a one-time €10 discount on first paid purchase for a specific price
  // - Controlled via env var FIRST_PURCHASE_DISCOUNT_PRICE_ID (falls back to explicit id)
  // - Coupon id can be provided via FIRST_PURCHASE_10_EUR_COUPON_ID; otherwise we try to find/create one
  try {
    const targetPriceId = process.env.FIRST_PURCHASE_DISCOUNT_PRICE_ID?.trim();

    if (!targetPriceId) {
      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] No target price configured");
    }

    if (priceId === targetPriceId) {
      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Target match", {
        priceId,
        targetPriceId,
      });
      // Verify price currency is EUR to safely apply an amount_off EUR coupon.
      // Prefer live Stripe lookup; fall back to DB if needed.
      let isEur = false;
      let currencySource: "stripe_api" | "db" | "unknown" = "unknown";
      try {
        const priceObj = await stripe.prices.retrieve(priceId);
        isEur = (priceObj?.currency || "").toLowerCase() === "eur";
        currencySource = "stripe_api";
        console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Currency from Stripe API", {
          priceId,
          currency: priceObj?.currency,
        });
      } catch (apiErr) {
        // log the api error so the variable is used and we can debug failures
        console.warn("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Failed to retrieve price from Stripe API", {
          priceId,
          error: apiErr instanceof Error ? apiErr.message : String(apiErr),
        });
        try {
          const supabase = createServiceRoleClient();
          const { data: priceRow } = await supabase
            .schema("stripe")
            .from("prices")
            .select("currency")
            .eq("id", priceId)
            .maybeSingle();
          isEur = (priceRow?.currency || "").toLowerCase() === "eur";
          currencySource = "db";
          console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Currency from DB fallback", {
            priceId,
            currency: priceRow?.currency,
          });
        } catch {
          // If we fail to resolve currency, be conservative and skip discount to avoid Stripe errors
          isEur = false;
          currencySource = "unknown";
        }
      }

      if (!isEur) {
        console.warn(
          "[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Skipping discount: non-EUR price",
          { priceId, currencySource }
        );
        return await stripe.checkout.sessions.create(sessionConfig);
      }
      // Determine prior payment and prior redemption of this coupon
      const supabase = createServiceRoleClient();
      const { data: paidInvoices, error: invErr } = await supabase
        .schema("stripe")
        .from("invoices")
        .select("id, status, paid, created, amount_paid, currency, total")
        .eq("customer", customerId)
        .or("paid.eq.true,status.eq.paid")
        .gt("amount_paid", 0)
        .order("created", { ascending: false })
        .limit(1);

      const hasPaidBefore = !!invErr
        ? false
        : Array.isArray(paidInvoices) && paidInvoices.length > 0;
      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Prior payments check", {
        customerId,
        error: invErr?.message,
        invoiceCount: Array.isArray(paidInvoices) ? paidInvoices.length : 0,
        hasPaidBefore,
        sample: Array.isArray(paidInvoices) && paidInvoices[0]
          ? {
              id: paidInvoices[0].id,
              status: paidInvoices[0].status,
              paid: paidInvoices[0].paid,
              amount_paid: paidInvoices[0].amount_paid,
              currency: paidInvoices[0].currency,
              total: paidInvoices[0].total,
            }
          : null,
      });

      const couponId = await getOrCreateFirstPurchaseCouponEUR10();
      const hasRedeemedBefore = await hasCustomerRedeemedCoupon(customerId, couponId);

      // Optional invoice gating: set FIRST_PURCHASE_DISCOUNT_SCOPE to 'price' or 'any'
      const scope = process.env.FIRST_PURCHASE_DISCOUNT_SCOPE?.trim().toLowerCase();
      let invoiceScopeEligible = true;
      let priorInvoiceReason: string | undefined;
      try {
        if (scope === "price") {
          const hasInvForPrice = await customerHasInvoiceForPrice(customerId, priceId);
          invoiceScopeEligible = !hasInvForPrice;
          priorInvoiceReason = hasInvForPrice ? "prior_invoice_for_price" : undefined;
        } else if (scope === "any") {
          const hasAny = await customerHasAnyInvoice(customerId);
          invoiceScopeEligible = !hasAny;
          priorInvoiceReason = hasAny ? "prior_invoice_any" : undefined;
        }
      } catch (e) {
        console.warn("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Invoice scope check failed; allowing by default", {
          error: e instanceof Error ? e.message : String(e),
          scope,
        });
        invoiceScopeEligible = true;
      }

      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Coupon eligibility", {
        customerId,
        couponId,
        hasRedeemedBefore,
        invoiceScope: scope || null,
        invoiceScopeEligible,
        priorInvoiceReason,
        // Note: prior payments are ignored for eligibility by request
        ignored_hasPaidBefore: hasPaidBefore,
      });

      // Apply discount if not redeemed yet and invoice scope (if configured) allows it
      if (!hasRedeemedBefore && invoiceScopeEligible) {
        // Eligible for first-purchase discount (ensure enforced per-customer)
        const discounts: Stripe.Checkout.SessionCreateParams["discounts"] = [
          {
            coupon: couponId,
          },
        ];
        sessionConfig.discounts = discounts;
        console.log(
          "[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Applying first-purchase coupon",
          { customerId, priceId, couponId }
        );
      } else {
        console.log(
          "[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Not eligible for discount",
          { customerId, priceId, hasRedeemedBefore, invoiceScope: scope || null, invoiceScopeEligible, priorInvoiceReason }
        );
      }
    } else if (targetPriceId) {
      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Price does not match target — skipping", {
        priceId,
        targetPriceId,
      });
    }
  } catch (err) {
    console.error("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Skipping discount due to error", {
      error: err instanceof Error ? err.message : String(err),
      customerId,
      priceId,
    });
    // Continue without discount
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  // Mark pending redemption to avoid rapid double-application before webhook confirms
  try {
    if (Array.isArray(sessionConfig.discounts) && sessionConfig.discounts.length > 0) {
      await stripe.customers.update(customerId, {
        metadata: {
          first_purchase_coupon_pending: "true",
          first_purchase_coupon_session_id: session.id,
          first_purchase_coupon_pending_at: new Date().toISOString(),
        },
      });
      console.log("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Marked coupon as pending on customer", {
        customerId,
        sessionId: session.id,
      });
    }
  } catch (e) {
    console.warn("[CHECKOUT_FIRST_PURCHASE_DISCOUNT] Failed to set pending flag", {
      customerId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return session;
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
}): Promise<Stripe.Subscription> => {
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
      // Set at runtime via a safe unknown cast to avoid `any` usage.
      (params as unknown as Record<string, unknown>).trial_period_days = trialPeriodDays;
    }
    
    // If no trial is provided, ensure card is collected later via payment settings,
    // but for trial flows we generally don't require a payment method upfront.
    const options: Stripe.RequestOptions | undefined = idempotencyKey ? { idempotencyKey } : undefined;
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
}): Promise<Stripe.BillingPortal.Session> => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

/**
 * Returns true if the customer has any invoice stored in the `stripe.invoices` table.
 */
export async function customerHasAnyInvoice(customerId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .schema("stripe")
      .from("invoices")
      .select("id, status, paid, amount_paid, created")
      .eq("customer", customerId)
      .order("created", { ascending: false })
      .limit(1);
    const has = !error && Array.isArray(data) && data.length > 0;
    console.log("[INVOICES_CHECK] Any invoice for customer?", {
      customerId,
      has,
      sample: has ? data?.[0]?.id : null,
    });
    return has;
  } catch (e) {
    console.warn("[INVOICES_CHECK] Failed to check invoices", {
      customerId,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Returns true if any invoice for this customer contains a line-item for the given price.
 * Parses both Stripe API-like shapes and Supabase-sync shapes for `lines`.
 */
export async function customerHasInvoiceForPrice(
  customerId: string,
  priceId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const parseJson = <T = unknown>(value: unknown): T | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return (value as T) || null;
  };

  const extractPriceIdsFromLine = (line: unknown): string[] => {
    const ids: string[] = [];
    try {
      if (!line || typeof line !== "object") return ids;
      const l = line as Record<string, unknown>;
      // Stripe API shape: line.price.id
      const priceObj = l.price;
      if (priceObj && typeof priceObj === "object" && typeof (priceObj as Record<string, unknown>).id === "string") {
        ids.push((priceObj as Record<string, unknown>).id as string);
      }
      // Supabase-sync shape: line.pricing.price_details.price
      const pricing = l.pricing as Record<string, unknown> | undefined;
      const pd = pricing?.price_details as Record<string, unknown> | undefined;
      if (pd && typeof pd.price === "string") ids.push(pd.price);
      // Some variants may include top-level price string
      if (typeof l.price === "string") ids.push(l.price);
    } catch {}
    return ids;
  };

  try {
    const { data, error } = await supabase
      .schema("stripe")
      .from("invoices")
      .select("id, lines, created")
      .eq("customer", customerId)
      .order("created", { ascending: false })
      .limit(200);

    if (error || !Array.isArray(data) || data.length === 0) {
      console.log("[INVOICES_CHECK] No invoices for price scan", { customerId, error: error?.message });
      return false;
    }

    for (const inv of data) {
      const lines = parseJson<unknown>(inv.lines);
      const items: unknown[] = Array.isArray(lines)
        ? (lines as unknown[])
        : lines && typeof lines === "object" && Array.isArray((lines as Record<string, unknown>).data)
          ? ((lines as Record<string, unknown>).data as unknown[])
          : [];
      for (const li of items) {
        const ids = extractPriceIdsFromLine(li);
        if (ids.includes(priceId)) {
          console.log("[INVOICES_CHECK] Found invoice for price", {
            customerId,
            priceId,
            invoiceId: inv.id,
          });
          return true;
        }
      }
    }

    console.log("[INVOICES_CHECK] No invoice lines match price", { customerId, priceId });
    return false;
  } catch (e) {
    console.warn("[INVOICES_CHECK] Failed to scan invoices for price", {
      customerId,
      priceId,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Returns a coupon id that represents a one-time €10 off discount.
 * Priority:
 * 1) Use env var FIRST_PURCHASE_10_EUR_COUPON_ID if provided
 * 2) Look up an existing coupon with metadata.auto_key === 'first_purchase_eur_10'
 * 3) Create a new coupon (amount_off=1000, currency=eur, duration=once)
 */
async function getOrCreateFirstPurchaseCouponEUR10(): Promise<string> {
  const envCoupon = process.env.FIRST_PURCHASE_10_EUR_COUPON_ID?.trim();
  if (envCoupon) {
    console.log("[FIRST_PURCHASE_COUPON] Using env coupon id", { couponId: envCoupon });
    return envCoupon;
  }

  // Try to find existing coupon tagged by our metadata key
  try {
    const existing = await stripe.coupons.list({ limit: 100 });
    const match = existing.data.find((c) => {
      const md = (c.metadata || {}) as Record<string, unknown>;
      return md["auto_key"] === "first_purchase_eur_10" && c.valid !== false;
    });
    if (match) {
      console.log("[FIRST_PURCHASE_COUPON] Found existing coupon", { couponId: match.id });
      return match.id;
    }
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
  console.log("[FIRST_PURCHASE_COUPON] Created new coupon", { couponId: created.id });
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
    // Fast path: check Stripe Customer metadata flag set by webhook
    try {
      const cust = await stripe.customers.retrieve(customerId);
      const flag =
        typeof cust !== "string" &&
        // @ts-expect-error Property 'metadata' does not exist on type...
        (cust.metadata?.["first_purchase_coupon_redeemed"] === "true" ||
          // also accept boolean true if set
          // @ts-expect-error Property 'metadata' does not exist on type...
          cust.metadata?.["first_purchase_coupon_redeemed"] === true ||
          // Block immediate reuse while a discounted session is pending
          // @ts-expect-error Property 'metadata' does not exist on type...
          cust.metadata?.["first_purchase_coupon_pending"] === "true");
      if (flag) {
        console.log("[FIRST_PURCHASE_COUPON] Detected redeemed flag on customer", {
          customerId,
        });
        return true;
      }
    } catch (e) {
      console.warn("[FIRST_PURCHASE_COUPON] Failed to read customer metadata", {
        customerId,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .schema("stripe")
      .from("invoices")
      .select("id, status, paid, discount, discounts, total_discount_amounts, lines")
      .eq("customer", customerId)
      .or("paid.eq.true,status.eq.paid")
      .order("created", { ascending: false })
      .limit(100);

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.log("[FIRST_PURCHASE_COUPON] No eligible invoices to check for redemption", {
        customerId,
        couponId,
        error: error?.message,
        count: Array.isArray(data) ? data.length : 0,
      });
      return false;
    }

    let usedOnInvoice: string | null = null;
    const used = data.some((inv: {
      id?: string;
      discount?: unknown;
      discounts?: unknown;
      total_discount_amounts?: unknown;
      lines?: unknown;
    }) => {
      const extractCouponId = (obj: unknown): string | null => {
        if (!obj || typeof obj !== "object") return null;
        const o = obj as Record<string, unknown>;

        // Stripe Discount obj may be under o.discount with nested coupon
        if (o.discount && typeof o.discount === "object") {
          const cid = extractCouponId(o.discount);
          if (cid) return cid;
        }

        // coupon may be a string id
        if (typeof o.coupon === "string") return o.coupon;

        // coupon may be an object with an id field
        if (o.coupon && typeof o.coupon === "object") {
          const c = o.coupon as Record<string, unknown>;
          if (typeof c.id === "string") return c.id;
        }

        // fallback fields sometimes appear
        if (typeof o.coupon_id === "string") return o.coupon_id;
        if (typeof o.id === "string" && String(o.id).startsWith("coupon_")) return o.id;

        return null;
      };

      const parseJson = <T = unknown>(value: unknown): T | null => {
        if (!value) return null;
        if (typeof value === "string") {
          try {
            return JSON.parse(value) as T;
          } catch {
            return null;
          }
        }
        return (value as T) || null;
      };

      try {
        // 1) invoice-level discount
        const d = inv.discount;
        if (d) {
          const dc = typeof d === "string" ? null : d;
          const dcCouponId = extractCouponId(dc);
          if (dcCouponId === couponId) {
            usedOnInvoice = inv.id || null;
            return true;
          }
        }

        // 2) invoice-level discounts array
        const discountsArr = parseJson<unknown[]>(inv.discounts);
        if (Array.isArray(discountsArr)) {
          for (const di of discountsArr) {
            const diCouponId = extractCouponId(di);
            if (diCouponId === couponId) {
              usedOnInvoice = inv.id || null;
              return true;
            }
          }
        }

        // 3) total_discount_amounts entries include a Discount object
        const tdas = parseJson<unknown[]>(inv.total_discount_amounts);
        if (Array.isArray(tdas)) {
          for (const tda of tdas) {
            const tdaCouponId = extractCouponId(tda);
            if (tdaCouponId === couponId) {
              usedOnInvoice = inv.id || null;
              return true;
            }
          }
        }

        // 4) line-item discounts (common when applied at checkout)
        const lines = parseJson<unknown>(inv.lines);
        const lineItems: unknown[] = Array.isArray(lines)
          ? (lines as unknown[])
          : lines && typeof lines === "object" && Array.isArray((lines as Record<string, unknown>).data)
            ? ((lines as Record<string, unknown>).data as unknown[])
            : [];
        for (const line of lineItems) {
          const lineDiscounts = parseJson<unknown[]>((line as Record<string, unknown>)?.discounts);
          if (Array.isArray(lineDiscounts)) {
            for (const ld of lineDiscounts) {
              const ldCouponId = extractCouponId(ld);
              if (ldCouponId === couponId) {
                usedOnInvoice = inv.id || null;
                return true;
              }
            }
          }
        }
      } catch {
        // ignore parse errors for safety
      }

      return false;
    });

    if (used) {
      console.log("[FIRST_PURCHASE_COUPON] Coupon already redeemed", {
        customerId,
        couponId,
        usedOnInvoice,
      });
    } else {
      console.log("[FIRST_PURCHASE_COUPON] Coupon not yet redeemed", {
        customerId,
        couponId,
      });
    }

    return used;
  } catch {
    return false;
  }
}
