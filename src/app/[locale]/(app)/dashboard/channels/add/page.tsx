import { createClient } from "@/lib/db/server";
import { getAllChannels, getUserChannels } from "@/lib/queries/channels";
import { AddChannelForm } from "@/components/features/channels/AddChannelForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function AddChannelPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const tDash = await getTranslations('dashboard');

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  // Fetch available channels and user's existing channels
  const [availableChannels, userChannels] = await Promise.all([
    getAllChannels(),
    getUserChannels(claims.claims.sub),
  ]);

  return (
    <div>
      <DashboardHeader
        title={tDash('channelsAdd.title')}
        description={tDash('channelsAdd.description')}
        backHref="/dashboard/channels"
        icon={<Plus className="h-5 w-5" />}
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Description */}
          <div className="text-center">
            <h2 className="text-xl font-medium text-foreground">
              {tDash('channelsAdd.chooseTitle')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {tDash('channelsAdd.chooseDescription')}
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
              {tDash('channelsAdd.helpPrefix')}{" "}
              <Button variant="link" className="h-auto p-0 text-sm">
                {tDash('channelsAdd.viewDocs')}
              </Button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
