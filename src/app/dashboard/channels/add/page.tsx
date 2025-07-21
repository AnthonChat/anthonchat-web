import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAllChannels, getUserChannels } from '@/lib/queries/channels'
import { AddChannelForm } from '@/components/dashboard/AddChannelForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default async function AddChannelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch available channels and user's existing channels
  const [availableChannels, userChannels] = await Promise.all([
    getAllChannels(),
    getUserChannels(user.id),
  ])

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Add Channel"
        description="Connect a new channel to start receiving messages"
        backHref="/dashboard/channels"
        icon={<Plus className="h-5 w-5" />}
      />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Description */}
          <div className="text-center">
            <h2 className="text-xl font-medium text-foreground">
              Choose Your Communication Platform
            </h2>
            <p className="mt-2 text-muted-foreground">
              Select from our supported channels to start engaging with your audience
            </p>
          </div>

          {/* Form */}
          <AddChannelForm 
            availableChannels={availableChannels}
            existingChannels={userChannels}
          />

          {/* Help */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Need help setting up your channel?{' '}
              <Button variant="link" className="h-auto p-0 text-sm">
                View Documentation
              </Button>
            </p>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}