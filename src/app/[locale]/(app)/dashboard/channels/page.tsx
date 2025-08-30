import { createClient } from "@/lib/db/server";
import { getUserChannels } from "@/lib/queries/channels";
import { ChannelManagement } from "@/components/features/channels/ChannelManagement";
import { MessageSquare } from "lucide-react";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function ChannelsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const tDash = await getTranslations('dashboard');

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  // Fetch channels and subscription data
  const [channels] = await Promise.all([getUserChannels(claims.claims.sub)]);

  return (
    <div>
      <DashboardHeader
        title={tDash('channels.title')}
        description={tDash('channels.description')}
        backHref="/dashboard"
        variant="enhanced"
        icon={<MessageSquare className="h-4 w-4 sm:h-6 sm:w-6" />}
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <ChannelManagement channels={channels} />
      </main>
    </div>
  );
}
