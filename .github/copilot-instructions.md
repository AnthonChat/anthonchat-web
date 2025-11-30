# AnthonChat Web - AI Coding Instructions

## Project Overview

Next.js 15 (App Router) chat platform with Supabase Auth/DB, Stripe subscriptions, and n8n AI workflow integration. Users connect messaging platforms (Telegram/WhatsApp) to an AI assistant.

## Architecture

- **Frontend**: Next.js App Router with `[locale]` i18n routing via `next-intl`
- **Auth**: Supabase SSR with middleware session refresh (`src/middleware.ts`)
- **Database**: Supabase PostgreSQL with RLS, synced Stripe schema (`stripe.*` tables)
- **Payments**: Stripe with webhook-driven sync via Edge Functions
- **AI Logic**: External n8n workflows (not in this codebase)

## Critical Patterns

### Supabase Client Usage

```typescript
// Server Components/Actions - ALWAYS async
import { createClient } from "@/lib/db/server";
const supabase = await createClient();

// Client Components - sync
import { createClient } from "@/lib/db/client";
const supabase = createClient();

// Bypass RLS (admin operations only)
import { createServiceRoleClient } from "@/lib/db/server";
const supabase = createServiceRoleClient();
```

### Server Actions Location

All server actions use `"use server"` directive and live in:

- [src/lib/auth/actions.ts](src/lib/auth/actions.ts) - Auth flows (signup, login)
- [src/lib/auth/admin.ts](src/lib/auth/admin.ts) - Admin operations
- [src/app/[locale]/(auth)/actions.ts](<src/app/[locale]/(auth)/actions.ts>) - Auth-specific actions

### Component Organization

```
src/components/
├── ui/          # Radix primitives, use `cn()` from @/lib/utils
├── features/    # Domain components (auth/, channels/, subscription/)
├── common/      # Shared non-generic components
└── admin/       # Admin-only components
```

### Route Groups

- `(marketing)` - Public pages with navbar/footer
- `(auth)` - Login/signup with centered layout
- `(app)` - Protected dashboard (requires auth)
- `(admin)` - Admin interface

## Internationalization

- Locales: `en` (default), `it` - defined in [src/i18n/routing.ts](src/i18n/routing.ts)
- Translation files: `src/locales/{en,it}.json`
- Use `useTranslations('Namespace')` in client components
- Use `await getTranslations('Namespace')` in server components

## Database Schemas

Two schemas accessed via Supabase client:

```typescript
// Public schema (default)
supabase.from("users");

// Stripe schema (synced from Stripe)
supabase.schema("stripe").from("subscriptions");
```

Key tables: `users`, `user_channels`, `channel_verifications`, `tiers_features`
Stripe tables: `stripe.customers`, `stripe.subscriptions`, `stripe.products`, `stripe.prices`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY              # Service role key
STRIPE_SECRET_KEY
DEFAULT_TRIAL_PRICE_ID           # Auto-creates trial subscription on signup
```

## Commands

```bash
bun dev           # Start dev server (auto-kills existing)
bun run build     # Production build
bun run full-check  # lint + typecheck + build + knip (dead code)
bun run n8n:export  # Export n8n workflows
```

## Key Conventions

1. **Path aliases**: Use `@/` for imports from `src/`
2. **Styling**: Tailwind CSS with `cn()` utility for conditional classes
3. **Forms**: Use React 19 `useActionState` with server actions
4. **Queries**: Centralize in `src/lib/queries/` - e.g., `getUserSubscription()`
5. **Types**: Database types in `src/lib/db/schemas/` (public.ts, stripe.ts)
6. **Error handling**: Return `FormState` objects from actions, never throw to client

## Testing Considerations

- No test framework configured; rely on TypeScript strict mode and `bun run full-check`
- Knip detects unused exports - run before PRs

## Channel Linking Flow

Users connect Telegram/WhatsApp to their web account via a verification nonce:

1. **Web generates nonce**: User clicks "Connect Telegram" → API creates row in `channel_verifications` with `nonce` + `expires_at`
2. **User sends code to bot**: `/link ABC123` in Telegram/WhatsApp
3. **n8n validates & links**: Workflow checks `channel_verifications`, creates `user_channels` row, deletes verification
4. **Conflict handling**: If platform ID already linked to another user, returns error

Key tables:

- `channel_verifications` - Temporary nonces (auto-expire)
- `user_channels` - Permanent links (user_id ↔ platform ID)

API routes for linking: `src/app/api/link/{generate,validate,status}/`

## Stripe Sync Architecture

**Two-tier sync system:**

1. **Edge Function (`stripe-sync`)**: Supabase Edge Function syncs Stripe objects → `stripe.*` tables via Stripe webhooks
2. **Next.js Webhook (`/api/stripe/webhooks`)**: Handles business logic after sync (subscription status → tier assignment)

**Flow:**

```
Stripe Event → Edge Function → stripe.subscriptions updated
                            ↘ Next.js webhook → public.subscriptions upserted with tier_id
```

Stripe schema tables are **read-only mirrors** - never write directly. The `stripe.subscriptions.items` field is JSON-packed (not normalized).

Access pattern:

```typescript
// Read Stripe data
supabase.schema("stripe").from("subscriptions");

// Write business data
supabase.from("subscriptions"); // public schema
```

## n8n Integration

External n8n workflows handle all AI/bot logic. The web app connects via:

1. **Database**: n8n reads/writes directly to Supabase (user context, messages, memories)
2. **Webhooks**: Telegram/WhatsApp → n8n triggers → AI processing → response
3. **Stored Procedures**: `get_user_context_last_session`, `get_user_activity` for context retrieval

The web app does NOT call n8n APIs directly. Shared data flows through Supabase:

- `user_channels` - Bot identifies users
- `tiers_features` - Rate limits enforced by n8n
- `channel_verifications` - Linking nonces consumed by n8n

Workflow files in `n8n/` are exported for version control (`bun run n8n:export`).
