-- Create usage tracking table
  CREATE TABLE IF NOT EXISTS public.usage_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tokens_used integer NOT NULL DEFAULT 0,
    requests_used integer NOT NULL DEFAULT 0,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Ensure one record per user per period
    UNIQUE(user_id, period_start, period_end)
  );

  -- Add RLS policy for usage records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_records_own ON public.usage_records;
CREATE POLICY usage_records_own ON public.usage_records
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

  -- Add updated_at trigger
  CREATE OR REPLACE TRIGGER set_updated_at_usage_records
    BEFORE UPDATE ON public.usage_records
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_updated_at();

  -- Function to get or create current month usage record
CREATE OR REPLACE FUNCTION public.get_current_usage(user_id_param uuid)
RETURNS TABLE(
  tokens_used integer,
  requests_used integer,
  period_start timestamptz,
  period_end timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  p_period_start timestamptz;
  p_period_end timestamptz;
BEGIN
  -- Calculate current month period
  p_period_start := date_trunc('month', now());
  p_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');
  
  -- Get or create usage record for current period
  INSERT INTO public.usage_records (user_id, tokens_used, requests_used, period_start, period_end)
  VALUES (user_id_param, 0, 0, p_period_start, p_period_end)
  ON CONFLICT (user_id, period_start, period_end) DO NOTHING;
  
  -- Return current usage
  RETURN QUERY
  SELECT 
    ur.tokens_used,
    ur.requests_used,
    ur.period_start,
    ur.period_end
  FROM public.usage_records ur
  WHERE ur.user_id = user_id_param 
    AND ur.period_start = p_period_start
    AND ur.period_end = p_period_end;
END;
$$;

  -- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
  user_id_param uuid,
  tokens_increment integer DEFAULT 0,
  requests_increment integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  p_period_start timestamptz;
  p_period_end timestamptz;
BEGIN
  -- Calculate current month period
  p_period_start := date_trunc('month', now());
  p_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');
  
  -- Insert or update usage record
  INSERT INTO public.usage_records (user_id, tokens_used, requests_used, period_start, period_end)
  VALUES (user_id_param, tokens_increment, requests_increment, p_period_start, p_period_end)
  ON CONFLICT (user_id, period_start, period_end) 
  DO UPDATE SET 
    tokens_used = public.usage_records.tokens_used + tokens_increment,
    requests_used = public.usage_records.requests_used + requests_increment,
    updated_at = now();
END;
$$;

  COMMIT;