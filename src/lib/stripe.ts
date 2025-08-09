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
