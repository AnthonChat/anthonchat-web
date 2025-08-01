import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Service role client per bypassare RLS su operazioni di servizio
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
  
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Missing Supabase secret key configuration");
  }
  
  return createClient(supabaseUrl, supabaseSecretKey);
};

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Parse and validate the request payload
    const { channel_id, user_handle, message_info } = await request.json();
    
    // Validazione input
    if (!channel_id || !["telegram", "whatsapp"].includes(channel_id)) {
      return NextResponse.json(
        { error: "Invalid or missing channel_id. Must be 'telegram' or 'whatsapp'" },
        { status: 400 }
      );
    }

    if (!user_handle || typeof user_handle !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing user_handle" },
        { status: 400 }
      );
    }

    // Validazione formato handle
    const isValidHandle = channel_id === "telegram"
      ? user_handle.startsWith("@") || user_handle.match(/^\d+$/) // @username o chat_id numerico
      : user_handle.match(/^\+?\d{10,15}$/); // numero WhatsApp

    if (!isValidHandle) {
      return NextResponse.json(
        { error: `Invalid handle format for ${channel_id}` },
        { status: 400 }
      );
    }

    // Usa service role client per bypassare RLS
    const supabase = getServiceRoleClient();

    // 2️⃣ Check for existing pending registrations per questo handle/channel
    const { data: existingVerifications } = await supabase
      .from("channel_verifications")
      .select("nonce, expires_at")
      .eq("channel_id", channel_id)
      .eq("user_handle", user_handle)
      .gt("expires_at", new Date().toISOString())
      .is("user_id", null); // Solo registrazioni pending

    if (existingVerifications && existingVerifications.length > 0) {
      const existing = existingVerifications[0];
      const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/signup?link=${existing.nonce}&channel=${channel_id}`;
      
      return NextResponse.json({
        nonce: existing.nonce,
        signup_url: signupUrl,
        expires_at: existing.expires_at,
        message: "Existing registration link still valid"
      });
    }

    // 3️⃣ Generate a new nonce and expiry for verification
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString(); // 10 minuti per registrazioni

    // 4️⃣ Create the verification record without user_id (pending registration)
    const { error: verificationError } = await supabase
      .from("channel_verifications")
      .insert({
        user_id: null, // Sarà popolato dopo la registrazione
        channel_id: channel_id,
        nonce: nonce,
        expires_at: expiresAt,
        user_handle: user_handle,
        chat_metadata: message_info || {}
      });

    if (verificationError) {
      console.error("REGISTRATION_LINK_CREATE_ERROR:", {
        error: verificationError,
        channelId: channel_id,
        userHandle: user_handle.substring(0, 5) + "...", // Privacy
        nonce,
      });
      return NextResponse.json(
        { error: "Failed to generate registration link" },
        { status: 500 }
      );
    }

    // 5️⃣ Build the signup URL
    const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/signup?link=${nonce}&channel=${channel_id}`;

    // 6️⃣ Log successful generation (per debugging)
    console.info("REGISTRATION_LINK_GENERATED:", {
      channelId: channel_id,
      userHandle: user_handle.substring(0, 5) + "...", // Privacy
      nonce: nonce.substring(0, 8) + "...", // Privacy
      expiresAt,
    });

    // 7️⃣ Return the registration link details
    return NextResponse.json({
      nonce,
      signup_url: signupUrl,
      expires_at: expiresAt,
      valid_for_minutes: 10
    });

  } catch (error) {
    console.error("REGISTRATION_LINK_GENERATION_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}