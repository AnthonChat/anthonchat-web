import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserChannels } from '@/lib/queries/channels'
import { ChannelManagement } from '@/components/dashboard/ChannelManagement'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ChannelsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch channels and subscription data
  const [channels] = await Promise.all([
    getUserChannels(user.id),
  ])

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Channel Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your connected communication channels
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <ChannelManagement channels={channels} />
      </main>
    </div>
  );
}