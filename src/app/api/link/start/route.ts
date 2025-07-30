// app/api/link/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1️⃣ Authenticate the user
  const { data: claims, error: authError } = await supabase.auth.getClaims();

  if (authError || !claims) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = claims.claims.sub;

  // 2️⃣ Parse and validate the request payload
  const { channel_id } = await request.json();
  if (!channel_id || !["telegram", "whatsapp"].includes(channel_id)) {
    return NextResponse.json(
      { error: "Invalid or missing channel_id" },
      { status: 400 }
    );
  }

  // 3️⃣ Generate a new nonce and expiry for verification
  const nonce = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString(); // 5-minute expiry

  // 4️⃣ Create the verification record with the user's ID in our new table
  const { error: verificationError } = await supabase
    .from("channel_verifications")
    .insert({
      user_id: userId,
      channel_id: channel_id,
      nonce: nonce,
      expires_at: expiresAt,
    });

  if (verificationError) {
    console.error("CHANNEL_VERIFICATION_CREATE_ERROR", {
      error: verificationError,
      userId: userId,
      channelId: channel_id,
      nonce,
    });
    return NextResponse.json(
      { error: "Failed to initiate link verification." },
      { status: 500 }
    );
  }

  // 5️⃣ Build the deep-link and command for the user
  const command = `/link ${nonce}`;
  let deeplink: string;
  switch (channel_id) {
    case "telegram":
      deeplink = `https://t.me/AnthonChat_bot?text=%2Flink+${nonce}`;
      break;
    case "whatsapp":
      deeplink = `https://wa.me/15556475202?text=${encodeURIComponent(
        command
      )}`;
      break;
    default:
      deeplink = "";
  }
  // 6️⃣ Return the details to the client
  return NextResponse.json({ nonce, command, deepLink: deeplink });
}
