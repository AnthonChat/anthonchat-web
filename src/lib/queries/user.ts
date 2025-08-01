import { createClient } from "@/lib/db/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";

// Type aliases for better readability
type User = PublicDatabase["public"]["Tables"]["users"]["Row"];
type UserInsert = PublicDatabase["public"]["Tables"]["users"]["Insert"];
type UserUpdate = PublicDatabase["public"]["Tables"]["users"]["Update"];

/**
 * Fetches the user data for a given user ID.
 */
export async function getUserData(userId: string): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("USER_DATA_FETCH:", {
      error: error.message,
      userId,
    });
    throw error;
  }

  return data;
}

/**
 * Updates user data for a given user ID.
 */
export async function updateUserData(
  userId: string,
  updates: UserUpdate
): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("USER_DATA_UPDATE:", {
      error: error.message,
      userId,
      updates,
    });
    throw error;
  }

  return data;
}

/**
 * Creates a new user record.
 */
export async function createUser(userData: UserInsert): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .insert(userData)
    .select("*")
    .single();

  if (error) {
    console.error("USER_CREATE:", {
      error: error.message,
      userData,
    });
    throw error;
  }

  return data;
}

export async function linkChannelToUserSecure(
  userId: string,
  channelId: string,
  nonce: string // Ora richiede il nonce per la verifica
): Promise<void> {
  // Usa service role client per tutte le operazioni
  const supabase = getServiceRoleClient();

  // 1. Verifica che il nonce esista e sia valido
  const currentTime = new Date().toISOString();
  const { data: verification, error: verificationError } = await supabase
    .from("channel_verifications")
    .select("*")
    .eq("nonce", nonce)
    .eq("channel_id", channelId)
    .gt("expires_at", currentTime)
    .single();

  console.info("NONCE_LOOKUP_DEBUG:", {
    nonce: nonce.substring(0, 8) + "...",
    channelId,
    userId,
    currentTime,
    found: !!verification,
    error: verificationError?.message,
    verificationUserId: verification?.user_id,
    expiresAt: verification?.expires_at,
    isExpired: verification ? verification.expires_at <= currentTime : null
  });

  if (verificationError || !verification) {
    console.error("INVALID_NONCE_ERROR:", {
      error: verificationError?.message,
      nonce: nonce.substring(0, 8) + "...",
      channelId,
      userId,
      currentTime,
      verificationFound: !!verification
    });
    throw new Error("Link di verifica non valido o scaduto");
  }

  // 2. Gestisci registrazioni vs utenti esistenti
  if (verification.user_id === null) {
    // È una registrazione - accetta qualsiasi userId
    console.info("REGISTRATION_NONCE_ACCEPTED:", {
      nonce: nonce.substring(0, 8) + "...",
      userId,
      userHandle: verification.user_handle?.substring(0, 5) + "...",
      isRegistration: true
    });
  } else if (verification.user_id !== userId) {
    // È un nonce esistente - deve corrispondere l'user_id
    console.error("NONCE_USER_MISMATCH:", {
      expectedUserId: verification.user_id,
      actualUserId: userId,
      isRegistration: false
    });
    throw new Error("Nonce non associato a questo utente");
  } else {
    // È un nonce esistente e l'user_id corrisponde
    console.info("EXISTING_NONCE_ACCEPTED:", {
      nonce: nonce.substring(0, 8) + "...",
      userId,
      isRegistration: false
    });
  }

  // 3. Per registrazioni: aggiorna il nonce con l'user_id e poi finalizza
  if (verification.user_id === null) {
    // È una registrazione - aggiorna il nonce con l'user_id
    const { error: updateError } = await supabase
      .from("channel_verifications")
      .update({ user_id: userId })
      .eq("nonce", nonce);

    if (updateError) {
      console.error("NONCE_USER_UPDATE_ERROR:", {
        error: updateError.message,
        nonce,
        userId,
      });
      throw new Error("Errore durante l'associazione del nonce all'utente");
    }
  }

  // 4. Usa la funzione database sicura invece di insert diretto
  const { error } = await supabase.rpc("finalize_channel_link", {
    p_nonce: nonce,
    p_link: verification.user_handle || "", // Il vero handle dal bot
  });

  if (error) {
    console.error("CHANNEL_LINK_FINALIZE_ERROR:", {
      error: error.message,
      nonce,
      userId,
      channelId,
    });
    throw error;
  }

  console.info("Channel linked securely", {
    userId,
    channelId,
    userHandle: verification.user_handle?.substring(0, 5) + "...", // Privacy
    nonce: nonce.substring(0, 8) + "...", // Log parziale per sicurezza
    isRegistration: verification.user_id === null
  });
}

// Service role client per validazioni
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
  
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Missing Supabase secret key configuration");
  }
  
  return createSupabaseClient(supabaseUrl, supabaseSecretKey);
};

// Type for channel verification
interface ChannelVerification {
  id: string;
  nonce: string;
  channel_id: string;
  user_id: string | null;
  user_handle: string | null;
  expires_at: string;
  created_at: string;
}

// Funzione di validazione separata per controlli preliminari
export async function validateChannelLinkNonce(
  nonce: string,
  channelId: string
): Promise<{ isValid: boolean; verification?: ChannelVerification; isRegistration?: boolean }> {
  if (!nonce || !channelId) {
    return { isValid: false };
  }

  // Usa service role client per leggere anche record con user_id=null
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
  console.info("VALIDATE_NONCE_FUNCTION:", {
    nonce: nonce.substring(0, 8) + "...",
    channelId,
    isValid,
    isRegistration,
    error: error?.message
  });

  return {
    isValid,
    verification: verification || undefined,
    isRegistration
  };
}

// Manteniamo anche la funzione legacy per retrocompatibilità (ma deprecata)
/** @deprecated Use linkChannelToUserSecure instead */
export async function linkChannelToUser(
  userId: string,
  channelId: string,
  link: string
): Promise<void> {
  console.warn("DEPRECATED: linkChannelToUser called - use linkChannelToUserSecure");
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_channels")
    .insert({
      user_id: userId,
      channel_id: channelId,
      link,
      verified_at: new Date(),
    });

  if (error) {
    console.error("USER_CHANNEL_LINK:", {
      error: error.message,
      userId,
      channelId,
    });
    throw error;
  }
}
