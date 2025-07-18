// lib/queries/tiers.ts

import { createClient } from '@/utils/supabase/server'

export async function getTierByPriceId(priceId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('stripe_price_id', priceId)
    .eq('is_active', true)
    .single()
    
  if (error) {
    console.error('Error fetching tier by price ID:', error)
    return null
  }
  
  return data
}

export async function getTierBySlug(slug: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
    
  if (error) {
    console.error('Error fetching tier by slug:', error)
    return null
  }
  
  return data
}

export async function getAllActiveTiers() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('is_active', true)
    .order('max_tokens', { ascending: true })
    
  if (error) {
    console.error('Error fetching active tiers:', error)
    return []
  }
  
  return data || []
}