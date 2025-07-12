import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  const code = searchParams.code;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect("/dashboard");
    }
  }

  return redirect("/login?message=Could not authenticate user");
}
