import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchAdminUserOverview,
  fetchAdminUserMessages,
  type AdminUserOverview,
  type AdminUserMessage,
} from "@/lib/admin/user-detail";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createHmac } from "node:crypto";
import { BarChart3 } from "lucide-react";

type PageProps = {
  params: Promise<{ locale: string; userId: string }>;
  searchParams?: Promise<{ limit?: string; order?: "asc" | "desc" }>;
};

function getExportSecret() {
  return process.env.EXPORT_TOKEN_SECRET || "dev-secret";
}

function buildExportToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes
  const payload = Buffer.from(JSON.stringify({ userId, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", getExportSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: AdminUserOverview["subscription"]["normalized_status"]) {
  switch (status) {
    case "subscribed":
      return "Subscribed";
    case "trialing":
      return "Trialing";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    default:
      return "Unsubscribed";
  }
}

function statusVariant(status: AdminUserOverview["subscription"]["normalized_status"]): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "past_due") return "destructive";
  if (status === "subscribed" || status === "trialing") return "default";
  return "secondary";
}

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { locale, userId } = await params;
  const resolvedSearchParams = await searchParams

  const limit = Math.min(
    2000,
    Math.max(1, Number(resolvedSearchParams?.limit ?? 200) || 200)
  );
  const order = (resolvedSearchParams?.order === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";

  const [overview, messages] = await Promise.all([
    fetchAdminUserOverview(userId),
    fetchAdminUserMessages(userId, { limit, order }),
  ]);

  if (!overview) {
    return notFound();
  }

  const fullName =
    [overview.first_name, overview.last_name].filter(Boolean).join(" ").trim() ||
    overview.nickname ||
    "—";

  const baseHref = `/${locale}/admin/users/${userId}`;
  const toggleOrderHref = `${baseHref}?order=${order === "asc" ? "desc" : "asc"}&limit=${limit}`;
  const limits = [100, 200, 500, 1000].map((v) => ({
    v,
    href: `${baseHref}?order=${order}&limit=${v}`,
  }));
  const exportToken = buildExportToken(userId);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">User overview</h1>
          <p className="text-sm text-muted-foreground">
            Dettagli utente e cronologia messaggi
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/admin/users`}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Back to Users
          </Link>
          <Link
            href={`/${locale}/admin`}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Admin Home
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Basic info and subscription</CardDescription>
              </div>
              <Link
                href={`/${locale}/admin/analytics?userId=${userId}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                View Analytics
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">{fullName}</div>
              <div className="text-xs text-muted-foreground">{overview.email}</div>
              <div className="text-[10px] text-muted-foreground">User ID</div>
              <div className="font-mono text-[11px] break-all">{overview.id}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Created</div>
              <div className="text-sm">
                {formatDateTime(overview.created_at)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Channels</div>
              <div className="text-sm">{overview.channels_count}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Total messages (all-time)</div>
              <div className="text-sm">{overview.messages_count.toLocaleString()}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Subscription</div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(overview.subscription.normalized_status)}>
                  {statusLabel(overview.subscription.normalized_status)}
                </Badge>
                {overview.subscription.stripe_status ? (
                  <span className="text-xs text-muted-foreground">
                    ({overview.subscription.stripe_status})
                  </span>
                ) : null}
              </div>
              {overview.subscription.current_period_start ? (
                <div className="text-[10px] text-muted-foreground">
                  Period:{" "}
                  {new Date((overview.subscription.current_period_start ?? 0) * 1000).toLocaleDateString()}{" "}
                  →{" "}
                  {overview.subscription.current_period_end
                    ? new Date(overview.subscription.current_period_end * 1000).toLocaleDateString()
                    : "—"}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Messages</CardTitle>
            <CardDescription>
              {order === "asc" ? "Chronological (old → new)" : "Reverse chronological (new → old)"} · showing up to {limit}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={toggleOrderHref}
                  className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                >
                  Toggle order
                </Link>
                <span className="text-muted-foreground/30">·</span>
                {limits.map(({ v, href }, idx) => (
                  <span key={v} className="flex items-center gap-2">
                    <Link
                      href={href}
                      prefetch={false}
                      className={`text-xs underline underline-offset-4 ${
                        v === limit ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v}/page
                    </Link>
                    {idx < limits.length - 1 ? <span className="text-muted-foreground/30">|</span> : null}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Export</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={`/api/admin/users/${userId}/export?format=json&order=${order}&t=${exportToken}`} download>
                        Export JSON
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`/api/admin/users/${userId}/export?format=csv&order=${order}&t=${exportToken}`} download>
                        Export CSV
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`/api/admin/users/${userId}/export?format=txt&order=${order}&t=${exportToken}`} download>
                        Export TXT
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="text-xs text-muted-foreground">
                  {messages.length.toLocaleString()} rows
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Time</TableHead>
                    <TableHead className="w-[100px]">Role</TableHead>
                    <TableHead className="w-[140px]">Channel</TableHead>
                    <TableHead>Content</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No messages found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((m: AdminUserMessage) => (
                      <TableRow key={m.id} className="align-top">
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={m.role === "user" ? "secondary" : "default"}>
                            {m.role === "user" ? "User" : "Assistant"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {m.channel_id}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}