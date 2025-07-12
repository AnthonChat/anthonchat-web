# Stripe Integration Guide

This document outlines the complete Stripe integration for subscription management in the AnthonChat application.

## Overview

The Stripe integration provides:
- Subscription checkout and payment processing
- Customer portal for billing management
- Webhook handling for real-time subscription updates
- Trial subscription management
- Subscription cancellation and reactivation

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Dashboard Setup

#### Create Products and Prices

1. **Basic Plan**
   - Product Name: "Basic Plan"
   - Price: $9.99/month
   - Copy the Price ID to update the `tiers` table

2. **Standard Plan**
   - Product Name: "Standard Plan"
   - Price: $19.99/month
   - Copy the Price ID to update the `tiers` table

3. **Pro Plan**
   - Product Name: "Pro Plan"
   - Price: $39.99/month
   - Copy the Price ID to update the `tiers` table

#### Update Database with Stripe Price IDs

Run the following SQL to update your tiers with Stripe price IDs:

```sql
UPDATE tiers SET stripe_price_id = 'price_1234567890' WHERE slug = 'basic';
UPDATE tiers SET stripe_price_id = 'price_0987654321' WHERE slug = 'standard';
UPDATE tiers SET stripe_price_id = 'price_1122334455' WHERE slug = 'pro';
```

#### Configure Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Customer Portal Configuration

1. Go to Stripe Dashboard > Settings > Billing > Customer Portal
2. Enable the customer portal
3. Configure allowed features:
   - Update payment methods
   - View billing history
   - Cancel subscriptions
   - Update billing information

## File Structure

```
src/
├── lib/stripe/
│   ├── config.ts              # Stripe client configuration
│   └── subscriptions.ts       # Subscription management functions
├── app/api/stripe/
│   ├── create-checkout-session/
│   │   └── route.ts          # Checkout session creation
│   ├── create-portal-session/
│   │   └── route.ts          # Customer portal session
│   ├── cancel-subscription/
│   │   └── route.ts          # Subscription cancellation
│   ├── reactivate-subscription/
│   │   └── route.ts          # Subscription reactivation
│   └── webhooks/
│       └── route.ts          # Webhook event handling
├── hooks/
│   └── useStripe.ts          # React hook for Stripe operations
└── components/
    ├── dashboard/
    │   └── SubscriptionManagement.tsx  # Subscription UI
    └── pricing/
        └── PricingPlans.tsx  # Pricing page component
```

## API Endpoints

### POST /api/stripe/create-checkout-session

Creates a Stripe checkout session for subscription signup.

**Request Body:**
```json
{
  "tierSlug": "basic"
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/create-portal-session

Creates a customer portal session for billing management.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### POST /api/stripe/cancel-subscription

Cancels a subscription at the end of the billing period.

**Request Body:**
```json
{
  "subscriptionId": "sub_..."
}
```

### POST /api/stripe/reactivate-subscription

Reactivates a canceled subscription.

**Request Body:**
```json
{
  "subscriptionId": "sub_..."
}
```

### POST /api/stripe/webhooks

Handles Stripe webhook events for subscription updates.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  stripe_customer_id text UNIQUE,
  -- other fields...
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  tier_id uuid REFERENCES tiers(id),
  stripe_subscription_id text UNIQUE,
  status subscription_status,
  cancel_at_period_end boolean,
  current_period_start timestamptz,
  current_period_end timestamptz,
  -- other fields...
);
```

### Tiers Table
```sql
CREATE TABLE tiers (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  stripe_price_id text UNIQUE,
  name text,
  max_tokens integer,
  max_requests integer,
  -- other fields...
);
```

## Usage Examples

### Creating a Checkout Session

```typescript
import { useStripeCheckout } from '@/hooks/useStripe'

function UpgradeButton() {
  const { createCheckoutSession, isLoading } = useStripeCheckout()
  
  const handleUpgrade = () => {
    createCheckoutSession('basic')
  }
  
  return (
    <button onClick={handleUpgrade} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Upgrade to Basic'}
    </button>
  )
}
```

### Managing Subscriptions

```typescript
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement'

function DashboardPage({ user, subscription }) {
  return (
    <SubscriptionManagement 
      subscription={subscription}
      userId={user.id}
    />
  )
}
```

## Testing

### Test Cards

Use Stripe's test card numbers:
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

### Webhook Testing

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`
4. Use the webhook signing secret from the CLI output

## Security Considerations

1. **Environment Variables**: Never commit Stripe keys to version control
2. **Webhook Verification**: Always verify webhook signatures
3. **User Authorization**: Verify user ownership before subscription operations
4. **HTTPS**: Use HTTPS in production for all Stripe communications
5. **Error Handling**: Don't expose sensitive error details to clients

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check that `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
   - Ensure the raw request body is used for verification

2. **Customer Not Found**
   - Verify `stripe_customer_id` is properly stored in the database
   - Check that the customer exists in your Stripe dashboard

3. **Price ID Not Found**
   - Ensure `stripe_price_id` in the tiers table matches Stripe prices
   - Verify the price is active in your Stripe dashboard

### Debugging

Enable debug logging by setting:
```bash
DEBUG=stripe:*
```

## Production Deployment

1. Replace test keys with live keys
2. Update webhook endpoint URL
3. Configure customer portal settings
4. Set up monitoring for webhook failures
5. Implement proper error tracking

## Support

For Stripe-related issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- [Stripe Community](https://github.com/stripe)