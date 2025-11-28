// lib/queries/tiers.ts

import { createClient } from "@/lib/db/server";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";
import type { Database as StripeDatabase } from "@/lib/db/schemas/stripe";

// Type aliases for better readability
type TierFeatures = PublicDatabase["public"]["Tables"]["tiers_features"]["Row"];
type StripePrice = StripeDatabase["stripe"]["Tables"]["prices"]["Row"];

// Combined tier interface that includes both Stripe product data and features
export interface TierWithFeatures {
  id: string;
  name: string | null;
  description: string | null;
  metadata: unknown;
  active: boolean;
  features: TierFeatures | null;
  prices: StripePrice[];
}

/**
 * Gets tier features by product ID (which serves as the tier ID).
 */
export async function getTierByPriceId(
  priceId: string
): Promise<TierWithFeatures | null> {
  const supabase = await createClient();

  // First get the price to find the product
  const { data: priceData, error: priceError } = await supabase
    .schema("stripe")
    .from("prices")
    .select("*")
    .eq("id", priceId)
    .eq("active", true)
    .single();

  if (priceError) {
    console.error("PRICE_FETCH_BY_ID", {
      error: priceError,
      priceId,
    });
    return null;
  }

  if (!priceData?.product) {
    return null;
  }

  // Get the product details
  const { data: productData, error: productError } = await supabase
    .schema("stripe")
    .from("products")
    .select("*")
    .eq("id", priceData.product)
    .eq("active", true)
    .single();

  if (productError) {
    console.error("PRODUCT_FETCH_BY_PRICE_ID", {
      error: productError,
      productId: priceData.product,
      priceId,
    });
    return null;
  }

  // Get tier features
  const { data: featuresData, error: featuresError } = await supabase
    .from("tiers_features")
    .select("*")
    .eq("id", productData.id)
    .single();

  if (featuresError && featuresError.code !== "PGRST116") {
    console.error("TIER_FEATURES_FETCH", {
      error: featuresError,
      productId: productData.id,
    });
  }

  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema("stripe")
    .from("prices")
    .select("*")
    .eq("product", productData.id)
    .eq("active", true);

  if (pricesError) {
    console.error("PRICES_FETCH_FOR_PRODUCT", {
      error: pricesError,
      productId: productData.id,
    });
  }

  return {
    id: productData.id,
    name: productData.name,
    description: productData.description,
    metadata: productData.metadata,
    active: productData.active,
    features: featuresData || null,
    prices: pricesData || [],
  };
}

/**
 * Gets tier by product slug (from metadata).
 */
export async function getTierBySlug(
  slug: string
): Promise<TierWithFeatures | null> {
  const supabase = await createClient();

  // Search for product by slug in metadata
  const { data: productData, error: productError } = await supabase
    .schema("stripe")
    .from("products")
    .select("*")
    .eq("active", true);

  if (productError) {
    console.error("PRODUCTS_FETCH_BY_SLUG", {
      error: productError,
      slug,
    });
    return null;
  }

  // Find product with matching slug in metadata
  const product = productData?.find((p) => {
    const metadata = p.metadata as Record<string, unknown>;
    return metadata?.slug === slug;
  });

  if (!product) {
    return null;
  }

  // Get tier features
  const { data: featuresData, error: featuresError } = await supabase
    .from("tiers_features")
    .select("*")
    .eq("id", product.id)
    .single();

  if (featuresError && featuresError.code !== "PGRST116") {
    console.error("TIER_FEATURES_FETCH_BY_SLUG", {
      error: featuresError,
      productId: product.id,
      slug,
    });
  }

  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema("stripe")
    .from("prices")
    .select("*")
    .eq("product", product.id)
    .eq("active", true);

  if (pricesError) {
    console.error("PRICES_FETCH_FOR_PRODUCT_BY_SLUG", {
      error: pricesError,
      productId: product.id,
      slug,
    });
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    metadata: product.metadata,
    active: product.active,
    features: featuresData || null,
    prices: pricesData || [],
  };
}
