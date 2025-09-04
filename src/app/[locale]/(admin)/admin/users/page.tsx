import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchAdminUsersSummary, type AdminUserSummary } from "@/lib/admin/users";
import { DataTable } from "@/components/admin/users/data-table";
import { columns } from "@/components/admin/users/columns";

type PageProps = {
  params: { locale: string };
  searchParams?: { page?: string; limit?: string };
};

export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  const { locale } = params;

  // Server-side paging (slice); client will sort/filter within the current slice
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams?.limit ?? 50) || 50));
  const offset = (page - 1) * limit;

  const users: AdminUserSummary[] = await fetchAdminUsersSummary({
    limit,
    offset,
    orderBy: "created_at",
    ascending: false,
  });

  // Extend rows with a flattened subscription_status field used by the DataTable
  const rows = users.map((u) => ({
    ...u,
    subscription_status: u.subscription.normalized_status,
  }));

  const baseHref = `/${locale}/admin/users`;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Users</h1>
          <p className="text-sm text-muted-foreground">
            Elenco utenti con canali collegati, messaggi inviati, data di creazione e stato abbonamento.
          </p>
        </div>
        <Link
          href={`/${locale}/admin`}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Back to Admin
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {`Mostrati ${users.length} utenti. Ordina e filtra per colonna. Modifica il limite per pagina con il selettore.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            page={page}
            limit={limit}
            baseHref={baseHref}
          />
          <p className="text-xs text-muted-foreground mt-4">
            Nota: &quot;Messages&quot; è calcolato dai usage records (requests_used) come proxy dei messaggi
            nel periodo corrente di fatturazione. Per conteggi storici esatti si può interrogare &quot;chat_messages&quot;
            (più pesante su dataset grandi).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}