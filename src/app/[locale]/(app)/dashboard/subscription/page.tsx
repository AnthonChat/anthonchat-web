import { createClient } from "@/lib/db/server";
import { SubscriptionPageClient } from "@/components/features/subscription/SubscriptionPageClient";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { CreditCard } from "lucide-react";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const tDash = await getTranslations('dashboard');

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  return (
    <div>
      <DashboardHeader
        title={tDash('subscription.title')}
        description={tDash('subscription.description')}
        backHref="/dashboard"
        variant="enhanced"
      />

      {/* Enhanced Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Welcome Banner */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 bg-primary/5 rounded-xl sm:rounded-2xl shadow-xl animate-slide-up border-2 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 sm:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground leading-tight">
                {tDash('subscription.bannerTitle')}
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg font-medium leading-relaxed">
                {tDash('subscription.bannerDescription')}
              </p>
            </div>
            <div className="flex-shrink-0 self-center sm:self-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Client-side subscription management with real-time updates */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <SubscriptionPageClient userId={claims.claims.sub} />
        </div>
      </main>
    </div>
  );
}
