# AnthonChat Web - Subscription Website Implementation Plan

## 📋 Project Overview

### Current System Analysis
**Database Schema:** Complete PostgreSQL schema with all necessary tables:
- `users` - User profiles linked to Supabase Auth
- `channels` - Communication channels (WhatsApp, Telegram)
- `tiers` - Subscription tier definitions
- `subscriptions` - User subscription management with Stripe integration
- `user_channels` - User-to-channel mappings
- `user_memories` - Conversational context storage
- `chat_messages` - Message buffering

**N8N Workflow:** Sophisticated AI chatbot system with:
- Multi-channel support (WhatsApp, Telegram)
- Subscription-based rate limiting
- Tier-based AI model selection (Trial, Basic, Standard, Pro, Plus)
- User profiling and memory management
- Stripe subscription validation

**Current Next.js Setup:**
- Next.js 15 with TypeScript
- Stripe dependencies installed
- Supabase environment configured
- Basic login components exist
- Shadcn/ui components partially set up

### Project Goals
1. **Primary:** Create a subscription website that enables channel connections and subscription management
2. **Core Product:** The n8n AI workflow is the main product
3. **User Flow:** Onboarding → Channel Connection → Subscription Management → AI Chat Usage

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** Next.js 15 with TypeScript
- **UI Library:** Shadcn/ui components
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe

### Database Integration
- **Supabase Client:** Browser and server-side clients
- **Row Level Security:** Already implemented for all tables
- **Real-time:** Subscription for usage updates
- **Type Safety:** Generated TypeScript types from schema

### Key Technical Decisions
- **Admin-managed channels:** You handle backend channel setup, users provide identifiers
- **Trial complexity:** Time + usage limits (implementation flexible for future changes)
- **Mandatory onboarding:** ALL required channels must be connected
- **Pricing flexibility:** Placeholder display until pricing is defined

---

## 🚀 Implementation Phases

### Phase 1: Supabase Integration & Authentication ⚡ (Priority)

**Objectives:**
- Set up proper Supabase client configuration
- Enhance existing authentication system
- Implement protected routes

**Technical Tasks:**
1. **Supabase Client Setup:**
   ```typescript
   // lib/supabase/browser.ts - Browser client
   // lib/supabase/server.ts - Server client  
   // lib/supabase/middleware.ts - Auth middleware
   // lib/supabase/types.ts - Generated database types
   ```

2. **Authentication Enhancement:**
   - Complete sign up/sign in pages (build on existing)
   - Email verification flow
   - Password reset functionality
   - Auto-create trial subscription on signup
   - Protected route middleware

3. **Database Integration:**
   - Type-safe database queries
   - User profile management
   - Session handling

**Deliverables:**
- Working authentication system
- Protected dashboard access
- Trial subscription auto-creation
- Type-safe database operations

### Phase 2: Onboarding Flow with Mandatory Channel Connection ⚡ (Priority)

**Objectives:**
- Create onboarding process
- Enforce ALL mandatory channels connection
- Smooth user experience with clear progress

**User Journey:**
```
Step 1: Account Creation (email/password)
Step 2: Profile Setup (name, basic info)
Step 3: Channel Connection (ALL mandatory channels required)
Step 4: Welcome & Dashboard
```

**Channel Connection Requirements:**
- **WhatsApp:** Phone number input with international format validation
- **Telegram:** TBD (placeholder UI ready for future implementation)
- **Validation:** Cannot proceed without ALL mandatory channels connected
- **Admin Backend:** You manually configure the technical connections

### Phase 3: Dashboard & Subscription Management ⚡ (Priority)

**Objectives:**
- Create main user dashboard
- Display subscription status and usage
- Provide subscription management interface

**Dashboard Features:**
1. **Subscription Status:**
   - Current tier display (Trial, Basic, Standard, Pro, Plus)
   - Trial time remaining and usage limits
   - Usage progress bars (tokens, messages)
   - Upgrade prompts and CTAs

2. **Connected Channels Overview:**
   - List of connected channels with status
   - Connection health indicators
   - Quick actions (test, reconnect)

3. **Usage Analytics:**
   - Real-time usage statistics
   - Historical usage charts
   - Per-channel usage breakdown
   - Limit warnings and notifications

**Technical Implementation:**
1. **Dashboard Components:**
   ```typescript
   // app/dashboard/page.tsx
   // components/dashboard/SubscriptionCard.tsx
   // components/dashboard/UsageStats.tsx
   // components/dashboard/ChannelsList.tsx
   // components/dashboard/QuickActions.tsx
   ```

2. **Data Fetching:**
   ```typescript
   // lib/queries/subscription.ts
   // lib/queries/usage.ts
   // lib/queries/channels.ts
   ```

3. **Real-time Updates:**
   - Supabase subscriptions for usage updates
   - Live usage counters
   - Subscription status changes

**Deliverables:**
- Comprehensive user dashboard
- Real-time usage tracking
- Subscription status display
- Channel management interface

### Phase 4: Channel Management System

**Objectives:**
- Provide interface for managing connected channels
- Support adding new channels (future expansion)
- Handle channel status and health monitoring

**Features:**
1. **Channel List Management:**
   - View all connected channels
   - Channel status indicators (Connected, Pending, Error)
   - Connection timestamps and activity
   - Edit/remove channel connections

2. **Add New Channels:**
   - Same interface as onboarding but optional
   - Support for future channel types
   - Admin approval workflow if needed
   - Connection testing and validation

3. **Channel Health Monitoring:**
   - Connection status checks
   - Last activity timestamps
   - Error reporting and troubleshooting
   - Reconnection flows

**Technical Implementation:**
1. **Channel Management Components:**
   ```typescript
   // app/dashboard/channels/page.tsx
   // components/channels/ChannelCard.tsx
   // components/channels/AddChannelDialog.tsx
   // components/channels/ChannelStatus.tsx
   ```

2. **Channel Operations:**
   ```typescript
   // lib/channels/operations.ts
   // lib/channels/validation.ts
   // lib/channels/status.ts
   ```

**Deliverables:**
- Channel management interface
- Add/remove channel functionality
- Status monitoring and health checks
- Future channel type support

### Phase 5: Subscription & Usage Tracking

**Objectives:**
- Implement comprehensive usage tracking
- Handle complex trial logic
- Provide subscription upgrade/downgrade flows

**Features:**
1. **Advanced Usage Analytics:**
   - Detailed usage breakdowns
   - Historical trends and patterns
   - Export capabilities
   - Usage predictions and recommendations

2. **Trial Management:**
   - Complex trial logic (time + usage limits)
   - Trial expiration warnings
   - Upgrade prompts and flows
   - Trial extension capabilities

3. **Subscription Operations:**
   - Upgrade/downgrade flows
   - Billing history
   - Payment method management
   - Subscription cancellation

**Technical Implementation:**
1. **Usage Tracking:**
   ```typescript
   // lib/analytics/usage.ts
   // lib/analytics/calculations.ts
   // lib/analytics/exports.ts
   ```

2. **Subscription Management:**
   ```typescript
   // lib/stripe/subscriptions.ts
   // lib/stripe/webhooks.ts
   // lib/stripe/billing.ts
   ```

**Deliverables:**
- Advanced usage analytics
- Trial management system
- Subscription operation flows
- Billing integration

---

## 🎯 Onboarding Flow Specification

### Complete User Journey

#### Step 1: Account Creation
- **Input:** Email, password, confirm password
- **Validation:** Email format, password strength, uniqueness
- **Action:** Create Supabase Auth user
- **Result:** Email verification sent, user created in `users` table

#### Step 2: Profile Setup
- **Input:** First name, last name, optional profile info
- **Validation:** Required fields, character limits
- **Action:** Update user profile
- **Result:** User profile completed

#### Step 3: Channel Connection (CRITICAL)
- **Requirement:** ALL mandatory channels must be connected
- **WhatsApp Connection:**
  - Input: Phone number with international format
  - Validation: Format validation, uniqueness check
  - Process: Store in `user_channels` table with status "pending"
  - Admin Action: You manually configure WhatsApp Business API
  - Status Update: "pending" → "connected"

- **Telegram Connection (Future):**
  - Placeholder UI ready for implementation
  - Input method TBD (username, bot interaction, etc.)
  - Same validation and status flow as WhatsApp

- **Validation Logic:**
  ```typescript
  const mandatoryChannels = ['whatsapp', 'telegram']; // from channels table
  const userConnectedChannels = user.channels.map(c => c.channel_code);
  const canProceed = mandatoryChannels.every(channel => 
    userConnectedChannels.includes(channel)
  );
  ```

- **UI Requirements:**
  - Progress checklist for each mandatory channel
  - Individual status indicators (Pending, Connected, Error)
  - Disabled "Continue" button until ALL channels connected
  - Clear error messages and retry options
  - Help text and connection instructions

#### Step 4: Welcome & Dashboard
- **Action:** Create trial subscription automatically
- **Display:** Welcome message, dashboard tour, next steps
- **Result:** User ready to use the AI chat system

### Technical Requirements

**Database Operations:**
```sql
-- Check mandatory channels
SELECT c.code, c.name, c.is_active
FROM channels c
WHERE c.is_active = true;

-- Check user's connected channels
SELECT uc.*, c.code, c.name
FROM user_channels uc
JOIN channels c ON c.id = uc.channel_id
WHERE uc.user_id = $1;

-- Validate onboarding completion
SELECT 
  COUNT(*) as mandatory_count,
  COUNT(uc.id) as connected_count
FROM channels c
LEFT JOIN user_channels uc ON c.id = uc.channel_id AND uc.user_id = $1
WHERE c.is_active = true;
```

**Component Structure:**
```typescript
// Onboarding wizard with step management
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
  validation: () => Promise<boolean>;
  canSkip: boolean;
}

// Channel connection validation
interface ChannelConnection {
  channelId: string;
  channelCode: string;
  name: string;
  required: boolean;
  userInput: string;
  status: 'pending' | 'connected' | 'error';
  errorMessage?: string;
}
```

---

## 📱 Channel Management System

### WhatsApp Integration
**User Experience:**
- Input: Phone number with country code selector
- Validation: International format, uniqueness
- Process: Store phone number as `channel_user_id`
- Admin Backend: You configure WhatsApp Business API connection
- Status: User sees "Pending Activation" → "Connected"

**Technical Implementation:**
```typescript
// WhatsApp phone number validation
const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Store connection
const connectWhatsApp = async (userId: string, phoneNumber: string) => {
  const { data, error } = await supabase
    .from('user_channels')
    .insert({
      user_id: userId,
      channel_id: whatsappChannelId,
      channel_user_id: phoneNumber
    });
};
```

### Telegram Integration (Future)
**Placeholder Implementation:**
- UI components ready for any connection method
- Database structure supports any `channel_user_id` format
- Admin backend flexibility for future requirements

**Possible Connection Methods:**
- Username input
- Bot interaction flow
- Token-based connection
- QR code scanning

### Admin-Managed Backend
**Your Responsibilities:**
- Configure WhatsApp Business API with user's phone number
- Set up Telegram bot connections (when defined)
- Update connection status in database
- Monitor connection health
- Handle connection errors and troubleshooting

**System Support:**
- Clear admin interface for managing connections
- Bulk operations for multiple users
- Connection status monitoring
- Error reporting and logging

---

## 💰 Subscription & Pricing Strategy

### Current Tier Structure
Based on n8n workflow analysis:
- **Trial:** Limited time + usage, auto-assigned on signup
- **Basic:** Entry-level paid tier
- **Standard:** Mid-tier with enhanced features
- **Pro:** Advanced tier with premium AI models
- **Plus:** Top-tier with maximum capabilities

### Pricing Display Strategy
**Current Approach:**
- Display tier structure without specific prices
- Use placeholders: "Pricing TBD" or "Contact Us"
- Highlight trial benefits and limitations
- Feature comparison table showing tier differences
- Easy update mechanism when pricing is defined

**Implementation:**
```typescript
// Flexible pricing display
interface TierPricing {
  tierId: string;
  price?: number;
  currency?: string;
  interval?: 'month' | 'year';
  displayPrice?: string; // "TBD", "Contact Us", etc.
}

// Component handles both real and placeholder pricing
const PricingCard = ({ tier, pricing }: { tier: Tier, pricing?: TierPricing }) => {
  const displayPrice = pricing?.price 
    ? `$${pricing.price}/${pricing.interval}`
    : pricing?.displayPrice || "Pricing TBD";
};
```

### Trial System Complexity
**Current Understanding:**
- Complex logic combining time and usage limits
- Handled in n8n workflow with rate limiting
- Future flexibility needed for trial rule changes

**Website Integration:**
- Display trial status and remaining limits
- Progress bars for usage tracking
- Time countdown for trial expiration
- Upgrade prompts when limits approached
- Flexible trial extension capabilities

### Stripe Integration Roadmap
**Phase 1:** Basic subscription display and status
**Phase 2:** Stripe Checkout integration for upgrades
**Phase 3:** Webhook handling for subscription events
**Phase 4:** Advanced billing features (prorations, etc.)

---

## 🎨 Shadcn/UI Component Strategy

### Component Categories

#### Authentication & Onboarding
- **Form** components for sign up/sign in
- **Input** with validation states
- **Button** variants for CTAs
- **Card** layouts for step containers
- **Progress** stepper for onboarding flow
- **Alert** for validation messages

#### Dashboard & Analytics
- **Card** for metric displays
- **Progress** bars for usage limits
- **Badge** for status indicators
- **Table** for usage history
- **Chart** components for analytics
- **Tabs** for dashboard sections

#### Channel Management
- **Dialog** for adding channels
- **Select** for channel types
- **Input** with formatting (phone numbers)
- **Switch** for channel toggles
- **Status** indicators with icons
- **Tooltip** for help text

#### Subscription & Billing
- **Card** for pricing tiers
- **Button** for upgrade CTAs
- **Table** for billing history
- **Alert** for trial warnings
- **Modal** for subscription changes
- **Form** for payment methods

### Design System
**Color Scheme:** Professional with clear status colors
**Typography:** Clean, readable hierarchy
**Spacing:** Consistent padding and margins
**Responsive:** Mobile-first approach
**Accessibility:** WCAG 2.1 AA compliance

---

## 🔧 Development Guidelines

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Protected dashboard
│   ├── onboarding/        # Onboarding flow
│   └── pricing/           # Pricing page
├── components/            # Reusable components
│   ├── ui/               # Shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── onboarding/       # Onboarding components
│   └── channels/         # Channel management
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase clients and types
│   ├── stripe/           # Stripe integration
│   ├── queries/          # Database queries
│   └── utils/            # Helper functions
└── types/                # TypeScript type definitions
```

### Code Standards
- **TypeScript:** Strict mode enabled
- **ESLint:** Next.js recommended + custom rules
- **Prettier:** Consistent code formatting
- **Husky:** Pre-commit hooks for quality
- **Testing:** Jest + React Testing Library

### Database Query Patterns
```typescript
// Type-safe queries with Supabase
const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      tiers (
        slug,
        name,
        max_tokens,
        max_requests
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
    
  if (error) throw error;
  return data;
};
```

### Component Patterns
```typescript
// Consistent component structure
interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = ({ ...props }) => {
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
};
```

---

## 🚀 Future Considerations

### Scalability for New Channels
**Architecture Support:**
- Dynamic channel loading from database
- Flexible connection input types
- Extensible validation system
- Plugin-like channel modules

**Implementation Ready:**
- Channel type registry
- Dynamic form generation
- Configurable validation rules
- Admin interface for channel management

### Pricing Model Flexibility
**Current Design:**
- Database-driven tier definitions
- Flexible pricing display system
- Easy Stripe integration when ready
- A/B testing capability for pricing

**Future Enhancements:**
- Usage-based pricing models
- Custom enterprise tiers
- Promotional pricing
- Geographic pricing variations

### Feature Expansion Roadmap
**Phase 1 Extensions:**
- Advanced analytics dashboard
- Team/organization accounts
- API access for integrations
- White-label solutions

**Phase 2 Extensions:**
- Multi-language support
- Advanced AI model selection
- Custom workflow creation
- Enterprise SSO integration

### Performance Optimization
**Database:**
- Query optimization and indexing
- Connection pooling
- Read replicas for analytics
- Caching strategies

**Frontend:**
- Code splitting and lazy loading
- Image optimization
- CDN integration
- Progressive Web App features

---

## ✅ Success Metrics

### Technical Metrics
- **Authentication:** 99%+ success rate for sign up/sign in
- **Onboarding:** 90%+ completion rate for mandatory channels
- **Performance:** <2s page load times
- **Uptime:** 99.9% availability

### Business Metrics
- **Trial Conversion:** Track trial-to-paid conversion rates
- **Channel Adoption:** Monitor which channels users prefer
- **Usage Patterns:** Analyze token/message usage trends
- **Support Tickets:** Minimize channel connection issues

### User Experience Metrics
- **Onboarding Time:** Average time to complete setup
- **Error Rates:** Channel connection failure rates
- **User Satisfaction:** Feedback scores and reviews
- **Feature Adoption:** Usage of dashboard features

---

## 📋 Implementation Checklist

### Phase 1: Foundation ⚡
- [ ] Supabase client configuration
- [ ] TypeScript types generation
- [ ] Authentication enhancement
- [ ] Protected routes middleware
- [ ] Trial subscription auto-creation

### Phase 2: Onboarding ⚡
- [ ] Multi-step onboarding wizard
- [ ] WhatsApp phone number collection
- [ ] Telegram placeholder UI
- [ ] Mandatory channel validation
- [ ] Progress tracking and completion

### Phase 3: Dashboard ⚡
- [ ] Main dashboard layout
- [ ] Subscription status display
- [ ] Usage analytics and progress bars
- [ ] Connected channels overview
- [ ] Quick actions and navigation

### Phase 4: Channel Management
- [ ] Channel list interface
- [ ] Add/remove channel flows
- [ ] Status monitoring and health checks
- [ ] Connection testing and validation
- [ ] Error handling and recovery

### Phase 5: Advanced Features
- [ ] Detailed usage analytics
- [ ] Trial management system
- [ ] Subscription upgrade flows
- [ ] Billing integration
- [ ] Admin interface

---

## 🎯 Next Steps

1. **Immediate:** Set up Supabase integration and enhance authentication
2. **Priority:** Implement onboarding flow with mandatory channel connections
3. **Core:** Build dashboard with subscription and usage display
4. **Enhancement:** Add channel management and advanced features
5. **Future:** Expand with new channels and pricing models

This plan provides a comprehensive roadmap for creating a subscription website that seamlessly integrates with your existing AI chatbot system while providing users with a smooth onboarding experience and powerful management capabilities.
