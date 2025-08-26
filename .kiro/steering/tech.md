# Technology Stack

## Framework & Runtime
- **Next.js 15.3.5** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5.8.3** - Type safety
- **Node.js** - Runtime environment

## Styling & UI
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **shadcn/ui** - Component library (New York style)
- **Radix UI** - Headless UI components required by shadcn/ui
- **Lucide React** - Icon library required by shadcn/ui
- **Framer Motion** - Animations
- **next-themes** - Theme switching

## Backend & Database
- **Supabase** - Backend-as-a-Service (database, auth, real-time) - hosted on Supabase cloud
- **n8n** - Workflow automation managing the chat service and multi-channel integrations
- **Stripe** - Payment processing and subscription management
- **Server Actions** - Next.js server-side functions

## Internationalization
- **next-intl** - Internationalization framework
- Supported locales: English (en), Italian (it)
- Default locale: English

## Development Tools
- **ESLint** - Code linting
- **Bun** - Package manager (bun.lock present) and Runtime

## Common Commands

### Development
```bash
bun dev          # Start development server
bun run build        # Build for production
bun run lint
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase public key
- `NEXT_PUBLIC_SITE_URL` - Site URL for metadata
- Stripe keys for payment processing