import { signUp } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Login from "../login";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    <Login
      action={signUp}
      message={resolvedSearchParams?.message}
      title="Create an Account"
      description="Sign up for a new AnthonChat account"
      footer={
        <>
          <Button className="w-full">Sign Up</Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Already have an account? Sign In</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          name="email"
          placeholder="you@example.com"
          required
          type="email"
          className="h-11"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          required
          className="h-11"
        />
      </div>
    </Login>
  );
}
