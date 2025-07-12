import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signIn } from "../actions";
import Login from "../login";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const supabase = await createClient();
  const { message } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/dashboard");
  }

  return (
    <Login action={signIn} message={message}>
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
      <Button className="bg-green-700 rounded-md px-4 py-2 text-foreground mb-2">
        Sign In
      </Button>
      <Link
        href="/signup"
        className="border border-foreground/20 rounded-md px-4 py-2 text-foreground no-underline flex justify-center items-center text-sm"
      >
        Don&apos;t have an account? Sign Up
      </Link>
    </Login>
  );
}
