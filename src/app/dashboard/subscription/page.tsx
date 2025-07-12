import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserSubscription } from '@/lib/queries/subscription'
import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement'

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch subscription data
  const subscription = await getUserSubscription(user.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Subscription Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your subscription and billing settings
              </p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <SubscriptionManagement subscription={subscription} userId={user.id} />
      </main>
    </div>
  );
}