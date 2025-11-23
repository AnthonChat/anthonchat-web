# Entity Lifecycle Documentation

This document describes the lifecycle of the core entities in the AnthonChat architecture and provides sequential diagrams for key workflows.

## Core Entities

### 1. User

The central entity representing a human interacting with the system.

-   **Creation**: Created via the web interface (sign-up) or implicitly via channel linking (if supported).
-   **States**:
    -   `Active`: Standard state.
    -   `Inactive`: Soft deleted or banned.
-   **Key Relationships**: Has many `UserChannels`, one `Subscription`.

### 2. User Channel

Represents a link between a `User` and a messaging platform (e.g., WhatsApp, Telegram).

-   **Creation**: Created when a user successfully links their messaging account using a verification code.
-   **States**:
    -   `Unverified`: Initial state during linking (stored in `channel_verifications`).
    -   `Verified`: Active link stored in `user_channels`.
-   **Key Data**: Stores the platform-specific ID (e.g., phone number, chat ID).

### 3. Channel Verification

A temporary entity used during the account linking process.

-   **Creation**: Generated when a user requests a link code on the web dashboard.
-   **Lifecycle**:
    -   Created with a `nonce` and `expires_at` timestamp.
    -   Consumed when the user sends the code to the bot.
    -   Deleted/Expired after use or timeout.

### 4. Subscription

Manages the user's access level and limits.

-   **Source of Truth**: Stripe (synced to `stripe.subscriptions` table).
-   **States**: `active`, `past_due`, `canceled`, `incomplete`.
-   **Impact**: Determines rate limits (messages per day) and feature access.

---

## Workflows & Diagrams

### 1. Account Linking Flow

This flow illustrates how a user connects their Telegram/WhatsApp account to their web dashboard.

```mermaid
sequenceDiagram
    actor User
    participant Web as Web Dashboard
    participant DB as Supabase
    participant Bot as Telegram/WhatsApp Bot
    participant n8n as n8n Workflow

    User->>Web: Clicks "Connect Telegram"
    Web->>DB: Create Channel Verification (nonce)
    DB-->>Web: Return Link Code (nonce)
    Web-->>User: Display Link Code (e.g., /link 123-456)

    User->>Bot: Sends "/link 123-456"
    Bot->>n8n: Trigger Webhook
    n8n->>DB: Check Verification (nonce)

    alt Nonce is Valid
        DB-->>n8n: Verification Details
        n8n->>DB: Create User Channel (Link User <-> Platform ID)
        n8n->>DB: Delete Verification
        n8n-->>Bot: Send "Account Linked Successfully"
        Bot-->>User: "Account Linked Successfully"
    else Nonce Invalid/Expired
        n8n-->>Bot: Send "Invalid Code"
        Bot-->>User: "Invalid Code"
    end
```

### 2. Message Processing Loop

The core loop for handling user messages, enforcing limits, and generating AI responses.

```mermaid
sequenceDiagram
    actor User
    participant Bot as Messaging Platform
    participant n8n as n8n Workflow
    participant DB as Supabase
    participant AI

    User->>Bot: Sends Message
    Bot->>n8n: Webhook (Message, UserID)

    n8n->>DB: Get User Context & Subscription
    DB-->>n8n: User Data (Tier, Usage, History)

    alt Usage Limit Exceeded
        n8n-->>Bot: Send "Daily Limit Reached"
        Bot-->>User: "Daily Limit Reached"
    else Usage Allowed
        n8n->>DB: Save User Message
        n8n->>AI: Generate Response (History + System Prompt)
        AI-->>n8n: AI Response
        n8n->>DB: Save AI Message
        n8n-->>Bot: Send AI Response
        Bot-->>User: AI Response
    end
```

### 3. Subscription Sync (Stripe)

How subscription status updates propagate from Stripe to the application.

```mermaid
sequenceDiagram
    participant Stripe
    participant Edge as Edge Function (stripe-webhook)
    participant DB as Supabase

    Stripe->>Edge: Webhook Event (customer.subscription.updated)
    Edge->>DB: Upsert stripe.subscriptions
    Edge->>DB: Upsert stripe.customers

    Note over DB: Triggers/RLS policies may update<br/>public.users or tiers based on changes
```
