# Components Documentation

The `src/components` directory is organized into several subdirectories to maintain a clean and scalable architecture.

## Directory Structure

### `ui`
Contains low-level, reusable UI components. These are often wrappers around Radix UI primitives or simple styled elements.
- Examples: Buttons, Inputs, Dialogs, Dropdowns.
- **Libraries**: Radix UI, Tailwind CSS, class-variance-authority (cva).

### `layout`
Contains components related to the overall page layout.
- Examples: Navbar, Sidebar, Footer, Page wrappers.

### `features`
Contains domain-specific components grouped by feature. These components often contain business logic and interact with data.
- Examples: Chat interface, User profile, Subscription management.

### `common`
Contains shared components that are used across multiple features but are not generic enough to be in `ui`.
- Examples: Loading spinners, Error states, Generic cards.

### `admin`
Contains components specific to the admin dashboard.
- Examples: User management tables, Analytics charts.

## Key Libraries

- **Radix UI**: Used for accessible, unstyled primitives.
- **Lucide React**: Used for icons.
- **Framer Motion**: Used for animations and transitions.
- **Recharts**: Used for data visualization (charts).
- **Sonner**: Used for toast notifications.
