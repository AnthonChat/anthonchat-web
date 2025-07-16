import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const code = resolvedSearchParams.code;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect("/dashboard");
    }
  }

  return redirect("/login?message=Could not authenticate user");
}
