/**
 * Update Database with Stripe Price IDs
 * 
 * This script updates the tiers table with the Stripe price IDs
 * created by the setup-stripe-products.js script.
 */

require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Price IDs from the Stripe setup
const priceUpdates = [
  { slug: 'basic', priceId: 'price_1Rk7GGQH21dH2pp3kspgNYXS' },
  { slug: 'standard', priceId: 'price_1Rk7GHQH21dH2pp32TV497AR' },
  { slug: 'pro', priceId: 'price_1Rk7GIQH21dH2pp3tWUoyu6Q' }
]

async function updatePriceIds() {
  console.log('🔄 Updating tiers with Stripe price IDs...')
  console.log('')
  
  for (const update of priceUpdates) {
    try {
      console.log(`Updating ${update.slug} tier with price ID: ${update.priceId}`)
      
      const { data, error } = await supabase
        .from('tiers')
        .update({ stripe_price_id: update.priceId })
        .eq('slug', update.slug)
        .select()
      
      if (error) {
        console.error(`❌ Error updating ${update.slug}:`, error.message)
      } else {
        console.log(`✅ Successfully updated ${update.slug} tier`)
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${update.slug}:`, error.message)
    }
  }
  
  console.log('')
  console.log('🎉 Database update complete!')
  console.log('')
  
  // Verify the updates
  console.log('📋 Verifying updates...')
  const { data: tiers, error } = await supabase
    .from('tiers')
    .select('slug, name, stripe_price_id')
    .in('slug', ['basic', 'standard', 'pro'])
  
  if (error) {
    console.error('❌ Error verifying updates:', error.message)
  } else {
    console.log('')
    tiers.forEach(tier => {
      console.log(`${tier.slug.toUpperCase()}: ${tier.name} -> ${tier.stripe_price_id || 'NOT SET'}`)
    })
  }
}

// Validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is required')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
  process.exit(1)
}

// Run the update
updatePriceIds().catch(error => {
  console.error('❌ Update failed:', error.message)
  process.exit(1)
})