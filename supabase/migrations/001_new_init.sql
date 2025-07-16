/*===========================================================================
 0. EXTENSION & ENUMS
===========================================================================*/
CREATE EXTENSION IF NOT EXISTS "pgcrypto"
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'subscription_status') THEN
  CREATE TYPE public.subscription_status AS ENUM(
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid'
);
END IF;
  IF NOT EXISTS(
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'memory_role') THEN
  CREATE TYPE public.memory_role AS ENUM(
    'user',
    'assistant'
);
END IF;
END
$$
/*===========================================================================
 1. LOOKUP TABLES – channels & tiers
===========================================================================*/
/* 1-A  channels -----------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS public.channels(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon_url text,
  is_active boolean NOT NULL DEFAULT TRUE,
  mandatory boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
)
-- Add mandatory column if it doesn't exist (for existing remote tables)
DO $$
BEGIN
  -- Handle code column if it exists in remote but not in our schema
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='channels' AND column_name='code') THEN
    -- Update existing records to set code based on name
    UPDATE public.channels 
    SET code = name 
    WHERE code IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='channels' AND column_name='mandatory') THEN
    ALTER TABLE public.channels ADD COLUMN mandatory boolean DEFAULT FALSE;
    
    -- Update existing records
    UPDATE public.channels 
    SET mandatory = CASE 
      WHEN name IN ('telegram', 'whatsapp') THEN TRUE 
      ELSE FALSE 
    END;
    
    -- Make it NOT NULL after setting values
    ALTER TABLE public.channels ALTER COLUMN mandatory SET NOT NULL;
  END IF;
  
  -- Add unique constraint on name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name='channels' AND constraint_name='channels_name_key') THEN
    ALTER TABLE public.channels ADD CONSTRAINT channels_name_key UNIQUE (name);
  END IF;
END $$
-- Insert channels with code column if it exists, otherwise without
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='channels' AND column_name='code') THEN
    INSERT INTO public.channels(name, code, mandatory)
      VALUES ('telegram', 'telegram', TRUE),
    ('whatsapp', 'whatsapp', TRUE)
    ON CONFLICT (code)
      DO UPDATE SET mandatory = EXCLUDED.mandatory;
  ELSE
    INSERT INTO public.channels(name, mandatory)
      VALUES ('telegram', TRUE),
    ('whatsapp', TRUE)
    ON CONFLICT (name)
      DO UPDATE SET mandatory = EXCLUDED.mandatory;
  END IF;
END $$
/* 1-B  tiers --------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS public.tiers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  stripe_price_id text UNIQUE,
  name text NOT NULL,
  history_limit integer,
  max_tokens integer,
  max_requests integer,
  features jsonb,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now()
)
/*===========================================================================
 2. CORE TABLES
===========================================================================*/
/* 2-A  users --------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS public.users(
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  nickname text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  stripe_customer_id text UNIQUE,
  onboarding_complete boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- Add missing columns to users table if they don't exist
DO $$
BEGIN
  -- Add nickname column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='nickname') THEN
    ALTER TABLE public.users ADD COLUMN nickname text DEFAULT '';
    ALTER TABLE public.users ALTER COLUMN nickname SET NOT NULL;
  END IF;
  
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='first_name') THEN
    ALTER TABLE public.users ADD COLUMN first_name text DEFAULT '';
    ALTER TABLE public.users ALTER COLUMN first_name SET NOT NULL;
  END IF;
  
  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='last_name') THEN
    ALTER TABLE public.users ADD COLUMN last_name text DEFAULT '';
    ALTER TABLE public.users ALTER COLUMN last_name SET NOT NULL;
  END IF;
  
  -- Add onboarding_complete column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='onboarding_complete') THEN
    ALTER TABLE public.users ADD COLUMN onboarding_complete boolean DEFAULT FALSE;
    ALTER TABLE public.users ALTER COLUMN onboarding_complete SET NOT NULL;
  END IF;
END $$
/* 2-B  user_channels ------------------------------------------------------*/
DO $$
BEGIN
  /*-----------------------------------------------------------
   1.  Create the table if it doesn’t exist yet
   -----------------------------------------------------------*/
  IF NOT EXISTS (
    SELECT
      1
    FROM
      information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_name = 'user_channels') THEN
  CREATE TABLE public.user_channels(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid( ),
    user_id uuid NOT NULL REFERENCES public.users(id ) ON DELETE CASCADE,
    channel_id uuid NOT NULL REFERENCES public.channels(id ) ON DELETE RESTRICT,
    channel_user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now( ),
    updated_at timestamptz NOT NULL DEFAULT now( ),
    verified_at timestamptz
  );

  -- one‑time DDL – run once after you have removed any duplicates 
ALTER TABLE public.user_channels
    -- unique inside your system
    ADD CONSTRAINT user_channels_user_uq
      UNIQUE (user_id, channel_id),

    -- unique for the external account in that same channel
    ADD CONSTRAINT user_channels_channel_user_uq
      UNIQUE (channel_user_id, channel_id);


END IF;
END
$$
/*===========================================================================
 2-C  subscriptions  — create fresh table, then run legacy back-fill
===========================================================================*/
DO $$
BEGIN
  /*-----------------------------------------------------------------
   1.  Create the table in its final shape if it doesn’t exist
   -----------------------------------------------------------------*/
  IF NOT EXISTS (
    SELECT
      1
    FROM
      information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_name = 'subscriptions') THEN
  CREATE TABLE public.subscriptions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid( ),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id ) ON DELETE CASCADE,
    tier_id uuid NOT NULL REFERENCES public.tiers(id ) ON DELETE CASCADE,
    stripe_subscription_id text UNIQUE,
    status subscription_status NOT NULL DEFAULT 'incomplete',
    cancel_at_period_end boolean NOT NULL DEFAULT FALSE,
    current_period_start timestamptz DEFAULT now(),
    current_period_end timestamptz,
    created_at timestamptz NOT NULL DEFAULT now( ),
    updated_at timestamptz NOT NULL DEFAULT now( )
  );
END IF;
END
$$
/* 2-D  user_memories ------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS public.user_memories(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ROLE memory_role NOT NULL,
  content text NOT NULL
)
/* 2-E  chat_messages ------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS public.chat_messages(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_channel_id uuid NOT NULL REFERENCES public.user_channels(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
/*===========================================================================
 3. updated_at triggers
===========================================================================*/
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$
CREATE OR REPLACE TRIGGER set_updated_at_user_channels
  BEFORE UPDATE ON public.user_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at()
CREATE OR REPLACE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at()
CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at()
CREATE OR REPLACE TRIGGER set_updated_at_user_memories
  BEFORE UPDATE ON public.user_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at()
/*===========================================================================
 4. Mirror auth.users → public.users
===========================================================================*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
BEGIN
  INSERT INTO public.users(id, email, nickname, first_name, last_name)
    VALUES(NEW.id, NEW.email, '', '', '')
  ON CONFLICT
    DO NOTHING;
  RETURN NEW;
END
$$
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user()
/*===========================================================================
 5. Lightweight token counter
===========================================================================*/
CREATE OR REPLACE FUNCTION public.num_tokens(txt text)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  AS $$
  SELECT
    cardinality(regexp_split_to_array(trim(txt), E'\\s+'));
$$
/*===========================================================================
 6. RLS policies for lookup tables
===========================================================================*/
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'read_channels') THEN
  CREATE POLICY read_channels ON public.channels
    FOR SELECT
      USING(TRUE );
END IF;
  IF NOT EXISTS(
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'tiers'
      AND policyname = 'read_tiers') THEN
  CREATE POLICY read_tiers ON public.tiers
    FOR SELECT
      USING(TRUE );
END IF;
END
$$
/*===========================================================================
 7. Onboarding validation functions
===========================================================================*/
-- Function to check if user has completed onboarding requirements
CREATE OR REPLACE FUNCTION public.check_onboarding_complete(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT 
    -- Check if user has all required profile fields
    (u.nickname IS NOT NULL AND u.nickname != '' AND
     u.first_name IS NOT NULL AND u.first_name != '' AND
     u.last_name IS NOT NULL AND u.last_name != '') AND
    -- Check if user has connected ALL mandatory channels
    (SELECT COUNT(*) FROM public.channels WHERE mandatory = true) = 
    (SELECT COUNT(*) 
     FROM public.user_channels uc 
     JOIN public.channels c ON c.id = uc.channel_id 
     WHERE uc.user_id = user_id_param 
       AND c.mandatory = true 
       AND uc.channel_user_id IS NOT NULL 
       AND uc.channel_user_id != '' 
       AND uc.verified_at IS NOT NULL)
  FROM public.users u 
  WHERE u.id = user_id_param;
$$
-- Function to automatically update onboarding status
CREATE OR REPLACE FUNCTION public.update_onboarding_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Determine the user_id based on the operation
  IF TG_OP = 'DELETE' THEN
    target_user_id := COALESCE(OLD.user_id, OLD.id);
  ELSE
    target_user_id := COALESCE(NEW.user_id, NEW.id);
  END IF;
  
  -- Update onboarding_complete status based on actual completion
  UPDATE public.users 
  SET onboarding_complete = public.check_onboarding_complete(target_user_id)
  WHERE id = target_user_id;
  
  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$
-- Triggers to auto-update onboarding status
CREATE OR REPLACE TRIGGER trigger_update_onboarding_on_user_channels
  AFTER INSERT OR UPDATE OR DELETE ON public.user_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_status()
-- Note: Don't add trigger on users table to avoid infinite recursion
-- The onboarding status will be updated when user_channels change


/*===========================================================================
 8. Enhanced RLS policies for onboarding enforcement
===========================================================================*/
-- Subscription policies
DO $$
BEGIN
  -- Allow users to read their own subscriptions
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'subscriptions_read_own') THEN
    
    CREATE POLICY subscriptions_read_own ON public.subscriptions
      FOR SELECT 
      TO authenticated 
      USING (user_id = auth.uid());
  END IF;

  -- Allow subscription creation for users who have completed onboarding
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'subscriptions_insert_onboarded') THEN
    
    CREATE POLICY subscriptions_insert_onboarded ON public.subscriptions
      FOR INSERT 
      TO authenticated 
      WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() 
          AND onboarding_complete = true
        )
      );
  END IF;

  -- Allow users to update their own subscriptions
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'subscriptions_update_own') THEN
    
    CREATE POLICY subscriptions_update_own ON public.subscriptions
      FOR UPDATE 
      TO authenticated 
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$
-- Allow users to read their own data regardless of onboarding status
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'users_read_own') THEN
    
    CREATE POLICY users_read_own ON public.users
      FOR SELECT 
      TO authenticated 
      USING (id = auth.uid());
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'users_update_own') THEN
    
    CREATE POLICY users_update_own ON public.users
      FOR UPDATE 
      TO authenticated 
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END
$$
-- Allow users to manage their own channels
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_channels' 
    AND policyname = 'user_channels_own') THEN
    
    CREATE POLICY user_channels_own ON public.user_channels
      FOR ALL 
      TO authenticated 
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY
ALTER TABLE public.user_channels ENABLE ROW LEVEL SECURITY
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY
/*===========================================================================
 9. (optional) cleanup once the app no longer needs legacy columns
 -- ALTER TABLE public.user_channels  DROP COLUMN channel_code;
 -- ALTER TABLE public.subscriptions  DROP COLUMN price_id;
===========================================================================*/
COMMIT