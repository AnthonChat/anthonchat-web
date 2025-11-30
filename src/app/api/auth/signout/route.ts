import { createClient } from "@/lib/db/server";
import { NextResponse } from "next/server";

export async function OPTIONS() {
  // CORS preflight for signout
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      "Access-Control-Max-Age": "86400"
    }
  });
}

async function handleSignOut(request: Request) {
  const supabase = await createClient();
  
  // Try to sign out - this will work if there's a valid session
  // We don't check getSession() first because signOut() should be called
  // to ensure cookies are properly cleared even if session appears missing
  const { error } = await supabase.auth.signOut();
  
  // Log error for debugging but don't fail the redirect
  // "Auth session missing!" is expected when cookies are already cleared
  if (error) {
    console.log('[signout] signOut error (usually harmless):', error.message);
  }
  
  // Always redirect to login - the goal is to ensure the user is logged out
  // If there was no session, that's fine - they're already logged out
  return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

// Support GET for direct navigation or accidental clicks  
export async function GET(request: Request) {
  return handleSignOut(request);
}
