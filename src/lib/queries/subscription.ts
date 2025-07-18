// lib/queries/subscription.ts:

import { createClient } from "@/utils/supabase/server";

// --- Step 1: Define types that EXACTLY match the REAL data structure ---
// This is updated based on the runtime log you provided.

interface StripeProduct {
	id: string;
	name: string;
	description: string | null;
	metadata: any;
}

interface StripePrice {
	id: string;
	unit_amount: number | null;
	// 'product' is a single object, NOT an array.
	product: StripeProduct;
}

interface StripeSubscriptionItem {
	// 'price' is a single object, NOT an array.
	price: StripePrice;
	current_period_start: number;
	current_period_end: number;
}

// This is the true shape of the object returned by our query
interface SubscriptionWithDetails {
	id: string;
	status: string;
	cancel_at_period_end: boolean;
	items: { data: StripeSubscriptionItem[] };
}

export type UserSubscription = Awaited<ReturnType<typeof getUserSubscription>>;

export async function getUserSubscription(userId: string) {
	const supabase = await createClient();

	const { data: userData, error: userError } = await supabase
		.from("users")
		.select("stripe_customer_id")
		.eq("id", userId)
 		.single();

	if (userError || !userData?.stripe_customer_id) {
		console.error(
			"Error fetching user's Stripe customer ID:",
			userError?.message
		);
		return null;
	}

	const stripeCustomerId = userData.stripe_customer_id;

	// The query uses hints to ensure single objects are returned where appropriate
	const { data, error: subscriptionError } = await supabase
    .schema("stripe")
		.from("subscriptions")
		.select(
			`
      id,
      status,
      cancel_at_period_end,
      items
    `
		)
		.eq("customer", stripeCustomerId)
		.in("status", ["active", "trialing"])
		.single();

	if (subscriptionError) {
		console.error(
			"Error fetching subscription:",
			subscriptionError.message
		);
		if (subscriptionError.code === "PGRST116") return null;
		throw subscriptionError;
	}

	if (!data) {
		return null;
	}

	// We use type assertion because we know the true shape better than the inference engine.
	const subscriptionData = data as unknown as SubscriptionWithDetails;
	// --- Step 2: Adapt the runtime logic to access objects directly ---
	const primaryItem = subscriptionData.items.data?.[0];
	const priceDetails = primaryItem?.price;
	const productDetails = priceDetails?.product;

	const { data: productData, error: productError } = await supabase
		.schema("stripe")
		.from("products")
		.select("id, name, description, metadata")
		.eq("id", priceDetails.product)
		.single();

	if (productError) {
		console.error("Error fetching product details:", productError.message);
		return null;
	}

	if (!productData) {
		console.error(
			"Runtime check failed: Subscription data is missing nested product details.",
			subscriptionData
		);
		return null;
	}

	const { data: featureData, error: featureError } = await supabase
		.from("tiers_features")
		.select("history_limit, tokens_limit, requests_limit")
		.eq("id", productData.id);

	if (featureError) {
		console.error("Error fetching tier features:", featureError.message);
		return null;
	}

	const features = Array.isArray(featureData) ? featureData[0] : featureData;

	return {
		id: subscriptionData.id,
		status: subscriptionData.status,
		current_period_start: primaryItem?.current_period_start ?? null,
		current_period_end: primaryItem?.current_period_end ?? null,
		cancel_at_period_end: subscriptionData.cancel_at_period_end,
		price: {
			id: priceDetails.id,
			amount: priceDetails.unit_amount,
		},
		product: {
			id: productData.id,
			name: productData.name,
			description: productData.description,
			slug: productData.metadata?.slug,
		},
		features: {
			history_limit: features?.history_limit ?? null,
			tokens_limit: features?.tokens_limit ?? null,
			requests_limit: features?.requests_limit ?? null,
		},
	};
}
