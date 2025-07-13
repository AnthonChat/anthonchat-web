import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'

export default async function AddChannelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add New Channel
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect a new communication channel
              </p>
            </div>
            <Link href="/dashboard/channels">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Channels
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Channel Type</CardTitle>
              <CardDescription>
                Select the type of communication channel you want to add
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-success" />
                    <h3 className="font-semibold mb-2">WhatsApp</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your WhatsApp Business account
                    </p>
                    <Button className="w-full" disabled>
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-info" />
                    <h3 className="font-semibold mb-2">Telegram</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your Telegram bot
                    </p>
                    <Button className="w-full" disabled>
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Channel integration is currently under development. 
                  <br />
                  Contact support for early access.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}