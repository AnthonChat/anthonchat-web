# n8n Workflows Documentation

This document explains the n8n workflows used to orchestrate the interaction between the messaging platforms (WhatsApp, Telegram), the AnthonChat website, and the Supabase database.

## Overview

The core logic of the AI coach is handled by n8n workflows. These workflows act as the backend logic layer that:

1.  Receives messages from users via Webhooks.
2.  Identifies and authenticates users against the Supabase database.
3.  Manages subscription limits and access control.
4.  Maintains conversation context and memory.
5.  Generates AI responses using LLMs (Google Gemini).
6.  Executes commands (e.g., account linking).

## Workflow: Main

**File:** `n8n/Main.json`

This is the production workflow handling live user traffic.

### 1. Triggers & Normalization

The workflow accepts inputs from two primary sources:

-   **WhatsApp Trigger**: Receives messages via the WhatsApp Business API.
-   **Telegram Trigger**: Receives messages via the Telegram Bot API.

**Normalization Node**: Regardless of the source, incoming data is standardized into a common format:

-   `message`: The text content.
-   `channel`: 'whatsapp' or 'telegram'.
-   `id`: The user's unique identifier on the platform (phone number or chat ID).
-   `type`: 'text' or 'audio'.

### 2. Command Routing

Before processing as a chat message, the system checks for specific slash commands:

-   `/link [nonce]`: Links the messaging account to a web account using a verification code.
-   `/dashboard`: Returns a link to the user dashboard.
-   `/signout`: Logs the user out or unlinks the device.
-   `/help`: Provides help text.
-   `/start`: Initiates the onboarding flow.
-   `/resetall`: (Admin/Debug) Resets user context.

### 3. User Authentication & Subscription

The workflow queries the **Supabase** database (Postgres) to:

-   Check if the user exists in the `public.user_channels` table.
-   Retrieve the user's current subscription tier (`free`, `basic`, `standard`, `pro`, `plus`).
-   Enforce rate limits based on the tier.

**Logic Flow:**

-   **New User**: If the user is not found, they are prompted to sign up via a generated URL.
-   **Limit Exceeded**: If the daily message limit for the tier is reached, a blocking message is sent.

### 4. AI Agent & Context

If the message is valid and within limits, it is passed to the AI Agent.

-   **Model**: Uses `google/gemini-2.5-flash` via OpenRouter.
-   **Context Retrieval**: Calls the Postgres function `get_user_context_last_session` to fetch:
    -   Recent message history.
    -   Long-term memories (facts saved about the user).
-   **System Prompt**: Injects a dynamic system prompt defining the persona ("ANTHØN"), rules (Markdown only, no HTML), and tools.
-   **Tools**:
    -   `save_memory`: Stores key facts about the user back to the database.
    -   `knowledge`: Queries the Pinecone vector database for "Metodo Sincro" content.
    -   `stripe`: Checks subscription status.

### 5. Account Linking (`/link`)

When a user sends `/link <code_from_web>`, the workflow:

1.  Verifies the `nonce` against the `public.channel_verifications` table in Supabase.
2.  If valid, creates a link in `public.user_channels`, connecting the Telegram/WhatsApp ID to the web User ID.
3.  Returns a success or error message.

## Workflow: Main - Test

**File:** `n8n/Main - Test.json`

This is a staging/testing version of the main workflow.

-   **Primary Trigger**: Telegram (WhatsApp is often disabled or mocked).
-   **Purpose**: Used for testing new prompts, model parameters, or logic changes before deploying to the Main workflow.
-   **Structure**: Mirrors the Main workflow but may contain experimental nodes or debug outputs.

## Database Integration (Supabase)

The workflows rely heavily on stored procedures in Postgres for logic abstraction:

-   `get_user_activity`: Fetches usage stats for rate limiting.
-   `get_user_context_last_session`: Retrieves conversation history and memory.
-   `get_user_subscription_plan`: Determines the active tier.

## Key Configuration

-   **Persona**: Defined in the `AI Input` node (Set node), containing the "Mental Coach" personality and strict formatting rules.
-   **Language**: The AI is instructed to detect and match the user's language (IT/EN).
