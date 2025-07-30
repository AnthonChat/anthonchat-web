import Link from "next/link";
import { createClient } from "@/lib/db/server";
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

  const { data: claims } = await supabase.auth.getClaims();

  if (claims) {
    return redirect("/dashboard");
  }

  return (
    <Login
      action={signIn}
      message={message}
      title="Welcome Back!"
      description="Sign in to your AnthonChat account"
      footer={
        <>
          <Button className="w-full">Sign In</Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/signup">Don&apos;t have an account? Sign Up</Link>
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
