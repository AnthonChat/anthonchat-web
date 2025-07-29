import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ComingSoon } from '@/components/ui/coming-soon'

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  if (!claims) {
    return redirect("/login");
  }

  return (
    <ComingSoon 
      title="Account Settings"
      description="Account settings are currently under development. You'll be able to manage your profile, notifications, security, and appearance preferences soon."
    />
  );
}