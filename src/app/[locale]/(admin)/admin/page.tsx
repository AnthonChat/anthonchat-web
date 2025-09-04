import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={`/${locale}/admin/analytics`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Engagement and revenue dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View analytics sections
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/users`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Elenco utenti, messaggi, canali e abbonamenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View users overview
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
