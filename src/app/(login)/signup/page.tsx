import { signUp } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Login from "../login";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  return (
    <Login action={signUp} message={resolvedSearchParams?.message}>
      <Label htmlFor="email">Email</Label>
      <Input
        className="rounded-md px-4 py-2 bg-inherit border mb-6"
        name="email"
        placeholder="you@example.com"
        required
      />
      <Label htmlFor="password">Password</Label>
      <Input
        className="rounded-md px-4 py-2 bg-inherit border mb-6"
        type="password"
        name="password"
        placeholder="••••••••"
        required
      />
      <Button className="bg-green-600 rounded-md px-4 py-2 text-foreground mb-2">
        Sign Up
      </Button>
    </Login>
  );
}
