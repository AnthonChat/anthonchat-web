/**
 * Stripe Products and Prices Setup Script
 * 
 * This script creates the necessary products and prices in Stripe
 * and outputs the price IDs that need to be added to your database.
 * 
 * Usage:
 * 1. Set your Stripe secret key in the environment
 * 2. Run: node scripts/setup-stripe-products.js
 * 3. Copy the price IDs to update your database
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const products = [
  {
    name: 'Basic Plan',
    description: 'Perfect for individuals and small teams',
    price: 999, // $9.99 in cents
    interval: 'month',
    slug: 'basic'
  },
  {
    name: 'Standard Plan', 
    description: 'Perfect for growing businesses',
    price: 1999, // $19.99 in cents
    interval: 'month',
    slug: 'standard'
  },
  {
    name: 'Pro Plan',
    description: 'For teams that need maximum power',
    price: 3999, // $39.99 in cents
    interval: 'month', 
    slug: 'pro'
  }
]

async function createProductsAndPrices() {
  console.log('🚀 Setting up Stripe products and prices...')
  console.log('')
  
  const results = []
  
  for (const productData of products) {
    try {
      console.log(`Creating product: ${productData.name}...`)
      
      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: {
          slug: productData.slug
        }
      })
      
      console.log(`✅ Product created: ${product.id}`)
      
      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.price,
        currency: 'usd',
        recurring: {
          interval: productData.interval
        },
        metadata: {
          slug: productData.slug
        }
      })
      
      console.log(`✅ Price created: ${price.id}`)
      console.log('')
      
      results.push({
        slug: productData.slug,
        productId: product.id,
        priceId: price.id,
        amount: productData.price / 100
      })
      
    } catch (error) {
      console.error(`❌ Error creating ${productData.name}:`, error.message)
    }
  }
  
  // Output SQL commands
  console.log('📋 SQL Commands to update your database:')
  console.log('=' .repeat(50))
  console.log('')
  
  results.forEach(result => {
    console.log(`UPDATE tiers SET stripe_price_id = '${result.priceId}' WHERE slug = '${result.slug}';`)
  })
  
  console.log('')
  console.log('📊 Summary:')
  console.log('=' .repeat(50))
  
  results.forEach(result => {
    console.log(`${result.slug.toUpperCase()} Plan:`)
    console.log(`  Product ID: ${result.productId}`)
    console.log(`  Price ID: ${result.priceId}`)
    console.log(`  Amount: $${result.amount}/month`)
    console.log('')
  })
  
  console.log('🎉 Setup complete! Copy the SQL commands above to update your database.')
}

// Validation
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required')
  console.log('Set it with: export STRIPE_SECRET_KEY=sk_test_...')
  process.exit(1)
}

if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ Error: Invalid Stripe secret key format')
  process.exit(1)
}

// Run the setup
createProductsAndPrices().catch(error => {
  console.error('❌ Setup failed:', error.message)
  process.exit(1)
})