import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignupForm from "@/components/features/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  if (claims) {
    return redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;

  return <SignupForm message={resolvedSearchParams?.message} />;
}
