/*===========================================================================
 005  Channel-link handshake
===========================================================================*/
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------------------------+
-- 1.  Ephemeral nonce bucket                                       |
--------------------------------------------------------------------+
CREATE TABLE IF NOT EXISTS public.channel_verifications (
  id              uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel_user_id text        NOT NULL,
  channel_code    text        NOT NULL,           -- 'telegram', 'whatsapp', …
  nonce           uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  verified_at     timestamptz,
  UNIQUE (channel_user_id, channel_code),
  UNIQUE (channel_user_id, user_id),
  UNIQUE (nonce)
);

CREATE INDEX IF NOT EXISTS idx_channel_verifications_expiry
  ON public.channel_verifications (expires_at);

--------------------------------------------------------------------+
-- 2.  House-keeping: remove stale nonces                           |
--------------------------------------------------------------------+
CREATE OR REPLACE FUNCTION public.purge_expired_nonces() RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.channel_verifications
   WHERE expires_at < now();
$$;

-- Supabase cron → every day at 03:17
-- daily at 03:17 UTC, delete expired nonces
select cron.schedule(
  'purge_expired_nonces',          -- job_name
  '17 3 * * *',                    -- cron schedule
  $$ delete from public.channel_verifications
     where expires_at < now(); $$  -- command
);