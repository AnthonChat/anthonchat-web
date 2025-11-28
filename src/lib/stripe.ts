import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/db/server";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2025-06-30.basil",
	typescript: true,
});

export const createStripeCustomer = async (email: string, name?: string) => {
	return await stripe.customers.create({
		email,
		name,
	});
};

export const getStripeCustomerByEmail = async (email: string) => {
	const customers = await stripe.customers.list({
		email,
		limit: 1,
	});
	return customers.data[0];
};

export const createCheckoutSession = async (
	params: Stripe.Checkout.SessionCreateParams
) => {
	return await stripe.checkout.sessions.create(params);
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
			(params as unknown as Record<string, unknown>).trial_period_days =
				trialPeriodDays;
		}

		// If no trial is provided, ensure card is collected later via payment settings,
		// but for trial flows we generally don't require a payment method upfront.
		const options: Stripe.RequestOptions | undefined = idempotencyKey
			? { idempotencyKey }
			: undefined;
		const subscription = await stripe.subscriptions.create(params, options);
		return subscription;
	} catch (error) {
		console.error(
			"[CREATE_SUBSCRIPTION_WITH_TRIAL] Error creating subscription",
			{
				error: error instanceof Error ? error.message : error,
				customerId,
				priceId,
				userId,
			}
		);
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
export async function customerHasAnyInvoice(
	customerId: string
): Promise<boolean> {
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
			if (
				priceObj &&
				typeof priceObj === "object" &&
				typeof (priceObj as Record<string, unknown>).id === "string"
			) {
				ids.push((priceObj as Record<string, unknown>).id as string);
			}
			// Supabase-sync shape: line.pricing.price_details.price
			const pricing = l.pricing as Record<string, unknown> | undefined;
			const pd = pricing?.price_details as
				| Record<string, unknown>
				| undefined;
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
			console.log("[INVOICES_CHECK] No invoices for price scan", {
				customerId,
				error: error?.message,
			});
			return false;
		}

		for (const inv of data) {
			const lines = parseJson<unknown>(inv.lines);
			const items: unknown[] = Array.isArray(lines)
				? (lines as unknown[])
				: lines &&
				  typeof lines === "object" &&
				  Array.isArray((lines as Record<string, unknown>).data)
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

		console.log("[INVOICES_CHECK] No invoice lines match price", {
			customerId,
			priceId,
		});
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
export async function getOrCreateFirstPurchaseCouponEUR10(): Promise<string> {
	const envCoupon = process.env.FIRST_PURCHASE_10_EUR_COUPON_ID?.trim();
	if (envCoupon) {
		console.log("[FIRST_PURCHASE_COUPON] Using env coupon id", {
			couponId: envCoupon,
		});
		return envCoupon;
	}

	// Try to find existing coupon tagged by our metadata key
	try {
		const existing = await stripe.coupons.list({ limit: 100 });
		const match = existing.data.find((c) => {
			const md = (c.metadata || {}) as Record<string, unknown>;
			return (
				md["auto_key"] === "first_purchase_eur_10" && c.valid !== false
			);
		});
		if (match) {
			console.log("[FIRST_PURCHASE_COUPON] Found existing coupon", {
				couponId: match.id,
			});
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
	console.log("[FIRST_PURCHASE_COUPON] Created new coupon", {
		couponId: created.id,
	});
	return created.id;
}

/**
 * Checks if the given customer already redeemed the first purchase coupon
 * by inspecting paid invoices for the presence of our coupon ID.
 */
export async function hasCustomerRedeemedCoupon(
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
					cust.metadata?.["first_purchase_coupon_redeemed"] ===
						true ||
					// Block immediate reuse while a discounted session is pending
					// @ts-expect-error Property 'metadata' does not exist on type...
					cust.metadata?.["first_purchase_coupon_pending"] ===
						"true");
			if (flag) {
				console.log(
					"[FIRST_PURCHASE_COUPON] Detected redeemed flag on customer",
					{
						customerId,
					}
				);
				return true;
			}
		} catch (e) {
			console.warn(
				"[FIRST_PURCHASE_COUPON] Failed to read customer metadata",
				{
					customerId,
					error: e instanceof Error ? e.message : String(e),
				}
			);
		}

		const supabase = createServiceRoleClient();
		const { data, error } = await supabase
			.schema("stripe")
			.from("invoices")
			.select(
				"id, status, paid, discount, discounts, total_discount_amounts, lines"
			)
			.eq("customer", customerId)
			.or("paid.eq.true,status.eq.paid")
			.order("created", { ascending: false })
			.limit(100);

		if (error || !data || !Array.isArray(data) || data.length === 0) {
			console.log(
				"[FIRST_PURCHASE_COUPON] No eligible invoices to check for redemption",
				{
					customerId,
					couponId,
					error: error?.message,
					count: Array.isArray(data) ? data.length : 0,
				}
			);
			return false;
		}

		let usedOnInvoice: string | null = null;
		const used = data.some(
			(inv: {
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
					if (
						typeof o.id === "string" &&
						String(o.id).startsWith("coupon_")
					)
						return o.id;

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
					const tdas = parseJson<unknown[]>(
						inv.total_discount_amounts
					);
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
						: lines &&
						  typeof lines === "object" &&
						  Array.isArray((lines as Record<string, unknown>).data)
						? ((lines as Record<string, unknown>).data as unknown[])
						: [];
					for (const line of lineItems) {
						const lineDiscounts = parseJson<unknown[]>(
							(line as Record<string, unknown>)?.discounts
						);
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
			}
		);

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

/**
 * Waits for the Stripe customer to be synced to the local database via webhooks.
 */
export async function waitForCustomerSync(
	customerId: string,
	timeoutMs: number = 10000
): Promise<boolean> {
	const start = Date.now();
	const supabase = createServiceRoleClient();

	while (Date.now() - start < timeoutMs) {
		const { data } = await supabase
			.schema("stripe")
			.from("customers")
			.select("id")
			.eq("id", customerId)
			.single();

		if (data) return true;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return false;
}

/**
 * Checks if a customer exists in the local database.
 */
export async function debugCheckCustomerExists(
	customerId: string
): Promise<unknown | null> {
	const supabase = createServiceRoleClient();
	const { data } = await supabase
		.schema("stripe")
		.from("customers")
		.select("*")
		.eq("id", customerId)
		.single();
	return data;
}

/**
 * Links a Stripe customer to a Supabase user in the local database.
 * This is a fallback if the webhook sync fails or is delayed.
 */
export async function linkCustomerToUser(
	userId: string,
	customerId: string
): Promise<boolean> {
	const supabase = createServiceRoleClient();

	// First check if the customer record exists
	const { data: customer } = await supabase
		.schema("stripe")
		.from("customers")
		.select("id")
		.eq("id", customerId)
		.single();

	if (!customer) {
		// If customer doesn't exist in stripe.customers, we can't link it there yet.
		// But we can update the public.users table.
		console.warn(
			"[LINK_CUSTOMER] Customer not found in stripe.customers, updating public.users only",
			{ customerId }
		);
	} else {
		// Update stripe.customers if it exists
		await supabase
			.schema("stripe")
			.from("customers")
			.update({ user_id: userId } as unknown as Record<string, unknown>) // Cast to unknown first to avoid any
			.eq("id", customerId);
	}

	// Always update public.users
	const { error } = await supabase
		.from("users")
		.update({ stripe_customer_id: customerId })
		.eq("id", userId);

	return !error;
}
