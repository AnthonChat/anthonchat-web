import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignupForm from "@/components/signup/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;

  return <SignupForm message={resolvedSearchParams?.message} />;
}
