import { createClient } from "@/lib/db/server";
import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/login", _request.url), { status: 302 });
}
