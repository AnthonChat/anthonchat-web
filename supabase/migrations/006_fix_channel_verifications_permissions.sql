/*===========================================================================
 006  Fix channel_verifications permissions
===========================================================================*/

-- Grant necessary permissions for channel_verifications table
GRANT SELECT, INSERT, UPDATE ON public.channel_verifications TO authenticated;

-- Also grant to anon role for completeness
GRANT SELECT, INSERT, UPDATE ON public.channel_verifications TO anon;