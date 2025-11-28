# Refactor Plan: Stateless Stripe Integration

## Objective

Migrate from a complex "Stripe Sync" architecture (mirroring Stripe data to `stripe.*` tables) to a "Stateless" approach where subscription status is cached directly on the `public.users` table. This improves Developer Experience (DX), reduces database complexity, and eliminates state drift issues.

## Current State Analysis

-   **Database**:
    -   `stripe` schema: Contains mirrored tables (`customers`, `subscriptions`, `products`, `prices`, `invoices`) managed by the `stripe-sync` Edge Function.
    -   `public.users`: Has `stripe_customer_id`.
    -   `public.subscriptions`: Appears to be a custom table updated by `src/app/api/stripe/webhooks/route.ts`, but the app reads from `stripe.subscriptions`.
    -   `public.tiers_features`: Linked to `stripe.products.id`.
-   **Code**:
    -   `src/lib/queries/subscription.ts`: Fetches subscription data by joining `stripe.subscriptions`, `stripe.products`, and `public.tiers_features`.
    -   `src/app/api/stripe/webhooks/route.ts`: Handles webhooks and upserts to `public.subscriptions` (redundant/confusing).
    -   `src/lib/stripe.ts`: Contains complex logic for checking invoices and coupons using the `stripe` schema.

## Proposed Architecture (Stateless)

### 1. Database Schema Changes

We will move the "Source of Truth" for access control to `public.users`.

**Modify `public.users`:**
Add the following columns:

-   `subscription_id` (text, nullable): The active Stripe Subscription ID.
-   `subscription_status` (text, default 'inactive'): 'active', 'trialing', 'past_due', 'canceled', 'incomplete'.
-   `subscription_price_id` (text, nullable): The ID of the price/plan the user is on.
-   `current_period_end` (timestamptz, nullable): When access should expire.
-   `cancel_at_period_end` (boolean, default false).

**Modify `public.tiers_features`:**

-   Remove Foreign Key constraint to `stripe.products.id`.
-   Use Stripe Product ID (string) as the primary key, but treat it as a static configuration table.

**Drop Tables (Post-Migration):**

-   Drop `stripe` schema and all its tables.
-   Drop `public.subscriptions`.

### 2. Code Refactoring

#### A. Webhook Handler (`src/app/api/stripe/webhooks/route.ts`)

Simplify to handle only critical events:

-   `customer.subscription.created` / `updated` / `deleted`:
    -   Update `public.users` with `status`, `price_id`, `current_period_end`, etc.
-   `checkout.session.completed`:
    -   Ensure `stripe_customer_id` is set on the user.

#### B. Subscription Queries (`src/lib/queries/subscription.ts`)

-   **`getUserSubscription(userId)`**:
    -   Fetch directly from `public.users`.
    -   Join `public.tiers_features` on `users.subscription_price_id` (or map price ID to product ID first).
    -   **Return Type**: Simplify `UserSubscription` type to match the new flat structure.

#### C. Frontend Hooks (`src/hooks/use-user-subscription.ts`)

-   The hook currently fetches from `/api/user/subscription`.
-   Update the API route to return the simplified data from `public.users`.

#### D. Stripe Logic (`src/lib/stripe.ts`)

-   Remove `customerHasAnyInvoice`, `customerHasInvoiceForPrice`, `hasCustomerRedeemedCoupon` (or refactor to use Stripe API directly if absolutely needed, but prefer removing complex checks).
-   **Coupon Logic**: If checking for "First Purchase" coupon is critical, store a boolean flag `has_used_first_purchase_coupon` on `public.users` instead of scanning invoices.

### 3. Migration Strategy

**Phase 1: Preparation**

1.  Create the new columns in `public.users`.
2.  Create a migration script (SQL) to backfill data from `stripe.subscriptions` to `public.users`.

**Phase 2: Code Switch**

1.  Update the Webhook Handler to write to `public.users`.
2.  Update `getUserSubscription` to read from `public.users`.
3.  Deploy.

**Phase 3: Cleanup**

1.  Verify data consistency.
2.  Disable `stripe-sync` Edge Function.
3.  Drop `stripe` schema and `public.subscriptions`.

## Detailed Steps

### Step 1: Database Migration (SQL)

```sql
-- 1. Add columns
ALTER TABLE public.users
ADD COLUMN subscription_id text,
ADD COLUMN subscription_status text DEFAULT 'inactive',
ADD COLUMN subscription_price_id text,
ADD COLUMN current_period_end timestamp with time zone,
ADD COLUMN cancel_at_period_end boolean DEFAULT false;

-- 2. Backfill from existing synced data
UPDATE public.users u
SET
    subscription_id = s.id,
    subscription_status = s.status,
    subscription_price_id = (s.items->'data'->0->'price'->>'id'), -- Extract price ID from JSON
    current_period_end = to_timestamp(s.current_period_end),
    cancel_at_period_end = s.cancel_at_period_end
FROM stripe.subscriptions s
WHERE u.stripe_customer_id = s.customer
AND s.status IN ('active', 'trialing');
```

### Step 2: Update Webhook

Refactor `src/app/api/stripe/webhooks/route.ts` to execute a direct update on `public.users`:

```typescript
// Pseudo-code
const { error } = await supabase
	.from("users")
	.update({
		subscription_status: subscription.status,
		subscription_price_id: subscription.items.data[0].price.id,
		current_period_end: new Date(subscription.current_period_end * 1000),
		// ...
	})
	.eq("stripe_customer_id", subscription.customer);
```

### Step 3: Update Queries

Refactor `src/lib/queries/subscription.ts` to remove `stripe` schema dependencies.

### Step 4: Verify & Cleanup

-   Check that the app works (Dashboard shows correct tier).
-   Cancel the `stripe-sync` function.
