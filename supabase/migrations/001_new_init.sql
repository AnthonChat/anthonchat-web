/* INPUT: {{ $json.id }}  ← channel-specific user-id (e.g. Telegram username) */

WITH channel_lookup AS (                    -- the channel that sent the request
  SELECT
    uc.user_id,
    uc.id               AS user_channel_id,
    uc.channel_user_id,
    ch.name             AS request_channel
  FROM   public.user_channels uc
  JOIN   public.channels      ch ON ch.id = uc.channel_id
  WHERE  uc.channel_user_id = '{{ $json.id }}'
  LIMIT  1
),

channel_list AS (                           -- every channel the user has linked
  SELECT
    cl.user_id,
    array_agg(DISTINCT ch.name) AS channels_used
  FROM   channel_lookup       cl
  JOIN   public.user_channels uc ON uc.user_id = cl.user_id
  JOIN   public.channels      ch ON ch.id      = uc.channel_id
  GROUP  BY cl.user_id
),

usage_stats AS (                            -- message & token counts per role
  SELECT
    uc.user_id,

    /* message counts ----------------------------------------------------- */
    COALESCE(SUM(CASE WHEN cm.role = 'user'      THEN 1 END), 0)
      AS user_messages,
    COALESCE(SUM(CASE WHEN cm.role = 'assistant' THEN 1 END), 0)
      AS assistant_messages,

    /* token totals ------------------------------------------------------- */
    COALESCE(SUM(CASE WHEN cm.role = 'user'
                      THEN public.num_tokens(cm.message) END), 0)
      AS user_tokens,
    COALESCE(SUM(CASE WHEN cm.role = 'assistant'
                      THEN public.num_tokens(cm.message) END), 0)
      AS assistant_tokens
  FROM   public.user_channels uc
  LEFT   JOIN public.chat_messages cm ON cm.user_channel_id = uc.id
  GROUP  BY uc.user_id
),

/* most-recent active / trial subscription ---------------------------------*/
active_sub AS (
  SELECT DISTINCT ON (s.user_id)
         s.user_id,
         s.status,
         t.slug              AS tier_slug,
         t.name              AS tier_name,
         t.max_tokens,
         t.max_requests,
         t.history_limit,                -- keep if you added this column
         s.current_period_end,
         s.stripe_subscription_id
  FROM   public.subscriptions s
  JOIN   public.tiers         t ON t.id = s.tier_id
  WHERE  s.status IN ('active','trialing')
  ORDER  BY s.user_id, s.current_period_start DESC
),

/* every channel that exists in the system ---------------------------------*/
all_active_channels AS (
  SELECT array_agg(name ORDER BY name) AS all_channels
  FROM   public.channels
  WHERE  is_active
)

SELECT
  /* 1. Identity ---------------------------------------------------------- */
  u.id IS NOT NULL                                       AS user_exists,
  u.id                                                   AS user_id,
  au.id                                                  AS auth_id,
  COALESCE(u.email, au.email)                            AS email,
  au.raw_user_meta_data ->> 'name'     AS name,
  au.raw_user_meta_data ->> 'surname'  AS surname,
  u.stripe_customer_id,

  /* 2. Channels ---------------------------------------------------------- */
  cl.request_channel,
  cl.channel_user_id,
  cl.user_channel_id,
  clist.channels_used,
  ac.all_channels,

  /* 3. Usage ------------------------------------------------------------- */
  COALESCE(us.user_messages,      0)                     AS user_messages,
  COALESCE(us.assistant_messages, 0)                     AS assistant_messages,
  COALESCE(us.user_messages,      0)
    + COALESCE(us.assistant_messages, 0)                 AS number_of_messages,

  COALESCE(us.user_tokens,        0)                     AS user_tokens,
  COALESCE(us.assistant_tokens,   0)                     AS assistant_tokens,
  COALESCE(us.user_tokens,        0)
    + COALESCE(us.assistant_tokens, 0)                   AS number_of_tokens,

  /* 4. Subscription ------------------------------------------------------ */
  asu.status                                             AS active_subscription_status,
  asu.tier_slug                                          AS active_subscription_tier,
  asu.tier_name                                          AS active_subscription_tier_name,
  asu.max_tokens                                         AS tier_token_limit,
  asu.max_requests                                       AS tier_request_limit,
  asu.history_limit                                      AS history_limit,
  asu.current_period_end                                 AS subscription_renews_at,
  asu.stripe_subscription_id

FROM   channel_lookup       cl
LEFT   JOIN public.users    u    ON u.id = cl.user_id
LEFT   JOIN auth.users      au   ON au.id = cl.user_id
LEFT   JOIN channel_list    clist ON clist.user_id = cl.user_id
LEFT   JOIN usage_stats     us    ON us.user_id = cl.user_id
LEFT   JOIN active_sub      asu   ON asu.user_id = cl.user_id
CROSS  JOIN all_active_channels ac;
