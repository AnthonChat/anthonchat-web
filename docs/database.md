# Supabase Database Documentation

## Tables

### public.channels
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `is_active` (boolean)
    - `created_at` (timestamp with time zone)
    - `link_method` (USER-DEFINED)

### public.tiers_features
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key, Foreign Key -> stripe.products.id
    - `history_limit` (integer)
    - `tokens_limit` (integer)
    - `requests_limit` (integer)

### public.users
- **RLS Enabled**: true
- **Columns**:
    - `id` (uuid): Primary Key
    - `email` (text): Unique
    - `nickname` (text)
    - `first_name` (text)
    - `last_name` (text)
    - `stripe_customer_id` (text): Unique
    - `created_at` (timestamp with time zone)

### public.admins
- **RLS Enabled**: true
- **Columns**:
    - `id` (uuid): Primary Key, Foreign Key -> public.users.id
    - `created_at` (timestamp with time zone)

### public.user_vocal_stats
- **RLS Enabled**: false
- **Columns**:
    - `user_id` (uuid): Primary Key, Foreign Key -> public.users.id
    - `last_vocal_ts` (timestamp with time zone)
    - `vocal_7d` (integer)
    - `vocal_30d` (integer)
    - `updated_at` (timestamp with time zone)

### public.sent_subscription_notifications
- **RLS Enabled**: false
- **Columns**:
    - `user_id` (uuid): Primary Key
    - `event_type` (text): Primary Key
    - `event_key` (text): Primary Key
    - `sent_at` (timestamp with time zone)

## Extensions

- **pg_stat_statements**: track planning and execution statistics of all SQL statements executed
- **pg_cron**: Job scheduler for PostgreSQL
- **vector**: vector data type and ivfflat and hnsw access methods

## Edge Functions

- **stripe-sync**:
    - Status: ACTIVE
    - Version: 15
    - Created At: 1752711157481
- **stripe-webhook**:
    - Status: ACTIVE
    - Version: 19
    - Created At: 1752800174756

## Stripe Schema

> [!NOTE]
> The Stripe schema is managed by the `stripe-sync` edge function. Some data is currently packed into JSON columns instead of being normalized. This is a known issue with the current version of the sync engine.

### stripe.products
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `active` (boolean)
    - `name` (text)
    - `description` (text)
    - `metadata` (jsonb): Contains product metadata (e.g., `slug`).
    - `images` (jsonb): JSON array of image URLs.
    - `default_price` (text): Foreign Key -> stripe.prices.id

### stripe.prices
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `product` (text): Foreign Key -> stripe.products.id
    - `active` (boolean)
    - `currency` (text)
    - `unit_amount` (integer)
    - `type` (text)
    - `interval` (text)
    - `interval_count` (integer)

### stripe.customers
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `email` (text)
    - `name` (text)
    - `metadata` (jsonb)
    - `invoice_settings` (jsonb): JSON object containing default payment method and other settings.

### stripe.subscriptions
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `customer` (text): Foreign Key -> stripe.customers.id
    - `status` (text)
    - `current_period_start` (integer)
    - `current_period_end` (integer)
    - `cancel_at_period_end` (boolean)
    - `items` (jsonb): **JSON Packed**. Contains the list of subscription items and their details.
    - `plan` (jsonb): **JSON Packed**. Contains the full plan object.
    - `metadata` (jsonb)

### stripe.invoices
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `customer` (text): Foreign Key -> stripe.customers.id
    - `subscription` (text): Foreign Key -> stripe.subscriptions.id
    - `status` (text)
    - `total` (integer)
    - `currency` (text)
    - `lines` (jsonb): **JSON Packed**. Contains invoice line items.

### stripe.charges
- **RLS Enabled**: true
- **Columns**:
    - `id` (text): Primary Key
    - `amount` (integer)
    - `currency` (text)
    - `customer` (text): Foreign Key -> stripe.customers.id
    - `payment_intent` (text)
    - `status` (text)
    - `payment_method_details` (jsonb): **JSON Packed**.
