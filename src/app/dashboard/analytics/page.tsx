import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ComingSoon } from '@/components/ui/coming-soon'

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <ComingSoon 
      title="Analytics Dashboard"
      description="Advanced analytics and insights are currently under development. You'll be able to view detailed usage statistics, performance metrics, and data visualizations soon."
    />
  );
}