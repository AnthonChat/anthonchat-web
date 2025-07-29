import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserChannels } from '@/lib/queries/channels'
import { ChannelManagement } from '@/components/dashboard/ChannelManagement'
import { MessageSquare } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default async function ChannelsPage() {
  const supabase = await createClient();

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  if (!claims) {
    return redirect("/login");
  }

  // Fetch channels and subscription data
  const [channels] = await Promise.all([
    getUserChannels(claims.claims.sub),
  ])

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Channel Management"
        description="Manage your connected communication channels"
        backHref="/dashboard"
        icon={<MessageSquare className="h-5 w-5" />}
      />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <ChannelManagement channels={channels} />
      </main>
    </DashboardLayout>
  );
}