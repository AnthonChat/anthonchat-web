-- Add sample tiers for subscription plans
INSERT INTO public.tiers (slug, name, max_tokens, max_requests, features, is_active)
VALUES 
  ('free', 'Free Trial', 1000, 50, '{"features": ["Basic chat", "2 channels", "Email support"]}', true),
  ('basic', 'Basic Plan', 5000, 200, '{"features": ["Advanced chat", "5 channels", "Priority support", "Analytics"]}', true),
  ('standard', 'Standard Plan', 15000, 500, '{"features": ["All Basic features", "10 channels", "Custom integrations", "Advanced analytics"]}', true),
  ('pro', 'Pro Plan', 50000, 1500, '{"features": ["All Standard features", "Unlimited channels", "API access", "White-label options"]}', true),
  ('enterprise', 'Enterprise Plan', NULL, NULL, '{"features": ["All Pro features", "Custom limits", "Dedicated support", "SLA guarantee"]}', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  max_tokens = EXCLUDED.max_tokens,
  max_requests = EXCLUDED.max_requests,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- Ensure channels exist (they should already be there from the first migration)
INSERT INTO public.channels (name, mandatory, is_active)
VALUES 
  ('telegram', true, true),
  ('whatsapp', true, true),
  ('discord', false, true),
  ('slack', false, true)
ON CONFLICT (name) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  is_active = EXCLUDED.is_active;

-- Add sample Stripe price IDs for tiers (these would be real Stripe price IDs in production)
UPDATE public.tiers SET stripe_price_id = 
  CASE 
    WHEN slug = 'basic' THEN 'price_basic_monthly_sample'
    WHEN slug = 'standard' THEN 'price_standard_monthly_sample'
    WHEN slug = 'pro' THEN 'price_pro_monthly_sample'
    WHEN slug = 'enterprise' THEN 'price_enterprise_monthly_sample'
    ELSE stripe_price_id
  END
WHERE slug IN ('basic', 'standard', 'pro', 'enterprise');

-- Add sample usage data for demonstration
-- Note: In production, this would be populated by your n8n workflows
DO $$
DECLARE
  sample_user_id uuid;
  current_month_start timestamptz;
  current_month_end timestamptz;
  last_month_start timestamptz;
  last_month_end timestamptz;
BEGIN
  -- Get a sample user ID (this will only work if there are users in the system)
  SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
  
  -- Only insert sample data if we have a user
  IF sample_user_id IS NOT NULL THEN
    -- Calculate current and last month periods
    current_month_start := date_trunc('month', now());
    current_month_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');
    last_month_start := date_trunc('month', now() - interval '1 month');
    last_month_end := (date_trunc('month', now()) - interval '1 second');
    
    -- Insert current month usage
    INSERT INTO public.usage_records (user_id, tokens_used, requests_used, period_start, period_end)
    VALUES (sample_user_id, 750, 35, current_month_start, current_month_end)
    ON CONFLICT (user_id, period_start, period_end) DO NOTHING;
    
    -- Insert last month usage
    INSERT INTO public.usage_records (user_id, tokens_used, requests_used, period_start, period_end)
    VALUES (sample_user_id, 1200, 48, last_month_start, last_month_end)
    ON CONFLICT (user_id, period_start, period_end) DO NOTHING;
  END IF;
END
$$;