import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/db/server";
import Stripe from "stripe";
import { getTierByPriceId } from "@/lib/queries/tiers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function OPTIONS() {
  // CORS preflight for webhook POSTs (if needed)
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, stripe-signature",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("WEBHOOK_SIGNATURE_VERIFICATION_FAILED", { error: err });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if ("subscription" in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(supabase, subscription);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if ("subscription" in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(supabase, subscription);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if ("subscription" in invoice && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(supabase, subscription);
        }
        try {
          // After a successful payment, mark first-purchase coupon redemption if present
          if (typeof invoice.customer === "string") {
            const used = wasFirstPurchaseCouponUsedOnInvoice(invoice);
            if (used) {
              await stripe.customers.update(invoice.customer, {
                metadata: {
                  first_purchase_coupon_redeemed: "true",
                  first_purchase_coupon_redeemed_at: new Date().toISOString(),
                  first_purchase_coupon_pending: "false",
                },
              });
              console.log(
                "[WEBHOOK] Marked first-purchase coupon as redeemed",
                {
                  customerId: invoice.customer,
                  invoiceId: invoice.id,
                }
              );
            }
          }
        } catch (e) {
          console.warn("[WEBHOOK] Failed to mark coupon redemption", {
            error: e instanceof Error ? e.message : String(e),
            invoiceId: invoice.id,
          });
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await handleSubscriptionChange(supabase, subscription);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          if (typeof session.customer === "string") {
            const customer = await stripe.customers.retrieve(session.customer);
            if (typeof customer !== "string") {
              const pending =
                // @ts-expect-error Property 'metadata' does not exist on type...
                customer.metadata?.["first_purchase_coupon_pending"];
              const reserved =
                // @ts-expect-error Property 'metadata' does not exist on type...
                customer.metadata?.["first_purchase_coupon_session_id"];
              if (pending === "true" && reserved === session.id) {
                await stripe.customers.update(session.customer, {
                  metadata: {
                    first_purchase_coupon_pending: "false",
                  },
                });
                console.log(
                  "[WEBHOOK] Cleared pending coupon flag on session expiration",
                  {
                    customerId: session.customer,
                    sessionId: session.id,
                  }
                );
              }
            }
          }
        } catch (e) {
          console.warn(
            "[WEBHOOK] Failed to clear pending coupon flag on expiration",
            {
              error: e instanceof Error ? e.message : String(e),
              sessionId: session.id,
            }
          );
        }
        break;
      }

      default:
        console.info("UNHANDLED_WEBHOOK_EVENT", {
          eventType: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WEBHOOK_HANDLER_ERROR", { error });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  try {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error("SUBSCRIPTION_MISSING_USER_ID", {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.error("SUBSCRIPTION_MISSING_PRICE_ID", {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Find the tier based on the price ID
    const tier = await getTierByPriceId(priceId);
    if (!tier) {
      console.error("TIER_NOT_FOUND_FOR_PRICE_ID", {
        priceId,
        subscriptionId: subscription.id,
      });
      return;
    }

    // Helper function to safely convert timestamp to ISO string
    const safeTimestampToISO = (
      timestamp: number | null | undefined
    ): string | null => {
      if (!timestamp || timestamp <= 0) return null;
      try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    // Upsert subscription
    const subscriptionData: Record<string, unknown> = {
      user_id: userId,
      tier_id: tier.id,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    // Only add timestamp fields if they are valid
    // Get the first subscription item for billing period info
    const [item] = subscription.items.data;
    const periodStart = item
      ? safeTimestampToISO(item.current_period_start)
      : null;
    const periodEnd = item ? safeTimestampToISO(item.current_period_end) : null;
    const createdAt = safeTimestampToISO(subscription.created);

    if (periodStart) subscriptionData.current_period_start = periodStart;
    if (periodEnd) subscriptionData.current_period_end = periodEnd;
    if (createdAt) subscriptionData.created_at = createdAt;

    const { error } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("SUBSCRIPTION_UPSERT_ERROR", {
        error,
        subscriptionId: subscription.id,
        userId,
      });
    }
  } catch (err) {
    console.error("HANDLE_SUBSCRIPTION_CHANGE_ERROR", {
      error: err,
      subscriptionId: subscription.id,
    });
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("SUBSCRIPTION_DELETE_UPDATE_ERROR", {
        error,
        subscriptionId: subscription.id,
      });
    }
  } catch (err) {
    console.error("HANDLE_SUBSCRIPTION_DELETED_ERROR", {
      error: err,
      subscriptionId: subscription.id,
    });
  }
}

// Determines whether the invoice used the first-purchase coupon.
// Matches either by explicit env coupon id or by coupon metadata key.
function wasFirstPurchaseCouponUsedOnInvoice(invoice: Stripe.Invoice): boolean {
  const envCouponId = process.env.FIRST_PURCHASE_10_EUR_COUPON_ID?.trim();
  const autoKey = "first_purchase_eur_10";

  const matchCoupon = (
    coupon: Stripe.Coupon | string | null | undefined
  ): boolean => {
    try {
      if (!coupon) return false;
      if (typeof coupon === "string")
        return envCouponId ? coupon === envCouponId : false;
      if (envCouponId && coupon.id === envCouponId) return true;
      // Fallback: metadata key if present
      const md = (coupon.metadata || {}) as Record<string, unknown>;
      return md["auto_key"] === autoKey;
    } catch {
      return false;
    }
  };

  const anyDiscountMatches = (
    discounts: Stripe.Discount[] | null | undefined
  ) => {
    if (!Array.isArray(discounts)) return false;
    for (const d of discounts) {
      if (matchCoupon(d.coupon as Stripe.Coupon | string | undefined))
        return true;
    }
    return false;
  };

  try {
    // Invoice-level discount(s)
    // @ts-expect-error Stripe types may differ by version
    if (invoice.discount && matchCoupon(invoice.discount.coupon)) return true;
    // @ts-expect-error not assignable to parameter of type 'Discount[]'.

    if (anyDiscountMatches(invoice.discounts)) return true;

    // Line-level discounts
    const lines = invoice.lines?.data || [];
    for (const li of lines) {
      // @ts-expect-error not assignable to parameter of type 'Discount[]'.

      if (anyDiscountMatches(li.discounts)) return true;
    }
  } catch {
    // ignore
  }

  return false;
}
