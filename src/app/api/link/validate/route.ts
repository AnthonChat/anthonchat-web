import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client per bypassare RLS su validazioni
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
    const { nonce, channelId } = await request.json();
    
    if (!nonce || !channelId) {
      return NextResponse.json(
        { isValid: false, error: "Parametri mancanti" },
        { status: 400 }
      );
    }
    
    // Usa service role client per validazione (per leggere record con user_id=null)
    const supabase = getServiceRoleClient();
    
    const { data: verification, error } = await supabase
      .from("channel_verifications")
      .select("*")
      .eq("nonce", nonce)
      .eq("channel_id", channelId)
      .gt("expires_at", new Date().toISOString())
      .single();

    const isValid = !error && !!verification;
    const isRegistration = isValid ? verification.user_id === null : false;

    // Debug logging
    console.info("NONCE_VALIDATION:", {
      nonce: nonce.substring(0, 8) + "...",
      channelId,
      isValid,
      isRegistration,
      error: error?.message,
      expiresAt: verification?.expires_at
    });
    
    return NextResponse.json({
      isValid,
      isRegistration,
      // Non esporre dati sensibili al client
      ...(isValid && {
        expiresAt: verification?.expires_at,
        channelId: verification?.channel_id,
      }),
    });
  } catch (error) {
    console.error("VALIDATE_NONCE_API_ERROR:", error);
    return NextResponse.json(
      { isValid: false, error: "Errore interno" },
      { status: 500 }
    );
  }
}
