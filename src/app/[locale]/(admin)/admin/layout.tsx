import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { loadMessages } from "@/lib/i18n/messages";
import { isSupportedLocale, type Locale } from "@/i18n/routing";
import { LocaleLink } from "@/components/ui/locale-link";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Loading } from "@/components/ui/loading";
import { Suspense } from "react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? (rawLocale as Locale) : "en";

  await requireAdmin(locale);

  // Resolve nav label from i18n (fallback to English literal)
  let broadcastLabel = "Broadcast";
  try {
    const messages = await loadMessages(locale);
    broadcastLabel = (messages as { admin?: { broadcast?: { nav?: { broadcast?: string } } } })?.admin?.broadcast?.nav?.broadcast ?? broadcastLabel;
  } catch {
    // ignore and keep fallback
  }

  return (
    <div className="min-h-screen">
      <nav
        aria-label="Admin"
        className="sticky top-0 z-10 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto max-w-screen-2xl px-4 py-2 flex flex-wrap items-center gap-3">
          <LocaleLink href="/admin" className="text-sm font-medium hover:underline underline-offset-4">
            Admin
          </LocaleLink>
          <div className="h-4 w-px bg-border" />
          <LocaleLink
            href="/admin/analytics"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            Analytics
          </LocaleLink>
          <LocaleLink
            href="/admin/users"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            Users
          </LocaleLink>
          <LocaleLink
            href="/admin/broadcast"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
          >
            {broadcastLabel}
          </LocaleLink>
        </div>
      </nav>
      <main className="mx-auto max-w-screen-2xl">
        <ErrorBoundary
          fallback={
            <div className="min-h-[400px] flex items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                  Admin Dashboard Error
                </h2>
                <p className="text-muted-foreground">
                  Something went wrong loading the admin dashboard.
                </p>
              </div>
            </div>
          }
        >
          <Suspense
            fallback={
              <Loading
                size="lg"
                text="Loading admin dashboard..."
                className="min-h-[400px]"
              />
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}