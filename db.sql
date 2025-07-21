

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "stripe";


ALTER SCHEMA "stripe" OWNER TO "postgres";


COMMENT ON SCHEMA "stripe" IS 'Schema per i dati sincronizzati da Stripe tramite Sync Engine';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."chat_role" AS ENUM (
    'user',
    'assistant'
);


ALTER TYPE "public"."chat_role" OWNER TO "postgres";


CREATE TYPE "public"."link_method" AS ENUM (
    'phone_number',
    'username',
    'id'
);


ALTER TYPE "public"."link_method" OWNER TO "postgres";


CREATE TYPE "stripe"."invoice_status" AS ENUM (
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
    'deleted'
);


ALTER TYPE "stripe"."invoice_status" OWNER TO "postgres";


CREATE TYPE "stripe"."pricing_tiers" AS ENUM (
    'graduated',
    'volume'
);


ALTER TYPE "stripe"."pricing_tiers" OWNER TO "postgres";


CREATE TYPE "stripe"."pricing_type" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE "stripe"."pricing_type" OWNER TO "postgres";


CREATE TYPE "stripe"."subscription_schedule_status" AS ENUM (
    'not_started',
    'active',
    'completed',
    'released',
    'canceled'
);


ALTER TYPE "stripe"."subscription_schedule_status" OWNER TO "postgres";


CREATE TYPE "stripe"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid'
);


ALTER TYPE "stripe"."subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_onboarding_complete"("user_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_profile_is_complete boolean;
    v_has_verified_channel boolean;
BEGIN
    -- Step 1: Check if the user's profile information is complete.
    SELECT
        (
            nickname IS NOT NULL AND nickname <> '' AND
            first_name IS NOT NULL AND first_name <> '' AND
            last_name IS NOT NULL AND last_name <> ''
        )
    INTO v_profile_is_complete
    FROM public.users
    WHERE id = user_id_param;

    -- Step 2: Check if the user has at least one verified channel.
    SELECT EXISTS (
        SELECT 1
        FROM public.user_channels
        WHERE user_id = user_id_param
          AND verified_at IS NOT NULL
    )
    INTO v_has_verified_channel;

    -- Step 3: Onboarding is complete only if both conditions are true.
    -- COALESCE is used to safely handle the case where a user profile might not exist, defaulting to false.
    RETURN COALESCE(v_profile_is_complete, false) AND v_has_verified_channel;
END;
$$;


ALTER FUNCTION "public"."check_onboarding_complete"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_tokens"("txt" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$SELECT cardinality(regexp_split_to_array(trim(txt), E'\\s+'));$$;


ALTER FUNCTION "public"."count_tokens"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_channel_link"("p_nonce" "uuid", "p_link" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_verification_record RECORD;
    v_user_channel_id uuid;
BEGIN
    -- 1. Find the verification record, ensuring it's not expired
    SELECT user_id, channel_id
    INTO v_verification_record
    FROM public.channel_verifications
    WHERE nonce = p_nonce AND expires_at > now();

    -- 2. If no record is found, the nonce is invalid or expired
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invalid or expired verification code.');
    END IF;

    -- 3. Check if this channel link is already taken by another user
    IF EXISTS (
        SELECT 1 FROM public.user_channels
        WHERE link = p_link
          AND channel_id = v_verification_record.channel_id
          AND user_id != v_verification_record.user_id
    ) THEN
        RETURN jsonb_build_object('error', 'This channel account is already linked to another user.');
    END IF;

    -- 4. Create/update the user_channel link and mark it as verified
    INSERT INTO public.user_channels (user_id, channel_id, link, verified_at)
    VALUES (v_verification_record.user_id, v_verification_record.channel_id, p_link, now())
    ON CONFLICT (user_id, channel_id) DO UPDATE
    SET
        link = EXCLUDED.link,
        verified_at = now()
    RETURNING id INTO v_user_channel_id;

    -- 5. Delete the used nonce
    DELETE FROM public.channel_verifications WHERE nonce = p_nonce;

    -- 6. Return the user_id of the successfully linked user
    RETURN jsonb_build_object('user_id', v_verification_record.user_id, 'user_channel_id', v_user_channel_id);
END;
$$;


ALTER FUNCTION "public"."finalize_channel_link"("p_nonce" "uuid", "p_link" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_usage"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "subscription_id" "text", "subscription_period_start" timestamp with time zone, "subscription_period_end" timestamp with time zone, "total_tokens_used" integer, "total_requests_used" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_channel_ids UUID[];
    v_current_period_start timestamptz;
    v_current_period_end timestamptz;
    v_subscription_id text;
BEGIN
    -- 1. Find the user's active or trialing subscription and its period.
    -- We join through customers to link Stripe subscriptions to our users.
    SELECT
        s.id,
        (s.current_period_start)::timestamptz, -- Convert Unix epoch seconds to timestamp with timezone
        (s.current_period_end)::timestamptz   -- Convert Unix epoch seconds to timestamp with timezone
    INTO
        v_subscription_id, v_current_period_start, v_current_period_end
    FROM
        stripe.subscriptions s
    JOIN
        stripe.customers c ON s.customer = c.id
    WHERE
        -- Find the customer ID associated with the user
        c.id = (SELECT stripe_customer_id FROM public.users WHERE id = p_user_id)
        AND s.status IN ('active', 'trialing') -- Consider both active and trialing subscriptions
    ORDER BY s.current_period_start DESC -- In case of multiple active subscriptions, prioritize the most recent one
    LIMIT 1;

    -- If no active subscription is found for the user, return zero usage and null period details.
    IF NOT FOUND THEN
        RETURN QUERY SELECT p_user_id, NULL, NULL, NULL, 0, 0;
        RETURN;
    END IF;

    -- 2. Get all user_channel IDs associated with the given user.
    -- Usage records are tied to user channels, not directly to users.
    SELECT array_agg(id)
    INTO v_user_channel_ids
    FROM public.user_channels
    WHERE user_id = p_user_id;

    -- If the user has no linked channels, they have no usage.
    IF v_user_channel_ids IS NULL OR array_length(v_user_channel_ids, 1) IS NULL THEN
        RETURN QUERY SELECT
            p_user_id,
            v_subscription_id,
            v_current_period_start,
            v_current_period_end,
            0,
            0;
        RETURN;
    END IF;

    -- 3. Sum usage records that occurred within the current subscription period.
    -- The reset function (below) ensures that usage_records are zeroed out when a period ends.
    -- This query then aggregates the usage that has accumulated *since* the start of the current period.
    RETURN QUERY
    SELECT
        p_user_id AS user_id,
        v_subscription_id AS subscription_id,
        v_current_period_start AS subscription_period_start,
        v_current_period_end AS subscription_period_end,
        COALESCE(SUM(ur.tokens_used), 0) AS total_tokens_used,
        COALESCE(SUM(ur.requests_used), 0) AS total_requests_used
    FROM
        public.usage_records ur
    WHERE
        ur.user_channel_id = ANY(v_user_channel_ids)
        -- Filter usage records to only include those that occurred within the current subscription period.
        AND ur.updated_at >= v_current_period_start
        AND ur.updated_at <= v_current_period_end;

    -- 4. If no usage records were found within the period, return 0 for usage.
    -- This handles cases where a user has an active subscription but hasn't used resources yet in the current period.
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            p_user_id,
            v_subscription_id,
            v_current_period_start,
            v_current_period_end,
            0,
            0;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_current_usage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_history_limit" integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_history_limit integer;
BEGIN
    -- Fix search_path for SECURITY DEFINER safety
    PERFORM set_config('search_path', 'public, stripe, pg_temp', true);

    -- Determine effective history limit
    IF p_history_limit IS NOT NULL THEN
        v_history_limit := p_history_limit;
    ELSE
        -- Fetch tier-derived history limit
        SELECT tier_history_limit
        INTO v_history_limit
        FROM public.get_user_usage_and_limits(p_user_id)
        LIMIT 1;
    END IF;

    -- Normalize: if NULL set to 0 (no items); negative => unlimited
    IF v_history_limit IS NULL THEN
        v_history_limit := 0;
    END IF;

    RETURN json_build_object(
        'user_memories',
        COALESCE((
            WITH recent AS (
                SELECT um.role, um.content, um.created_at
                FROM public.user_memories um
                WHERE um.user_id = p_user_id
                ORDER BY um.created_at DESC
                -- Apply limit only if not unlimited
                LIMIT CASE WHEN v_history_limit < 0 THEN NULL ELSE v_history_limit END
            )
            SELECT json_agg(r ORDER BY r.created_at)
            FROM recent r
        ), '[]'::json),
        'user_messages',
        COALESCE((
            WITH recent AS (
                SELECT
                    cm.id AS message_id,
                    uc.channel_id,
                    cm.created_at
                FROM public.chat_messages cm
                JOIN public.user_channels uc ON cm.user_channel = uc.id
                WHERE uc.user_id = p_user_id
                ORDER BY cm.created_at DESC
                LIMIT CASE WHEN v_history_limit < 0 THEN NULL ELSE v_history_limit END
            )
            SELECT json_agg(r ORDER BY r.created_at)
            FROM recent r
        ), '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_history_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_channel"("p_channel_id" "text", "p_channel_link" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_result json;
BEGIN
    SELECT json_build_object(
        'user_id', u.id,
        'email', u.email,
        'nickname', u.nickname,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'channel_id', uc.channel_id,
        'channel_link', uc.link,
        'verified_at', uc.verified_at,
        'created_at', u.created_at
    )
    INTO user_result
    FROM public.users u
    JOIN public.user_channels uc ON u.id = uc.user_id
    WHERE uc.channel_id = p_channel_id
      AND uc.link = p_channel_link;

    RETURN user_result;  -- will be NULL if no match
END;
$$;


ALTER FUNCTION "public"."get_user_by_channel"("p_channel_id" "text", "p_channel_link" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_plan"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan_slug TEXT;
BEGIN
    -- This function joins across schemas, so it's best to run with the definer's privileges.
    -- The definer (usually the postgres role) is assumed to have access to both public and stripe schemas.

    SELECT
        p.metadata->>'slug' -- Use the ->> operator to get the JSON field as text
    INTO v_plan_slug
    FROM public.users u
    -- Join to find the active subscription for the customer
    JOIN stripe.subscriptions s ON u.stripe_customer_id = s.customer
    -- A subscription can have multiple items, but we'll take the first one's product
    JOIN stripe.subscription_items si ON s.id = si.subscription
    -- Join to get the price information
    JOIN stripe.prices pr ON si.price = pr.id
    -- Join to get the product (plan) information
    JOIN stripe.products p ON pr.product = p.id
    WHERE
        u.id = p_user_id
        AND s.status = 'active' -- Ensure the subscription is currently active
    LIMIT 1; -- In case of multiple subscription items, return the first one found.

    RETURN v_plan_slug;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_plan"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_usage_and_limits"("user_id" "uuid") RETURNS TABLE("tokens_used" integer, "requests_used" integer, "tier_tokens_limit" integer, "tier_requests_limit" integer, "tier_history_limit" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$DECLARE
    v_usage RECORD;
    v_tier_features RECORD;
    v_user_channel_id UUID;
BEGIN
    SELECT id INTO v_user_channel_id
    FROM public.user_channels uc
    WHERE uc.user_id = get_user_usage_and_limits.user_id
    LIMIT 1;

    IF v_user_channel_id IS NOT NULL THEN
        SELECT ur.tokens_used, ur.requests_used
        INTO v_usage
        FROM public.usage_records ur
        WHERE ur.user_channel_id = v_user_channel_id;
    ELSE
        SELECT 0 AS tokens_used, 0 AS requests_used INTO v_usage;
    END IF;

    SELECT
        tf.history_limit,
        tf.tokens_limit,
        tf.requests_limit
    INTO v_tier_features
    FROM public.users u
    JOIN stripe.subscriptions s ON u.stripe_customer_id = s.customer
    JOIN stripe.subscription_items si ON s.id = si.subscription
    JOIN stripe.prices p ON si.price = p.id
    JOIN public.tiers_features tf ON p.product = tf.id
    WHERE u.id = get_user_usage_and_limits.user_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        COALESCE(v_usage.tokens_used, 0),
        COALESCE(v_usage.requests_used, 0),
        v_tier_features.tokens_limit,
        v_tier_features.requests_limit,
        v_tier_features.history_limit;
END;$$;


ALTER FUNCTION "public"."get_user_usage_and_limits"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, first_name, last_name, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_channel" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "role" "public"."chat_role" NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_message"("p_user_id" "uuid", "p_channel_id" "text", "p_content" "text", "p_role" "public"."chat_role") RETURNS "public"."chat_messages"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_user_channel_id    uuid;
    v_new_message        public.chat_messages;
    v_tokens_increment   integer;
    v_requests_increment integer;
BEGIN
    -- Find the user_channel id
    SELECT id
      INTO v_user_channel_id
      FROM public.user_channels
     WHERE user_id = p_user_id
       AND channel_id = p_channel_id;

    IF v_user_channel_id IS NULL THEN
        RAISE EXCEPTION 'User-channel link not found for user_id % and channel_id %',
            p_user_id, p_channel_id;
    END IF;

    -- Insert the message
    INSERT INTO public.chat_messages (user_channel, content, role)
    VALUES (v_user_channel_id, p_content, p_role)
    RETURNING * INTO v_new_message;

    -- Count tokens (whitespace split via count_tokens)
    SELECT count_tokens(COALESCE(p_content, '')) INTO v_tokens_increment;

    -- Increment requests only for assistant messages
    v_requests_increment := CASE WHEN p_role = 'assistant' THEN 1 ELSE 0 END;

    -- Upsert usage record (single upsert; requests increment may be 0)
    INSERT INTO public.usage_records (user_channel_id, tokens_used, requests_used, created_at, updated_at)
    VALUES (v_user_channel_id, v_tokens_increment, v_requests_increment, now(), now())
    ON CONFLICT (user_channel_id)
    DO UPDATE SET
        tokens_used   = usage_records.tokens_used + EXCLUDED.tokens_used,
        requests_used = usage_records.requests_used + EXCLUDED.requests_used,
        updated_at    = now();

    RETURN v_new_message;
END;
$$;


ALTER FUNCTION "public"."insert_message"("p_user_id" "uuid", "p_channel_id" "text", "p_content" "text", "p_role" "public"."chat_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_daily_usage_records"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id uuid;
    v_user_channel_ids UUID[];
BEGIN
    -- Find all user_ids whose active subscription period has ended *before* the current time.
    -- This ensures we only reset for periods that have completed.
    FOR v_user_id IN
        SELECT DISTINCT
            uc.user_id
        FROM
            public.user_channels uc
        JOIN
            public.users u ON uc.user_id = u.id
        JOIN
            -- We only need to check subscriptions, not customers directly in the main query
            stripe.subscriptions s ON u.stripe_customer_id = s.customer
        WHERE
            s.status IN ('active', 'trialing')
            -- Check if the subscription period's end date has passed relative to the current time.
            -- EXTRACT(EPOCH FROM NOW()) converts the current timestamp to Unix epoch seconds.
            AND s.current_period_end < EXTRACT(EPOCH FROM NOW())::integer
    LOOP
        -- Get all channel IDs for this user
        SELECT array_agg(id)
        INTO v_user_channel_ids
        FROM public.user_channels
        WHERE user_id = v_user_id;

        -- If the user has linked channels, reset their usage records.
        IF v_user_channel_ids IS NOT NULL AND array_length(v_user_channel_ids, 1) IS NOT NULL THEN
            UPDATE public.usage_records
            SET
                tokens_used = 0,
                requests_used = 0,
                updated_at = NOW() -- Mark the reset time
            WHERE
                user_channel_id = ANY(v_user_channel_ids);
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."reset_daily_usage_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "stripe"."get_migration_mode"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT value FROM stripe.sync_engine_config WHERE key = 'migration_mode');
END;
$$;


ALTER FUNCTION "stripe"."get_migration_mode"() OWNER TO "postgres";


COMMENT ON FUNCTION "stripe"."get_migration_mode"() IS 'Ottiene la modalità di migrazione corrente (parallel/sync_engine_only/legacy_only)';



CREATE OR REPLACE FUNCTION "stripe"."is_sync_engine_enabled"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT value::BOOLEAN FROM stripe.sync_engine_config WHERE key = 'sync_engine_enabled');
END;
$$;


ALTER FUNCTION "stripe"."is_sync_engine_enabled"() OWNER TO "postgres";


COMMENT ON FUNCTION "stripe"."is_sync_engine_enabled"() IS 'Verifica se il Stripe Sync Engine è attivo';



CREATE OR REPLACE FUNCTION "stripe"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "stripe"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel_id" "text" NOT NULL,
    "nonce" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."channel_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "link_method" "public"."link_method" NOT NULL
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


ALTER TABLE "public"."chat_messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chat_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tiers_features" (
    "id" "text" NOT NULL,
    "history_limit" integer,
    "tokens_limit" integer,
    "requests_limit" integer
);


ALTER TABLE "public"."tiers_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_records" (
    "tokens_used" integer DEFAULT 0 NOT NULL,
    "requests_used" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_channel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."usage_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel_id" "text" NOT NULL,
    "link" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_at" timestamp with time zone
);


ALTER TABLE "public"."user_channels" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_channels"."link" IS 'link of the channel such as number_phone or username depend on the channel';



CREATE TABLE IF NOT EXISTS "public"."user_memories" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."chat_role" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_memories" OWNER TO "postgres";


ALTER TABLE "public"."user_memories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_memories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "nickname" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."charges" (
    "id" "text" NOT NULL,
    "object" "text",
    "paid" boolean,
    "order" "text",
    "amount" bigint,
    "review" "text",
    "source" "jsonb",
    "status" "text",
    "created" integer,
    "dispute" "text",
    "invoice" "text",
    "outcome" "jsonb",
    "refunds" "jsonb",
    "updated" integer,
    "captured" boolean,
    "currency" "text",
    "customer" "text",
    "livemode" boolean,
    "metadata" "jsonb",
    "refunded" boolean,
    "shipping" "jsonb",
    "application" "text",
    "description" "text",
    "destination" "text",
    "failure_code" "text",
    "on_behalf_of" "text",
    "fraud_details" "jsonb",
    "receipt_email" "text",
    "payment_intent" "text",
    "receipt_number" "text",
    "transfer_group" "text",
    "amount_refunded" bigint,
    "application_fee" "text",
    "failure_message" "text",
    "source_transfer" "text",
    "balance_transaction" "text",
    "statement_descriptor" "text",
    "payment_method_details" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."coupons" (
    "id" "text" NOT NULL,
    "object" "text",
    "name" "text",
    "valid" boolean,
    "created" integer,
    "updated" integer,
    "currency" "text",
    "duration" "text",
    "livemode" boolean,
    "metadata" "jsonb",
    "redeem_by" integer,
    "amount_off" bigint,
    "percent_off" double precision,
    "times_redeemed" bigint,
    "max_redemptions" bigint,
    "duration_in_months" bigint,
    "percent_off_precise" double precision,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."credit_notes" (
    "id" "text" NOT NULL,
    "object" "text",
    "amount" integer,
    "amount_shipping" integer,
    "created" integer,
    "currency" "text",
    "customer" "text",
    "customer_balance_transaction" "text",
    "discount_amount" integer,
    "discount_amounts" "jsonb",
    "invoice" "text",
    "lines" "jsonb",
    "livemode" boolean,
    "memo" "text",
    "metadata" "jsonb",
    "number" "text",
    "out_of_band_amount" integer,
    "pdf" "text",
    "reason" "text",
    "refund" "text",
    "shipping_cost" "jsonb",
    "status" "text",
    "subtotal" integer,
    "subtotal_excluding_tax" integer,
    "tax_amounts" "jsonb",
    "total" integer,
    "total_excluding_tax" integer,
    "type" "text",
    "voided_at" "text"
);


ALTER TABLE "stripe"."credit_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."customers" (
    "id" "text" NOT NULL,
    "object" "text",
    "address" "jsonb",
    "description" "text",
    "email" "text",
    "metadata" "jsonb",
    "name" "text",
    "phone" "text",
    "shipping" "jsonb",
    "balance" integer,
    "created" integer,
    "currency" "text",
    "default_source" "text",
    "delinquent" boolean,
    "discount" "jsonb",
    "invoice_prefix" "text",
    "invoice_settings" "jsonb",
    "livemode" boolean,
    "next_invoice_sequence" integer,
    "preferred_locales" "jsonb",
    "tax_exempt" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "stripe"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."disputes" (
    "id" "text" NOT NULL,
    "object" "text",
    "amount" bigint,
    "charge" "text",
    "reason" "text",
    "status" "text",
    "created" integer,
    "updated" integer,
    "currency" "text",
    "evidence" "jsonb",
    "livemode" boolean,
    "metadata" "jsonb",
    "evidence_details" "jsonb",
    "balance_transactions" "jsonb",
    "is_charge_refundable" boolean,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "payment_intent" "text"
);


ALTER TABLE "stripe"."disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."early_fraud_warnings" (
    "id" "text" NOT NULL,
    "object" "text",
    "actionable" boolean,
    "charge" "text",
    "created" integer,
    "fraud_type" "text",
    "livemode" boolean,
    "payment_intent" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."early_fraud_warnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."events" (
    "id" "text" NOT NULL,
    "object" "text",
    "data" "jsonb",
    "type" "text",
    "created" integer,
    "request" "text",
    "updated" integer,
    "livemode" boolean,
    "api_version" "text",
    "pending_webhooks" bigint,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."invoices" (
    "id" "text" NOT NULL,
    "object" "text",
    "auto_advance" boolean,
    "collection_method" "text",
    "currency" "text",
    "description" "text",
    "hosted_invoice_url" "text",
    "lines" "jsonb",
    "metadata" "jsonb",
    "period_end" integer,
    "period_start" integer,
    "status" "stripe"."invoice_status",
    "total" bigint,
    "account_country" "text",
    "account_name" "text",
    "account_tax_ids" "jsonb",
    "amount_due" bigint,
    "amount_paid" bigint,
    "amount_remaining" bigint,
    "application_fee_amount" bigint,
    "attempt_count" integer,
    "attempted" boolean,
    "billing_reason" "text",
    "created" integer,
    "custom_fields" "jsonb",
    "customer_address" "jsonb",
    "customer_email" "text",
    "customer_name" "text",
    "customer_phone" "text",
    "customer_shipping" "jsonb",
    "customer_tax_exempt" "text",
    "customer_tax_ids" "jsonb",
    "default_tax_rates" "jsonb",
    "discount" "jsonb",
    "discounts" "jsonb",
    "due_date" integer,
    "ending_balance" integer,
    "footer" "text",
    "invoice_pdf" "text",
    "last_finalization_error" "jsonb",
    "livemode" boolean,
    "next_payment_attempt" integer,
    "number" "text",
    "paid" boolean,
    "payment_settings" "jsonb",
    "post_payment_credit_notes_amount" integer,
    "pre_payment_credit_notes_amount" integer,
    "receipt_number" "text",
    "starting_balance" integer,
    "statement_descriptor" "text",
    "status_transitions" "jsonb",
    "subtotal" integer,
    "tax" integer,
    "total_discount_amounts" "jsonb",
    "total_tax_amounts" "jsonb",
    "transfer_data" "jsonb",
    "webhooks_delivered_at" integer,
    "customer" "text",
    "subscription" "text",
    "payment_intent" "text",
    "default_payment_method" "text",
    "default_source" "text",
    "on_behalf_of" "text",
    "charge" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "stripe"."migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payment_intents" (
    "id" "text" NOT NULL,
    "object" "text",
    "amount" integer,
    "amount_capturable" integer,
    "amount_details" "jsonb",
    "amount_received" integer,
    "application" "text",
    "application_fee_amount" integer,
    "automatic_payment_methods" "text",
    "canceled_at" integer,
    "cancellation_reason" "text",
    "capture_method" "text",
    "client_secret" "text",
    "confirmation_method" "text",
    "created" integer,
    "currency" "text",
    "customer" "text",
    "description" "text",
    "invoice" "text",
    "last_payment_error" "text",
    "livemode" boolean,
    "metadata" "jsonb",
    "next_action" "text",
    "on_behalf_of" "text",
    "payment_method" "text",
    "payment_method_options" "jsonb",
    "payment_method_types" "jsonb",
    "processing" "text",
    "receipt_email" "text",
    "review" "text",
    "setup_future_usage" "text",
    "shipping" "jsonb",
    "statement_descriptor" "text",
    "statement_descriptor_suffix" "text",
    "status" "text",
    "transfer_data" "jsonb",
    "transfer_group" "text"
);


ALTER TABLE "stripe"."payment_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payment_methods" (
    "id" "text" NOT NULL,
    "object" "text",
    "created" integer,
    "customer" "text",
    "type" "text",
    "billing_details" "jsonb",
    "metadata" "jsonb",
    "card" "jsonb"
);


ALTER TABLE "stripe"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payouts" (
    "id" "text" NOT NULL,
    "object" "text",
    "date" "text",
    "type" "text",
    "amount" bigint,
    "method" "text",
    "status" "text",
    "created" integer,
    "updated" integer,
    "currency" "text",
    "livemode" boolean,
    "metadata" "jsonb",
    "automatic" boolean,
    "recipient" "text",
    "description" "text",
    "destination" "text",
    "source_type" "text",
    "arrival_date" "text",
    "bank_account" "jsonb",
    "failure_code" "text",
    "transfer_group" "text",
    "amount_reversed" bigint,
    "failure_message" "text",
    "source_transaction" "text",
    "balance_transaction" "text",
    "statement_descriptor" "text",
    "statement_description" "text",
    "failure_balance_transaction" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."plans" (
    "id" "text" NOT NULL,
    "object" "text",
    "active" boolean,
    "amount" bigint,
    "created" integer,
    "product" "text",
    "currency" "text",
    "interval" "text",
    "livemode" boolean,
    "metadata" "jsonb",
    "nickname" "text",
    "tiers_mode" "text",
    "usage_type" "text",
    "billing_scheme" "text",
    "interval_count" bigint,
    "aggregate_usage" "text",
    "transform_usage" "text",
    "trial_period_days" bigint,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."prices" (
    "id" "text" NOT NULL,
    "object" "text",
    "active" boolean,
    "currency" "text",
    "metadata" "jsonb",
    "nickname" "text",
    "recurring" "jsonb",
    "type" "stripe"."pricing_type",
    "unit_amount" integer,
    "billing_scheme" "text",
    "created" integer,
    "livemode" boolean,
    "lookup_key" "text",
    "tiers_mode" "stripe"."pricing_tiers",
    "transform_quantity" "jsonb",
    "unit_amount_decimal" "text",
    "product" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."products" (
    "id" "text" NOT NULL,
    "object" "text",
    "active" boolean,
    "description" "text",
    "metadata" "jsonb",
    "name" "text",
    "created" integer,
    "images" "jsonb",
    "livemode" boolean,
    "package_dimensions" "jsonb",
    "shippable" boolean,
    "statement_descriptor" "text",
    "unit_label" "text",
    "updated" integer,
    "url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "marketing_features" "jsonb",
    "default_price" "text"
);


ALTER TABLE "stripe"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."refunds" (
    "id" "text" NOT NULL,
    "object" "text",
    "amount" integer,
    "balance_transaction" "text",
    "charge" "text",
    "created" integer,
    "currency" "text",
    "destination_details" "jsonb",
    "metadata" "jsonb",
    "payment_intent" "text",
    "reason" "text",
    "receipt_number" "text",
    "source_transfer_reversal" "text",
    "status" "text",
    "transfer_reversal" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."reviews" (
    "id" "text" NOT NULL,
    "object" "text",
    "billing_zip" "text",
    "charge" "text",
    "created" integer,
    "closed_reason" "text",
    "livemode" boolean,
    "ip_address" "text",
    "ip_address_location" "jsonb",
    "open" boolean,
    "opened_reason" "text",
    "payment_intent" "text",
    "reason" "text",
    "session" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."setup_intents" (
    "id" "text" NOT NULL,
    "object" "text",
    "created" integer,
    "customer" "text",
    "description" "text",
    "payment_method" "text",
    "status" "text",
    "usage" "text",
    "cancellation_reason" "text",
    "latest_attempt" "text",
    "mandate" "text",
    "single_use_mandate" "text",
    "on_behalf_of" "text"
);


ALTER TABLE "stripe"."setup_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscription_items" (
    "id" "text" NOT NULL,
    "object" "text",
    "billing_thresholds" "jsonb",
    "created" integer,
    "deleted" boolean,
    "metadata" "jsonb",
    "quantity" integer,
    "price" "text",
    "subscription" "text",
    "tax_rates" "jsonb"
);


ALTER TABLE "stripe"."subscription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscription_schedules" (
    "id" "text" NOT NULL,
    "object" "text",
    "application" "text",
    "canceled_at" integer,
    "completed_at" integer,
    "created" integer NOT NULL,
    "current_phase" "jsonb",
    "customer" "text" NOT NULL,
    "default_settings" "jsonb",
    "end_behavior" "text",
    "livemode" boolean NOT NULL,
    "metadata" "jsonb" NOT NULL,
    "phases" "jsonb" NOT NULL,
    "released_at" integer,
    "released_subscription" "text",
    "status" "stripe"."subscription_schedule_status" NOT NULL,
    "subscription" "text",
    "test_clock" "text"
);


ALTER TABLE "stripe"."subscription_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscriptions" (
    "id" "text" NOT NULL,
    "object" "text",
    "cancel_at_period_end" boolean,
    "current_period_end" integer,
    "current_period_start" integer,
    "default_payment_method" "text",
    "items" "jsonb",
    "metadata" "jsonb",
    "pending_setup_intent" "text",
    "pending_update" "jsonb",
    "status" "stripe"."subscription_status",
    "application_fee_percent" double precision,
    "billing_cycle_anchor" integer,
    "billing_thresholds" "jsonb",
    "cancel_at" integer,
    "canceled_at" integer,
    "collection_method" "text",
    "created" integer,
    "days_until_due" integer,
    "default_source" "text",
    "default_tax_rates" "jsonb",
    "discount" "jsonb",
    "ended_at" integer,
    "livemode" boolean,
    "next_pending_invoice_item_invoice" integer,
    "pause_collection" "jsonb",
    "pending_invoice_item_interval" "jsonb",
    "start_date" integer,
    "transfer_data" "jsonb",
    "trial_end" "jsonb",
    "trial_start" "jsonb",
    "schedule" "text",
    "customer" "text",
    "latest_invoice" "text",
    "plan" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "stripe"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."tax_ids" (
    "id" "text" NOT NULL,
    "object" "text",
    "country" "text",
    "customer" "text",
    "type" "text",
    "value" "text",
    "created" integer NOT NULL,
    "livemode" boolean,
    "owner" "jsonb"
);


ALTER TABLE "stripe"."tax_ids" OWNER TO "postgres";


ALTER TABLE ONLY "public"."channel_verifications"
    ADD CONSTRAINT "channel_verifications_nonce_key" UNIQUE ("nonce");



ALTER TABLE ONLY "public"."channel_verifications"
    ADD CONSTRAINT "channel_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiers_features"
    ADD CONSTRAINT "tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_pkey" PRIMARY KEY ("user_channel_id");



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_channel_user_id_channel_id_key" UNIQUE ("link", "channel_id");



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_user_id_channel_id_key" UNIQUE ("user_id", "channel_id");



ALTER TABLE ONLY "public"."user_memories"
    ADD CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "stripe"."charges"
    ADD CONSTRAINT "charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."credit_notes"
    ADD CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."early_fraud_warnings"
    ADD CONSTRAINT "early_fraud_warnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "stripe"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."payment_intents"
    ADD CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."setup_intents"
    ADD CONSTRAINT "setup_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscription_items"
    ADD CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscription_schedules"
    ADD CONSTRAINT "subscription_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."tax_ids"
    ADD CONSTRAINT "tax_ids_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_channel_verifications_expiry" ON "public"."channel_verifications" USING "btree" ("expires_at");



CREATE INDEX "idx_channel_verifications_nonce" ON "public"."channel_verifications" USING "btree" ("nonce");



CREATE INDEX "idx_user_channels_channel" ON "public"."user_channels" USING "btree" ("channel_id", "link");



CREATE INDEX "stripe_credit_notes_customer_idx" ON "stripe"."credit_notes" USING "btree" ("customer");



CREATE INDEX "stripe_credit_notes_invoice_idx" ON "stripe"."credit_notes" USING "btree" ("invoice");



CREATE INDEX "stripe_dispute_created_idx" ON "stripe"."disputes" USING "btree" ("created");



CREATE INDEX "stripe_early_fraud_warnings_charge_idx" ON "stripe"."early_fraud_warnings" USING "btree" ("charge");



CREATE INDEX "stripe_early_fraud_warnings_payment_intent_idx" ON "stripe"."early_fraud_warnings" USING "btree" ("payment_intent");



CREATE INDEX "stripe_invoices_customer_idx" ON "stripe"."invoices" USING "btree" ("customer");



CREATE INDEX "stripe_invoices_subscription_idx" ON "stripe"."invoices" USING "btree" ("subscription");



CREATE INDEX "stripe_payment_intents_customer_idx" ON "stripe"."payment_intents" USING "btree" ("customer");



CREATE INDEX "stripe_payment_intents_invoice_idx" ON "stripe"."payment_intents" USING "btree" ("invoice");



CREATE INDEX "stripe_payment_methods_customer_idx" ON "stripe"."payment_methods" USING "btree" ("customer");



CREATE INDEX "stripe_refunds_charge_idx" ON "stripe"."refunds" USING "btree" ("charge");



CREATE INDEX "stripe_refunds_payment_intent_idx" ON "stripe"."refunds" USING "btree" ("payment_intent");



CREATE INDEX "stripe_reviews_charge_idx" ON "stripe"."reviews" USING "btree" ("charge");



CREATE INDEX "stripe_reviews_payment_intent_idx" ON "stripe"."reviews" USING "btree" ("payment_intent");



CREATE INDEX "stripe_setup_intents_customer_idx" ON "stripe"."setup_intents" USING "btree" ("customer");



CREATE INDEX "stripe_tax_ids_customer_idx" ON "stripe"."tax_ids" USING "btree" ("customer");



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "stripe"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."user_channels" FOR EACH ROW EXECUTE FUNCTION "stripe"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."user_memories" FOR EACH ROW EXECUTE FUNCTION "stripe"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "stripe"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."disputes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."early_fraud_warnings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."prices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."refunds" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."channel_verifications"
    ADD CONSTRAINT "channel_verifications_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_verifications"
    ADD CONSTRAINT "channel_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_user_channel_fkey" FOREIGN KEY ("user_channel") REFERENCES "public"."user_channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiers_features"
    ADD CONSTRAINT "tiers_id_fkey" FOREIGN KEY ("id") REFERENCES "stripe"."products"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_user_channel_id_fkey" FOREIGN KEY ("user_channel_id") REFERENCES "public"."user_channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id");



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."user_channels"("id");



ALTER TABLE ONLY "public"."user_channels"
    ADD CONSTRAINT "user_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memories"
    ADD CONSTRAINT "user_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_fkey" FOREIGN KEY ("stripe_customer_id") REFERENCES "stripe"."customers"("id");



ALTER TABLE ONLY "stripe"."invoices"
    ADD CONSTRAINT "invoices_customer_fkey" FOREIGN KEY ("customer") REFERENCES "stripe"."customers"("id");



ALTER TABLE ONLY "stripe"."invoices"
    ADD CONSTRAINT "invoices_subscription_fkey" FOREIGN KEY ("subscription") REFERENCES "stripe"."subscriptions"("id");



ALTER TABLE ONLY "stripe"."prices"
    ADD CONSTRAINT "prices_product_fkey" FOREIGN KEY ("product") REFERENCES "stripe"."products"("id");



ALTER TABLE ONLY "stripe"."subscription_items"
    ADD CONSTRAINT "subscription_items_price_fkey" FOREIGN KEY ("price") REFERENCES "stripe"."prices"("id");



ALTER TABLE ONLY "stripe"."subscription_items"
    ADD CONSTRAINT "subscription_items_subscription_fkey" FOREIGN KEY ("subscription") REFERENCES "stripe"."subscriptions"("id");



ALTER TABLE ONLY "stripe"."subscriptions"
    ADD CONSTRAINT "subscriptions_customer_fkey" FOREIGN KEY ("customer") REFERENCES "stripe"."customers"("id");



CREATE POLICY "Allow authenticated users to insert their own verifications" ON "public"."channel_verifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to insert their own usage records" ON "public"."usage_records" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "user_channels"."user_id"
   FROM "public"."user_channels"
  WHERE ("user_channels"."id" = "usage_records"."user_channel_id")) = "auth"."uid"()));



CREATE POLICY "Allow users to read their own usage records" ON "public"."usage_records" FOR SELECT TO "authenticated" USING ((( SELECT "user_channels"."user_id"
   FROM "public"."user_channels"
  WHERE ("user_channels"."id" = "usage_records"."user_channel_id")) = "auth"."uid"()));



CREATE POLICY "Allow users to read their own verifications" ON "public"."channel_verifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."channel_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_channels" ON "public"."channels" FOR SELECT USING (true);



CREATE POLICY "read_tiers" ON "public"."tiers_features" FOR SELECT USING (true);



ALTER TABLE "public"."tiers_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_channels_own" ON "public"."user_channels" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_memories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_read_own" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."usage_records";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON SCHEMA "stripe" TO "service_role";
GRANT USAGE ON SCHEMA "stripe" TO "authenticated";





















































































































































































































































































































GRANT ALL ON FUNCTION "public"."check_onboarding_complete"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_onboarding_complete"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_onboarding_complete"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_tokens"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."count_tokens"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_tokens"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_channel_link"("p_nonce" "uuid", "p_link" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_channel_link"("p_nonce" "uuid", "p_link" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_channel_link"("p_nonce" "uuid", "p_link" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_usage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_usage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_usage"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_history_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_history_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_history_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_channel"("p_channel_id" "text", "p_channel_link" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_channel"("p_channel_id" "text", "p_channel_link" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_channel"("p_channel_id" "text", "p_channel_link" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription_plan"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription_plan"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_plan"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_usage_and_limits"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_usage_and_limits"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_usage_and_limits"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_message"("p_user_id" "uuid", "p_channel_id" "text", "p_content" "text", "p_role" "public"."chat_role") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_message"("p_user_id" "uuid", "p_channel_id" "text", "p_content" "text", "p_role" "public"."chat_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_message"("p_user_id" "uuid", "p_channel_id" "text", "p_content" "text", "p_role" "public"."chat_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_daily_usage_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_daily_usage_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_daily_usage_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "stripe"."get_migration_mode"() TO "authenticated";



GRANT ALL ON FUNCTION "stripe"."is_sync_engine_enabled"() TO "authenticated";



























GRANT ALL ON TABLE "public"."channel_verifications" TO "anon";
GRANT ALL ON TABLE "public"."channel_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tiers_features" TO "anon";
GRANT ALL ON TABLE "public"."tiers_features" TO "authenticated";
GRANT ALL ON TABLE "public"."tiers_features" TO "service_role";



GRANT ALL ON TABLE "public"."usage_records" TO "anon";
GRANT ALL ON TABLE "public"."usage_records" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_records" TO "service_role";



GRANT ALL ON TABLE "public"."user_channels" TO "anon";
GRANT ALL ON TABLE "public"."user_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."user_channels" TO "service_role";



GRANT ALL ON TABLE "public"."user_memories" TO "anon";
GRANT ALL ON TABLE "public"."user_memories" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_memories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_memories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_memories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "stripe"."charges" TO "service_role";



GRANT ALL ON TABLE "stripe"."coupons" TO "service_role";



GRANT ALL ON TABLE "stripe"."credit_notes" TO "service_role";



GRANT ALL ON TABLE "stripe"."customers" TO "service_role";



GRANT ALL ON TABLE "stripe"."disputes" TO "service_role";



GRANT ALL ON TABLE "stripe"."early_fraud_warnings" TO "service_role";



GRANT ALL ON TABLE "stripe"."events" TO "service_role";



GRANT ALL ON TABLE "stripe"."invoices" TO "service_role";



GRANT ALL ON TABLE "stripe"."migrations" TO "service_role";



GRANT ALL ON TABLE "stripe"."payment_intents" TO "service_role";



GRANT ALL ON TABLE "stripe"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "stripe"."payouts" TO "service_role";



GRANT ALL ON TABLE "stripe"."plans" TO "service_role";



GRANT ALL ON TABLE "stripe"."prices" TO "service_role";
GRANT SELECT ON TABLE "stripe"."prices" TO "authenticated";



GRANT ALL ON TABLE "stripe"."products" TO "service_role";
GRANT SELECT ON TABLE "stripe"."products" TO "authenticated";



GRANT ALL ON TABLE "stripe"."refunds" TO "service_role";



GRANT ALL ON TABLE "stripe"."reviews" TO "service_role";



GRANT ALL ON TABLE "stripe"."setup_intents" TO "service_role";



GRANT ALL ON TABLE "stripe"."subscription_items" TO "service_role";
GRANT SELECT ON TABLE "stripe"."subscription_items" TO "authenticated";



GRANT ALL ON TABLE "stripe"."subscription_schedules" TO "service_role";



GRANT ALL ON TABLE "stripe"."subscriptions" TO "service_role";
GRANT SELECT ON TABLE "stripe"."subscriptions" TO "authenticated";



GRANT ALL ON TABLE "stripe"."tax_ids" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "stripe" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "stripe" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "stripe" GRANT ALL ON TABLES TO "service_role";



























RESET ALL;
