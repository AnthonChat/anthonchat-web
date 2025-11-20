# Website Structure

This document outlines the structure of the Next.js App Router implementation in `src/app`.

## Overview

The application uses Next.js App Router with Internationalization (i18n) routing. All visible pages are wrapped in a `[locale]` dynamic segment.

## Route Groups

Route groups are used to organize the application into logical sections without affecting the URL structure.

### `(marketing)`
Public-facing pages with a shared marketing layout.
- `/`: Landing page (`page.tsx`)
- `/features`: Features page
- `/pricing`: Pricing page
- `/privacy`: Privacy policy

### `(auth)`
Authentication-related pages.
- `/login`: Sign in page
- `/signup`: Registration page
- `/forgot-password`: Password recovery
- `/reset-password`: Password reset

### `(app)`
The main authenticated user application.
- `/dashboard`: User dashboard

### `(admin)`
Administrative interface.
- `/admin`: Admin dashboard

## API Routes

API routes are located in `src/app/api` and handle backend logic.

### Auth & User
- `/api/auth/signout`: Handle user signout
- `/api/user/subscription`: Manage user subscription details

### Admin
- `/api/admin/users`: User management
- `/api/admin/templates`: Template management

### Channels & Links
- `/api/channels/[channelId]`: Channel operations
- `/api/link/generate`: Generate new links
- `/api/link/generate-registration`: Generate registration links
- `/api/link/status`: Check link status
- `/api/link/validate`: Validate links

### Stripe Integration
- `/api/stripe/checkout`: Create checkout sessions
- `/api/stripe/billing-portal`: Create customer portal sessions
- `/api/stripe/webhooks`: Handle Stripe webhooks

## Layout Hierarchy

1. **Root Layout** (`src/app/layout.tsx`): Global providers and HTML structure.
2. **Locale Layout** (`src/app/[locale]/layout.tsx`): Handles i18n context.
3. **Group Layouts**:
    - `(marketing)/layout.tsx`: Navbar and Footer for public pages.
    - `(auth)/layout.tsx`: Centered layout for auth forms.
    - `(app)/layout.tsx`: Dashboard layout (sidebar, header).
