// app/dashboard/page.tsx:

import { createClient } from "@/lib/db/server";
import { LogOut, User } from "lucide-react";
import { getUserSubscription } from "@/lib/queries/subscription";
import { getUserUsage } from "@/lib/queries/usage";
import { SubscriptionCard } from "@/components/features/subscription/SubscriptionCard";
import { ChannelsOverview } from "@/components/features/channels/ChannelsOverview";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/features/dashboard/ThemeToggle";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { localeRedirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

export default async function DashboardPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const tDash = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) {
    localeRedirect("/login", locale as Locale);
  }

  const userId = claims.claims.sub;
  const userEmail = claims.claims.email;

  const { data: isOnboarded, error: rpcError } = await supabase.rpc(
    "check_onboarding_complete",
    {
      user_id_param: userId,
    }
  );

  if (rpcError) {
    console.error("DASHBOARD_ONBOARDING_CHECK_FAILED", {
      rpcError: rpcError.message,
      userId: userId,
    });
    // It's safe to proceed, allowing the user to access the dashboard
    // even if the check fails, preventing them from being locked out.
  }

  if (!isOnboarded) {
    localeRedirect("/signup/complete", locale as Locale);
  }

  // --- Step 4: Fetch all necessary data in parallel ---
  // This is efficient and leverages our refactored query functions.
  // The `subscription` and `usage` objects now have a new, more detailed structure.
  const [subscription, usage] = await Promise.all([
    getUserSubscription(userId),
    getUserUsage(userId),
  ]);

  return (
    <div>
      <DashboardHeader
        title={tDash('header.title')}
        description={tDash('header.welcomeBack', { email: userEmail })}
        variant="enhanced"
        actions={
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <form action="/api/auth/signout" method="post">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="hover-lift group"
              >
                <LogOut className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                {tCommon('actions.signOut')}
              </Button>
            </form>
          </div>
        }
      />

      {/* Enhanced Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-8 bg-primary/5 rounded-2xl shadow-xl animate-slide-up border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">
                {tDash('banner.welcomeAgain')}
              </h2>
              <p className="text-muted-foreground text-lg font-medium">
                {tDash('banner.happening')}
                
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <User className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* --- Step 5: Pass the new data structures as props --- */}
            {/* The props passed here are now correct. The next step is to update the SubscriptionCard component itself. */}
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <SubscriptionCard
                subscription={subscription}
                usage={usage}
                userId={userId}
              />
            </div>

            {/* Channels Overview */}
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <ChannelsOverview userId={userId} />
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-8">
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <QuickActions />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
