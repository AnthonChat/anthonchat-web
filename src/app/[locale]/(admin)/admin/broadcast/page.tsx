import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TemplateDispatcher } from "@/components/admin/templates/TemplateDispatcher";
import { getAdminChannelOptions } from "@/lib/admin/templates";
import { getMetaTemplates, type ParsedMetaTemplate } from "@/lib/meta/templates";
import { isSupportedLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminBroadcastPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const [templates, templateError] = await (async (): Promise<[ParsedMetaTemplate[], string | null]> => {
    try {
      const data = await getMetaTemplates();
      return [data, null];
    } catch (error) {
      console.error("[ADMIN_TEMPLATES_FETCH_ERROR]", error);
      return [[], (error as Error).message];
    }
  })();

  const channelOptions = await getAdminChannelOptions();
  const defaultFilters = {
    channelIds: channelOptions.some((option) => option.id === "whatsapp")
      ? ["whatsapp"]
      : channelOptions.map((option) => option.id),
    verifiedOnly: true,
    limit: 200,
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Broadcast</h1>
          <p className="text-sm text-muted-foreground">
            Locale: {locale}. Filter users, prepare parameters and trigger Meta-approved WhatsApp templates.
          </p>
        </div>
      </div>

      {templateError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Unable to load templates: {templateError}
        </div>
      )}

      <Card className="border-dashed border-border">
        <CardHeader>
          <CardTitle>Dispatch Strategy</CardTitle>
          <CardDescription>
            Filters run against Supabase with service-role access while templates are fetched directly from
            Meta. Every send request validates parameters and logs failures for auditability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateDispatcher
            templates={templates}
            channelOptions={channelOptions}
            defaultFilters={defaultFilters}
          />
        </CardContent>
      </Card>
    </div>
  );
}
