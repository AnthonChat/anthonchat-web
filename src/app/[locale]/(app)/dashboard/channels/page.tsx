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
        icon={<MessageSquare className="h-5 w-5" />}
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <ChannelManagement channels={channels} />
      </main>
    </div>
  );
}
