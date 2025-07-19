// lib/queries/tiers.ts

import { createClient } from '@/utils/supabase/server'
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
    console.error('Error fetching price by ID:', priceError)
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
    console.error('Error fetching product by price ID:', productError)
    return null
  }
  
  // Get tier features
  const { data: featuresData, error: featuresError } = await supabase
    .from('tiers_features')
    .select('*')
    .eq('id', productData.id)
    .single()
    
  if (featuresError && featuresError.code !== 'PGRST116') {
    console.error('Error fetching tier features:', featuresError)
  }
  
  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('product', productData.id)
    .eq('active', true)
    
  if (pricesError) {
    console.error('Error fetching prices for product:', pricesError)
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
    console.error('Error fetching products:', productError)
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
    console.error('Error fetching tier features:', featuresError)
  }
  
  // Get all prices for this product
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('product', product.id)
    .eq('active', true)
    
  if (pricesError) {
    console.error('Error fetching prices for product:', pricesError)
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
    console.error('Error fetching active products:', productsError)
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
    console.error('Error fetching tier features:', featuresError)
  }
  
  // Get all prices
  const { data: pricesData, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('active', true)
    
  if (pricesError) {
    console.error('Error fetching prices:', pricesError)
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
    console.error('Error upserting tier features:', error)
    throw error
  }
  
  return data
}