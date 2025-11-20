# Anthonchat Web

## Overview
Anthonchat Web is a Next.js application built with Tailwind CSS, Supabase, and Stripe. It serves as the web interface for the Anthonchat platform.

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Internationalization**: [next-intl](https://next-intl-docs.vercel.app/)

## Getting Started

### Prerequisites
- Node.js
- npm or bun

### Installation
```bash
npm install
# or
bun install
```

### Running Development Server
```bash
npm run dev
# or
bun dev
```

## Project Structure

The project source code is located in the `src` directory:

- **`app`**: Next.js App Router pages and API routes.
- **`components`**: Reusable UI components (see [components.md](./components.md)).
- **`hooks`**: Custom React hooks.
- **`i18n`**: Internationalization configuration.
- **`lib`**: Utility libraries and configurations (e.g., Supabase client, Stripe).
- **`locales`**: Translation files.
- **`utils`**: General utility functions.
- **`middleware.ts`**: Next.js middleware for authentication and routing.

## Database
Database documentation can be found in [database.md](./database.md).
