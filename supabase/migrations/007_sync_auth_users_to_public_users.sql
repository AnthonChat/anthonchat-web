/*===========================================================================
 007  Sync auth.users to public.users
===========================================================================*/

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing users that are missing from public.users
INSERT INTO public.users (id, email, nickname, first_name, last_name, onboarding_complete)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  false
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;