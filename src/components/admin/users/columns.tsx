"use client";

import * as React from "react";
import type { ColumnDef, Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { AdminUserSummary } from "@/lib/admin/users";

export type AdminUserRow = AdminUserSummary & {
  subscription_status: AdminUserSummary["subscription"]["normalized_status"];
};

function StatusBadge({
  status,
  stripe,
}: {
  status: AdminUserRow["subscription_status"];
  stripe: string | null;
}) {
  const label =
    status === "subscribed"
      ? "Subscribed"
      : status === "trialing"
      ? "Trialing"
      : status === "past_due"
      ? "Past due"
      : status === "canceled"
      ? "Canceled"
      : "Unsubscribed";

  const variant: React.ComponentProps<typeof Badge>["variant"] =
    status === "past_due"
      ? "destructive"
      : status === "subscribed"
      ? "default"
      : "secondary";

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant}>{label}</Badge>
      {stripe ? (
        <span className="text-xs text-muted-foreground">({stripe})</span>
      ) : null}
    </div>
  );
}

function DataTableColumnHeader({
  column,
  title,
  className,
}: {
  column: Column<AdminUserRow>;
  title: string;
  className?: string;
}) {
  const isAsc = column.getIsSorted() === "asc";
  const isDesc = column.getIsSorted() === "desc";

  return (
    <div className={className}>
      <Button
        variant="ghost"
        className="h-8 px-2 -ml-2"
        onClick={() => column.toggleSorting(isAsc)}
      >
        <span className="mr-2">{title}</span>
        <span className="text-muted-foreground text-xs">
          {isAsc ? "↑" : isDesc ? "↓" : "↕"}
        </span>
      </Button>
    </div>
  );
}

export const columns: ColumnDef<AdminUserRow>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User ID" />
    ),
    cell: ({ row }) => {
      const id: string = row.getValue("id");
      const short = id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{short}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => navigator.clipboard.writeText(id)}
            aria-label="Copy user id"
          >
            Copy
          </Button>
        </div>
      );
    },
  },
  {
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    sortingFn: (a, b) => {
      const fullA =
        `${a.original.first_name ?? ""} ${a.original.last_name ?? ""}`.trim() ||
        a.original.nickname ||
        "";
      const fullB =
        `${b.original.first_name ?? ""} ${b.original.last_name ?? ""}`.trim() ||
        b.original.nickname ||
        "";
      return fullA.localeCompare(fullB);
    },
    cell: ({ row }) => {
      const u = row.original;
      const full =
        [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
        u.nickname ||
        "—";
      return (
        <div className="flex flex-col">
          <span className="font-medium">{full}</span>
          <span className="text-xs text-muted-foreground">{u.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ getValue }) => {
      const iso: string = getValue() as string;
      let out = iso;
      try {
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) {
          out = d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
          });
        }
      } catch {}
      return <span className="whitespace-nowrap">{out}</span>;
    },
    sortingFn: (a, b) => {
      const ta = Date.parse(a.original.created_at);
      const tb = Date.parse(b.original.created_at);
      return ta - tb;
    },
  },
  {
    id: "channels",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Channels" />
    ),
    accessorFn: (row) => row.channels_count,
    cell: ({ row }) => {
      const u = row.original;
      const channels = u.channels;
      const count = u.channels_count;
      if (count === 0) return <span className="text-muted-foreground">0</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {channels.slice(0, 3).map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
          {channels.length > 3 ? (
            <span className="text-xs text-muted-foreground">
              +{channels.length - 3}
            </span>
          ) : null}
        </div>
      );
    },
    sortingFn: (a, b) => a.original.channels_count - b.original.channels_count,
  },
  {
    accessorKey: "messages_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Messages" />
    ),
    cell: ({ getValue }) => {
      const v = Number(getValue() as number);
      return <span>{Number.isFinite(v) ? v.toLocaleString() : "0"}</span>;
    },
    sortingFn: (a, b) => a.original.messages_count - b.original.messages_count,
  },
  {
    id: "subscription_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subscription" />
    ),
    accessorFn: (row) => row.subscription.normalized_status,
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div>
          <StatusBadge
            status={u.subscription_status}
            stripe={u.subscription.stripe_status}
          />
          <div className="text-[10px] text-muted-foreground mt-1">
            {u.subscription.current_period_start
              ? `Period: ${new Date(
                  u.subscription.current_period_start * 1000
                ).toLocaleDateString()} → ${
                  u.subscription.current_period_end
                    ? new Date(
                        u.subscription.current_period_end * 1000
                      ).toLocaleDateString()
                    : "—"
                }`
              : null}
          </div>
        </div>
      );
    },
    sortingFn: (a, b) =>
      a.original.subscription_status.localeCompare(
        b.original.subscription_status
      ),
  },
];
