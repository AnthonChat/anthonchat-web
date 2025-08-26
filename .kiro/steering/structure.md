# Project Structure

## Root Directory
- `src/` - Main application source code
- `supabase/` - Unused (Supabase instance is hosted on Supabase cloud)
- `public/` - Static assets (SVG icons)
- `scripts/` - Utility scripts (backfill, stripe sync)

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
```
app/
├── [locale]/                    # Internationalized routes
│   ├── (app)/                  # Authenticated app routes
│   │   └── dashboard/          # Dashboard pages
│   ├── (auth)/                # Authentication routes
│   ├── (marketing)/            # Public marketing pages
└── api/                        # API routes
    ├── auth/                   # Authentication endpoints
    ├── channels/               # Channel management
    ├── link/                   # Link generation/validation
    ├── stripe/                 # Payment webhooks
    └── user/                   # User management
```

### Components (`src/components/`)
- `ui/` - Reusable UI components (shadcn/ui)
- `features/` - Feature-specific components organized by domain:
  - `accessibility/` - Accessibility features
  - `auth/` - Authentication components
  - `channels/` - Channel management
  - `dashboard/` - Dashboard components
  - `i18n/` - Internationalization
  - `subscription/` - Subscription management
  - `ui-controls/` - Global UI controls

### Library Code (`src/lib/`)
- `auth/` - Authentication utilities
- `db/` - Database client and schemas
- `i18n/` - Internationalization utilities
- `notifications/` - Notification system
- `queries/` - Database queries
- `types/` - TypeScript type definitions

### Other Directories
- `src/hooks/` - Custom React hooks
- `src/locales/` - Translation files (en.json, it.json)
- `src/utils/` - Utility functions
- `src/i18n/` - i18n routing configuration

## Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Folders**: kebab-case for feature folders, camelCase for utilities
- **Components**: PascalCase with descriptive names
- **Routes**: Follow Next.js App Router conventions with route groups

## Import Aliases
- `@/*` - Maps to `src/*`
- `@/components` - UI components
- `@/lib` - Library utilities
- `@/hooks` - Custom hooks

## Route Groups
- `(app)` - Protected dashboard routes
- `(auth)` - Authentication pages
- `(marketing)` - Public marketing pages