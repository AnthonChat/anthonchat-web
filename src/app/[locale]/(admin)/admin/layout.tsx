import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParamas = await params
  await requireAdmin(resolvedParamas?.locale);
  return children;
}