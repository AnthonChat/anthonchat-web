"use server";

import { notFound, redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/db/server";

/**
 * Minimal admin access helpers backed by an 'admins' lookup table.
 *
 * Table design (see migration in supabase/migrations):
 *   CREATE TABLE public.admins (
 *     user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS enabled with:
 *   -- - SELECT for the row owner (user_id = auth.uid())
 *   -- - No INSERT/UPDATE/DELETE for authenticated; service role only bypasses RLS
 */

export type CurrentUser = {
  id: string;
  email: string | null;
};

/**
 * Get the current authenticated user from Supabase (server-side).
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Check whether the given userId is present in the 'admins' table.
 * By default uses a normal server client (subject to RLS). If RLS is not yet configured,
 * you can temporarily set useServiceRole = true.
 */
export async function isAdmin(
  userId: string,
  options?: { useServiceRole?: boolean }
): Promise<boolean> {
  const useServiceRole = options?.useServiceRole === true;
  const supabase = useServiceRole ? createServiceRoleClient() : await createClient();

  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Log for diagnostics and fail closed
    console.error("[ADMIN:isAdmin] query error", { error, userId });
    return false;
  }
  return !!data;
}

/**
 * Require admin access in server components (e.g., layouts/pages in (admin) group).
 * Redirects to /:locale/login if unauthenticated, and throws notFound() if not admin.
 * Returns the CurrentUser for convenience when access is granted.
 */
export async function requireAdmin(locale?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = locale ? `/${locale}/login` : `/login`;
    redirect(target);
  }

  // Use service role to avoid any RLS/grant mismatches during the check
  const allowed = await isAdmin(user.id, { useServiceRole: true });
  if (!allowed) {
    // Optional fallback: allow via ADMIN_EMAILS during rollout
    const envList = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (user.email && envList.includes(user.email.toLowerCase())) {
      console.warn("[ADMIN:requireAdmin] allowed via ADMIN_EMAILS fallback", { userId: user.id, email: user.email });
      return user;
    }
    console.warn("[ADMIN:requireAdmin] not admin", { userId: user.id, email: user.email });
    // Hide existence of admin resources
    notFound();
  }
  return user;
}

/**
 * Require admin for API routes (Node runtime). Returns the user id if allowed.
 * Call this at the beginning of your route handlers. Respond with 401 using its result.
 *
 * Example:
 *   const userId = await requireAdminForApi();
 *   if (!userId) return new Response("Unauthorized", { status: 401 });
 */
export async function requireAdminForApi(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // For APIs, prefer a definitive check; use service role to avoid RLS edge-cases.
  const allowed = await isAdmin(user.id, { useServiceRole: true });
  return allowed ? user.id : null;
}