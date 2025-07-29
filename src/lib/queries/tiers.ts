// lib/queries/tiers.ts

import { createClient } from '@/utils/supabase/server'
import { tierLogger } from '@/lib/logging/loggers'
import type { Database as PublicDatabase } from '@/utils/supabase/schemas/public'
import type { Database as StripeDatabase } from '@/utils/supabase/schemas/stripe'

// Type aliases for better readability
type TierFeatures = PublicDatabase["public"]["Tables"]["tiers_features"]["Row"];
type TierFeaturesInsert = PublicDatabase["public"]["Tables"]["tiers_features"]["Insert"];
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
export async function getTierByPriceId(priceId: string): Promise<TierWithFeatures | null> {
  const supabase = await createClient()
  
  // First get the price to find the product
  const { data: priceData, error: priceError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('id', priceId)
    .eq('active', true)
    .single()
    
  if (priceError) {
    tierLogger.error('PRICE_FETCH_BY_ID', 'TIER_QUERIES', { error: priceError, priceId })
    return null
  }
  
  if (!priceData?.product) {
    return null
  }
  
  // Get the product details
  const { data: productData, error: productError } = await supabase
    .schema('stripe')
    .from('products')
    .select('*')
    .eq('id', priceData.product)
    .eq('active', true)
    .single()
    
  if (productError) {
    tierLogger.error('PRODUCT_FETCH_BY_PRICE_ID', 'TIER_QUERIES', { error: productError, productId: priceData.product, priceId })
    return null
  }
  
  // Get tier features
  const { data: featuresData, error: featuresError } = await supabase
    .from('tiers_features')
    .select('*')
    .eq('id', productData.id)
    .single()
    
  if (featuresError && featuresError.code !== 'PGRST116') {
    tierLogger.error('TIER_FEATURES_FETCH', 'TIER_QUERIES', { error: featuresError, productId: productData.id })
  }
  
  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('product', productData.id)
    .eq('active', true)
    
  if (pricesError) {
    tierLogger.error('PRICES_FETCH_FOR_PRODUCT', 'TIER_QUERIES', { error: pricesError, productId: productData.id })
  }
  
  return {
    id: productData.id,
    name: productData.name,
    description: productData.description,
    metadata: productData.metadata,
    active: productData.active,
    features: featuresData || null,
    prices: pricesData || []
  }
}

/**
 * Gets tier by product slug (from metadata).
 */
export async function getTierBySlug(slug: string): Promise<TierWithFeatures | null> {
  const supabase = await createClient()
  
  // Search for product by slug in metadata
  const { data: productData, error: productError } = await supabase
    .schema('stripe')
    .from('products')
    .select('*')
    .eq('active', true)
    
  if (productError) {
    tierLogger.error('PRODUCTS_FETCH_BY_SLUG', 'TIER_QUERIES', { error: productError, slug })
    return null
  }
  
  // Find product with matching slug in metadata
  const product = productData?.find(p => {
    const metadata = p.metadata as Record<string, unknown>
    return metadata?.slug === slug
  })
  
  if (!product) {
    return null
  }
  
  // Get tier features
  const { data: featuresData, error: featuresError } = await supabase
    .from('tiers_features')
    .select('*')
    .eq('id', product.id)
    .single()
    
  if (featuresError && featuresError.code !== 'PGRST116') {
    tierLogger.error('TIER_FEATURES_FETCH_BY_SLUG', 'TIER_QUERIES', { error: featuresError, productId: product.id, slug })
  }
  
  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('product', product.id)
    .eq('active', true)
    
  if (pricesError) {
    tierLogger.error('PRICES_FETCH_FOR_PRODUCT_BY_SLUG', 'TIER_QUERIES', { error: pricesError, productId: product.id, slug })
  }
  
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    metadata: product.metadata,
    active: product.active,
    features: featuresData || null,
    prices: pricesData || []
  }
}

/**
 * Gets all active tiers (products with features).
 */
export async function getAllActiveTiers(): Promise<TierWithFeatures[]> {
  const supabase = await createClient()
  
  // Get all active products
  const { data: productsData, error: productsError } = await supabase
    .schema('stripe')
    .from('products')
    .select('*')
    .eq('active', true)
    
  if (productsError) {
    tierLogger.error('ACTIVE_PRODUCTS_FETCH', 'TIER_QUERIES', { error: productsError })
    return []
  }
  
  if (!productsData) {
    return []
  }
  
  // Get features for all products
  const { data: featuresData, error: featuresError } = await supabase
    .from('tiers_features')
    .select('*')
    
  if (featuresError) {
    tierLogger.error('ALL_TIER_FEATURES_FETCH', 'TIER_QUERIES', { error: featuresError })
  }
  
  // Get all prices
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('active', true)
    
  if (pricesError) {
    tierLogger.error('ALL_PRICES_FETCH', 'TIER_QUERIES', { error: pricesError })
  }
  
  // Combine data
  const tiers: TierWithFeatures[] = productsData.map(product => {
    const features = featuresData?.find(f => f.id === product.id) || null
    const prices = pricesData?.filter(p => p.product === product.id) || []
    
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      metadata: product.metadata,
      active: product.active,
      features,
      prices
    }
  })
  
  // Sort by tokens limit (ascending)
  return tiers.sort((a, b) => {
    const aTokens = a.features?.tokens_limit || 0
    const bTokens = b.features?.tokens_limit || 0
    return aTokens - bTokens
  })
}

/**
 * Creates or updates tier features for a product.
 */
export async function upsertTierFeatures(
  productId: string, 
  features: Omit<TierFeaturesInsert, 'id'>
): Promise<TierFeatures> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tiers_features')
    .upsert({ id: productId, ...features })
    .select('*')
    .single()
    
  if (error) {
    tierLogger.error('TIER_FEATURES_UPSERT', 'TIER_QUERIES', { error, productId, features })
    throw error
  }
  
  return data
}