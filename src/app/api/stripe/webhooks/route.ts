import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/db/server";
import Stripe from "stripe";
import { getTierByPriceId } from "@/lib/queries/tiers";
import { apiLogger } from "@/utils/loggers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      apiLogger.error(
        "WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
        "API_STRIPE_WEBHOOKS",
        { error: err }
      );
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

      default:
        apiLogger.info("UNHANDLED_WEBHOOK_EVENT", "API_STRIPE_WEBHOOKS", {
          eventType: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    apiLogger.error("WEBHOOK_HANDLER_ERROR", "API_STRIPE_WEBHOOKS", { error });
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
      apiLogger.error("SUBSCRIPTION_MISSING_USER_ID", "API_STRIPE_WEBHOOKS", {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      apiLogger.error("SUBSCRIPTION_MISSING_PRICE_ID", "API_STRIPE_WEBHOOKS", {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Find the tier based on the price ID
    const tier = await getTierByPriceId(priceId);
    if (!tier) {
      apiLogger.error("TIER_NOT_FOUND_FOR_PRICE_ID", "API_STRIPE_WEBHOOKS", {
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
      apiLogger.error("SUBSCRIPTION_UPSERT_ERROR", "API_STRIPE_WEBHOOKS", {
        error,
        subscriptionId: subscription.id,
        userId,
      });
    }
  } catch (err) {
    apiLogger.error("HANDLE_SUBSCRIPTION_CHANGE_ERROR", "API_STRIPE_WEBHOOKS", {
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
      apiLogger.error(
        "SUBSCRIPTION_DELETE_UPDATE_ERROR",
        "API_STRIPE_WEBHOOKS",
        { error, subscriptionId: subscription.id }
      );
    }
  } catch (err) {
    apiLogger.error(
      "HANDLE_SUBSCRIPTION_DELETED_ERROR",
      "API_STRIPE_WEBHOOKS",
      { error: err, subscriptionId: subscription.id }
    );
  }
}
