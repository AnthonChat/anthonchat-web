import { createClient } from "@/lib/db/browser";

export interface Product {
  id: string;
  active: boolean;
  name: string | null;
  description: string | null;
  metadata: Record<string, string> | null;
}

export interface Price {
  id: string;
  product_id: string;
  active: boolean;
  unit_amount: number | null;
  currency: string | null;
  type: "one_time" | "recurring";
  recurring: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  } | null;
  trial_period_days: number | null;
  metadata: Record<string, string> | null;
}

export type SubscriptionPlan = Product & {
  prices: Price[];
};

export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  const supabase = createClient();

  // 1. Fetch all active, recurring prices
  const { data: prices, error: pricesError } = await supabase
    .schema("stripe")
    .from("prices")
    .select("*")
    .eq("active", true)
    .eq("type", "recurring");

  if (pricesError) {
    console.error(
      "Error fetching prices:",
      JSON.stringify(pricesError, null, 2)
    );
    return [];
  }

  if (!prices || prices.length === 0) {
    return [];
  }

  // 2. Collect all unique product IDs from the prices
  const productIds = [
    ...new Set(prices.map((price) => price.product).filter(Boolean)),
  ];

  if (productIds.length === 0) {
    return [];
  }

  // 3. Fetch all active products associated with those prices
  const { data: products, error: productsError } = await supabase
    .schema("stripe")
    .from("products")
    .select("*")
    .in("id", productIds as string[])
    .eq("active", true)
    .order("metadata->>order", { ascending: true });

  if (productsError) {
    console.error(
      "Error fetching products:",
      JSON.stringify(productsError, null, 2)
    );
    return [];
  }

  if (!products) {
    return [];
  }

  // 4. Map products and prices together
  const plans: SubscriptionPlan[] = products.map((product) => {
    const productPrices = prices.filter(
      (price) => price.product === product.id
    );
    return {
      ...product,
      prices: productPrices,
    };
  });

  return plans;
}
