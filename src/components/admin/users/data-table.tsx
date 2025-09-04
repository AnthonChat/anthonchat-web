"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { AdminUserSummary } from "@/lib/admin/users";
// import { Badge } from "@/components/ui/badge";

// Row type extended with flattened subscription status for easier column filters
export type AdminUserRow = AdminUserSummary & {
  subscription_status: AdminUserSummary["subscription"]["normalized_status"];
};

type DataTableProps = {
  columns: ColumnDef<AdminUserRow, unknown>[];
  data: AdminUserRow[];
  // Server paging context
  page: number;
  limit: number;
  baseHref: string; // e.g. /en/admin/users
};

// function StatusBadge({
//   status,
//   stripe,
// }: {
//   status: AdminUserRow["subscription_status"];
//   stripe: string | null;
// }) {
//   const label =
//     status === "subscribed"
//       ? "Subscribed"
//       : status === "trialing"
//       ? "Trialing"
//       : status === "past_due"
//       ? "Past due"
//       : status === "canceled"
//       ? "Canceled"
//       : "Unsubscribed";

//   const variant: React.ComponentProps<typeof Badge>["variant"] =
//     status === "past_due" ? "destructive" : status === "subscribed" ? "default" : "secondary";

//   return (
//     <div className="flex items-center gap-2">
//       <Badge variant={variant}>{label}</Badge>
//       {stripe ? <span className="text-xs text-muted-foreground">({stripe})</span> : null}
//     </div>
//   );
// }

export function DataTable({ columns, data, page, limit, baseHref }: DataTableProps) {
  const router = useRouter();

  // Local state for tanstack behaviors (sorting + per-column filters + visibility)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "messages_count", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ email: false });

  // Augment columns with a hidden "email" column for per-column filtering
  const augmentedColumns = React.useMemo(() => {
    const emailColumn: ColumnDef<AdminUserRow, unknown> = {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => {
        const v = (getValue() as string) ?? "";
        return <span className="text-xs text-muted-foreground">{v}</span>;
      },
      // visible is controlled by columnVisibility; default hidden
      enableHiding: true,
    };
    return [...columns, emailColumn] as ColumnDef<AdminUserRow, unknown>[];
  }, [columns]);

  const table = useReactTable({
    data,
    columns: augmentedColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Server navigation helpers
  const pushWith = React.useCallback(
    (nextPage: number, nextLimit: number) => {
      const url = `${baseHref}?page=${encodeURIComponent(nextPage)}&limit=${encodeURIComponent(nextLimit)}`;
      router.push(url);
    },
    [router, baseHref]
  );

  const canPrev = page > 1;
  const canNext = data.length === limit; // heuristic when total count is unknown

  return (
    <div className="space-y-3">
      {/* Toolbar: filters + column visibility + page-size selector */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {/* Filter: User ID */}
          <Input
            placeholder="Filter by User ID…"
            value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("id")?.setFilterValue(e.target.value)}
            className="w-[180px]"
          />
          {/* Filter: Email (hidden column but works for filtering) */}
          <Input
            placeholder="Filter by Email…"
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("email")?.setFilterValue(e.target.value)}
            className="w-[200px]"
          />
          {/* Filter: Subscription status via simple input (subscribed, trialing, past_due, canceled, unsubscribed) */}
          <Input
            placeholder="Filter by Status…"
            value={(table.getColumn("subscription_status")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("subscription_status")?.setFilterValue(e.target.value)}
            className="w-[180px]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Page size selector (server limit) */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Per page
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={String(limit)}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                pushWith(1, next); // reset to first page on limit change
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => router.push(`${baseHref}/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pager (server navigation) */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page} · Limit {limit}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushWith(page - 1, limit)}
            disabled={!canPrev}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushWith(page + 1, limit)}
            disabled={!canNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}