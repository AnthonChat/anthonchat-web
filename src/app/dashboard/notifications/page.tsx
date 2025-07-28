import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ComingSoon } from '@/components/ui/coming-soon'

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <ComingSoon 
      title="Notifications"
      description="The notifications system is currently under development. You'll be able to view and manage your notifications, configure preferences, and track account activity soon."
    />
  );
}