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
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Download, UserCheck, Mail } from "lucide-react";

import type { AdminUserSummary } from "@/lib/admin/users";
// import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  // Local state for tanstack behaviors (sorting + per-column filters + visibility + row selection)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "messages_count", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ email: false });
  const [rowSelection, setRowSelection] = React.useState({});

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

  // Add checkbox column for bulk actions
  const checkboxColumn: ColumnDef<AdminUserRow, unknown> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center"
      >
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };

  const table = useReactTable({
    data,
    columns: [checkboxColumn, ...augmentedColumns],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Expose paging context so the "#" column can compute absolute indices consistently after sorting
    meta: { page, limit },
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

  // Bulk actions
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  // Virtual scrolling setup
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 53, // estimated row height
    overscan: 10,
  });

  // Use virtual scrolling for large datasets (>100 rows)
  const useVirtualScrolling = table.getRowModel().rows.length > 100;

  return (
    <div className="space-y-3">
      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Subscription Reminder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Apply Tag
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.toggleAllPageRowsSelected(false)}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar: filters + column visibility + page-size selector */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Advanced Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* User ID Filter */}
          <Input
            placeholder="User ID…"
            value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("id")?.setFilterValue(e.target.value)}
            className="w-[140px]"
          />

          {/* Email Filter */}
          <Input
            placeholder="Email…"
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("email")?.setFilterValue(e.target.value)}
            className="w-[160px]"
          />

          {/* Subscription Status Filter */}
          <Select
            value={(table.getColumn("subscription_status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => table.getColumn("subscription_status")?.setFilterValue(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>

          {/* Channels Filter */}
          <Select
            value={(table.getColumn("channels")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => table.getColumn("channels")?.setFilterValue(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="discord">Discord</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(table.getState().columnFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
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
                  const isIndex = header.column.id === "#";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        isIndex &&
                          "sticky left-0 z-10 bg-background w-12 min-w-[3rem] max-w-[3rem] border-r"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            ref={tableContainerRef}
            style={{
              height: useVirtualScrolling ? `${rowVirtualizer.getTotalSize()}px` : 'auto',
              overflow: useVirtualScrolling ? 'auto' : 'visible',
            }}
          >
            {table.getRowModel().rows?.length ? (
              useVirtualScrolling ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => router.push(`${baseHref}/${row.original.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isIndex = cell.column.id === "#";
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              isIndex &&
                                "sticky left-0 z-10 bg-background w-12 min-w-[3rem] max-w-[3rem] border-r"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => router.push(`${baseHref}/${row.original.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isIndex = cell.column.id === "#";
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            isIndex &&
                              "sticky left-0 z-10 bg-background w-12 min-w-[3rem] max-w-[3rem] border-r"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )
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