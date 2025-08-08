// app/api/link/status/[nonce]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nonce: string }> }
) {
  const supabase = await createClient();
  const { nonce } = await params;

  if (!nonce) {
    return NextResponse.json({ error: "Nonce is required" }, { status: 400 });
  }

  // 1️⃣ Authenticate the user making the request
  const { data: claims, error: authError } = await supabase.auth.getClaims();

  if (authError || !claims) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = claims.claims.sub;

  // 2️⃣ Find the verification request. This tells us the 'channel_id' and expiration.
  const { data: verification } = await supabase
    .from("channel_verifications")
    .select("channel_id, expires_at")
    .match({
      nonce: nonce,
      user_id: userId,
    })
    .maybeSingle();

  // Check if the verification has expired
  if (verification && new Date(verification.expires_at) <= new Date()) {
    // Clean up expired verification
    await supabase.from("channel_verifications").delete().match({
      nonce: nonce,
      user_id: userId,
    });

    return NextResponse.json(
      {
        status: "expired",
        error: "Verification link has expired. Please try again.",
      },
      { status: 410 }
    );
  }

  // If the nonce exists and is not expired, `verification.channel_id` will be populated.
  // If the nonce does NOT exist (because it was used), `verification` will be null.
  // Both are valid scenarios we must handle.

  // 3️⃣ Now, check the *actual* source of truth: the user_channels table.
  // We will search for ANY recently verified channel for this user.
  // This covers the case where the nonce has already been deleted upon success.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: userChannel, error: channelError } = await supabase
    .from("user_channels")
    .select("link, verified_at, channel_id")
    .match({ user_id: userId }) // Find channels for this user
    .not("verified_at", "is", null) // That have been verified
    .gte("verified_at", fiveMinutesAgo) // In the last 5 minutes
    .maybeSingle(); // We assume they only verify one at a time.

  if (channelError) {
    console.error("USER_CHANNEL_STATUS_ERROR", {
      error: channelError,
      userId: userId,
      nonce,
    });
    return NextResponse.json(
      { status: "error", error: "A database error occurred." },
      { status: 500 }
    );
  }

  // 4️⃣ Check if we found a recently verified channel. This is our success condition.
  // We also check if the found channel matches the one from the nonce, if the nonce still exists.
  if (
    userChannel &&
    (!verification || userChannel.channel_id === verification.channel_id)
  ) {
    return NextResponse.json({ status: "done", link: userChannel.link });
  }

  // 5️⃣ If no recently verified channel was found, the process is still pending.
  return NextResponse.json({ status: "pending" });
}
