/**
 * Core channel linking database operations
 * Implements the database layer for enhanced registration and channel linking
 */

import { createClient } from "@/lib/db/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database as PublicDatabase } from "@/lib/db/schemas/public";

// Type aliases for better readability
type ChannelVerification = PublicDatabase["public"]["Tables"]["channel_verifications"]["Row"];
type ChannelVerificationInsert = PublicDatabase["public"]["Tables"]["channel_verifications"]["Insert"];
type UserChannelUpdate = PublicDatabase["public"]["Tables"]["user_channels"]["Update"];

/**
 * Result type for channel linking operations
 */
export interface ChannelLinkResult {
  success: boolean;
  userChannelId?: string;
  error?: string;
  requiresManualSetup?: boolean;
  isAlreadyLinked?: boolean;
  retryAttempts?: number;
}

/**
 * Result type for channel verification operations
 */
export interface ChannelVerificationResult {
  success: boolean;
  verificationId?: string;
  error?: string;
}

/**
 * Channel link status information
 */
export interface ChannelLinkStatus {
  isLinked: boolean;
  isVerified: boolean;
  userChannelId?: string;
  verifiedAt?: string | null;
  linkCreatedAt?: string;
}

// Service role client for operations that need to bypass RLS
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
  
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Missing Supabase secret key configuration");
  }
  
  return createSupabaseClient(supabaseUrl, supabaseSecretKey);
};

/**
 * Links a channel to a user using nonce-based verification
 * This is the main function for channel linking operations
 * 
 * @param userId - The user ID to link the channel to
 * @param nonce - The verification nonce from the channel link
 * @param channelId - The channel ID to link
 * @returns Promise<ChannelLinkResult>
 */
export async function linkChannelToUser(
  userId: string,
  nonce: string,
  channelId: string
): Promise<ChannelLinkResult> {
  try {
    const supabase = getServiceRoleClient();
    const currentTime = new Date().toISOString();

    // 1. Verify the nonce exists and is valid
    const { data: verification, error: verificationError } = await supabase
      .from("channel_verifications")
      .select("*")
      .eq("nonce", nonce)
      .eq("channel_id", channelId)
      .gt("expires_at", currentTime)
      .single();

    if (verificationError || !verification) {
      console.error("LINK_CHANNEL_INVALID_NONCE:", {
        error: verificationError?.message,
        nonce: nonce.substring(0, 8) + "...",
        channelId,
        userId,
      });
      return {
        success: false,
        error: "Invalid or expired verification link",
        requiresManualSetup: true,
      };
    }

    // 2. Check if channel is already linked to this user
    const existingLink = await getChannelLinkStatus(userId, channelId);
    if (existingLink.isLinked) {
      console.info("LINK_CHANNEL_ALREADY_LINKED:", {
        userId,
        channelId,
        userChannelId: existingLink.userChannelId,
      });
      return {
        success: true,
        userChannelId: existingLink.userChannelId,
        isAlreadyLinked: true,
      };
    }

    // 3. Handle registration vs existing user scenarios
    if (verification.user_id === null) {
      // Registration scenario - update verification with user_id
      const { error: updateError } = await supabase
        .from("channel_verifications")
        .update({ user_id: userId })
        .eq("nonce", nonce);

      if (updateError) {
        console.error("LINK_CHANNEL_UPDATE_VERIFICATION_ERROR:", {
          error: updateError.message,
          nonce: nonce.substring(0, 8) + "...",
          userId,
        });
        return {
          success: false,
          error: "Failed to update verification record",
          requiresManualSetup: true,
        };
      }
    } else if (verification.user_id !== userId) {
      // Existing user scenario - verify user_id matches
      console.error("LINK_CHANNEL_USER_MISMATCH:", {
        expectedUserId: verification.user_id,
        actualUserId: userId,
        nonce: nonce.substring(0, 8) + "...",
      });
      return {
        success: false,
        error: "Verification link is not associated with this user",
        requiresManualSetup: true,
      };
    }

    // 4. Use database function to finalize the link
    const { error: finalizeError } = await supabase.rpc("finalize_channel_link", {
      p_nonce: nonce,
      p_link: verification.user_handle || "",
    });

    if (finalizeError) {
      // Check if the error is due to duplicate channel linking
      if (finalizeError.message?.includes('duplicate key value violates unique constraint')) {
        console.info("LINK_CHANNEL_ALREADY_EXISTS:", {
          message: "Channel already linked to user",
          nonce: nonce.substring(0, 8) + "...",
          userId,
          channelId,
        });
        
        // Return success since the channel is already linked
        return {
          success: true,
          error: undefined,
          requiresManualSetup: false,
        };
      }
      
      console.error("LINK_CHANNEL_FINALIZE_ERROR:", {
        error: finalizeError.message,
        nonce: nonce.substring(0, 8) + "...",
        userId,
        channelId,
      });
      return {
        success: false,
        error: "Failed to finalize channel link",
        requiresManualSetup: true,
      };
    }

    // 5. Get the created user_channel record
    const finalStatus = await getChannelLinkStatus(userId, channelId);
    
    // 6. Send webhook notification (non-blocking)
    await sendChannelValidationWebhook(verification);

    console.info("LINK_CHANNEL_SUCCESS:", {
      userId,
      channelId,
      userChannelId: finalStatus.userChannelId,
      nonce: nonce.substring(0, 8) + "...",
    });

    return {
      success: true,
      userChannelId: finalStatus.userChannelId,
    };

  } catch (error) {
    console.error("LINK_CHANNEL_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      userId,
      channelId,
      nonce: nonce.substring(0, 8) + "...",
    });
    return {
      success: false,
      error: "Unexpected error during channel linking",
      requiresManualSetup: true,
    };
  }
}

/**
 * Creates a new channel verification record
 * Used for generating new verification links
 * 
 * @param verificationData - The verification data to insert
 * @returns Promise<ChannelVerificationResult>
 */
export async function createChannelVerification(
  verificationData: ChannelVerificationInsert
): Promise<ChannelVerificationResult> {
  try {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from("channel_verifications")
      .insert(verificationData)
      .select("id")
      .single();

    if (error) {
      console.error("CREATE_CHANNEL_VERIFICATION_ERROR:", {
        error: error.message,
        channelId: verificationData.channel_id,
        nonce: verificationData.nonce.substring(0, 8) + "...",
      });
      return {
        success: false,
        error: "Failed to create channel verification",
      };
    }

    console.info("CREATE_CHANNEL_VERIFICATION_SUCCESS:", {
      verificationId: data.id,
      channelId: verificationData.channel_id,
      nonce: verificationData.nonce.substring(0, 8) + "...",
    });

    return {
      success: true,
      verificationId: data.id,
    };

  } catch (error) {
    console.error("CREATE_CHANNEL_VERIFICATION_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      channelId: verificationData.channel_id,
    });
    return {
      success: false,
      error: "Unexpected error creating verification",
    };
  }
}

/**
 * Updates the status of a channel link
 * Used for updating verification status or other link properties
 * 
 * @param userChannelId - The user_channel record ID
 * @param updates - The updates to apply
 * @returns Promise<ChannelLinkResult>
 */
export async function updateChannelLinkStatus(
  userChannelId: string,
  updates: UserChannelUpdate
): Promise<ChannelLinkResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_channels")
      .update(updates)
      .eq("id", userChannelId)
      .select("*")
      .single();

    if (error) {
      console.error("UPDATE_CHANNEL_LINK_STATUS_ERROR:", {
        error: error.message,
        userChannelId,
        updates,
      });
      return {
        success: false,
        error: "Failed to update channel link status",
      };
    }

    console.info("UPDATE_CHANNEL_LINK_STATUS_SUCCESS:", {
      userChannelId,
      updates,
    });

    return {
      success: true,
      userChannelId: data.id,
    };

  } catch (error) {
    console.error("UPDATE_CHANNEL_LINK_STATUS_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      userChannelId,
    });
    return {
      success: false,
      error: "Unexpected error updating channel link status",
    };
  }
}

/**
 * Marks a channel as verified by updating the verified_at timestamp
 * 
 * @param userChannelId - The user_channel record ID
 * @returns Promise<ChannelLinkResult>
 */
export async function markChannelAsVerified(
  userChannelId: string
): Promise<ChannelLinkResult> {
  const verifiedAt = new Date().toISOString();
  
  return updateChannelLinkStatus(userChannelId, {
    verified_at: verifiedAt,
    updated_at: verifiedAt,
  });
}

/**
 * Removes a channel link by deleting the user_channel record
 * Used for cleanup operations when linking fails or user wants to unlink
 * 
 * @param userChannelId - The user_channel record ID
 * @param userId - The user ID (for security verification)
 * @returns Promise<ChannelLinkResult>
 */
export async function removeChannelLink(
  userChannelId: string,
  userId: string
): Promise<ChannelLinkResult> {
  try {
    const supabase = await createClient();

    // First verify the user owns this channel link
    const { data: existingLink, error: fetchError } = await supabase
      .from("user_channels")
      .select("user_id")
      .eq("id", userChannelId)
      .single();

    if (fetchError || !existingLink) {
      console.error("REMOVE_CHANNEL_LINK_NOT_FOUND:", {
        error: fetchError?.message,
        userChannelId,
        userId,
      });
      return {
        success: false,
        error: "Channel link not found",
      };
    }

    if (existingLink.user_id !== userId) {
      console.error("REMOVE_CHANNEL_LINK_UNAUTHORIZED:", {
        userChannelId,
        userId,
        linkUserId: existingLink.user_id,
      });
      return {
        success: false,
        error: "Unauthorized to remove this channel link",
      };
    }

    // Delete the channel link
    const { error: deleteError } = await supabase
      .from("user_channels")
      .delete()
      .eq("id", userChannelId)
      .eq("user_id", userId); // Double-check for security

    if (deleteError) {
      console.error("REMOVE_CHANNEL_LINK_DELETE_ERROR:", {
        error: deleteError.message,
        userChannelId,
        userId,
      });
      return {
        success: false,
        error: "Failed to remove channel link",
      };
    }

    console.info("REMOVE_CHANNEL_LINK_SUCCESS:", {
      userChannelId,
      userId,
    });

    return {
      success: true,
    };

  } catch (error) {
    console.error("REMOVE_CHANNEL_LINK_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      userChannelId,
      userId,
    });
    return {
      success: false,
      error: "Unexpected error removing channel link",
    };
  }
}

/**
 * Gets the current status of a channel link for a user
 * 
 * @param userId - The user ID
 * @param channelId - The channel ID
 * @returns Promise<ChannelLinkStatus>
 */
export async function getChannelLinkStatus(
  userId: string,
  channelId: string
): Promise<ChannelLinkStatus> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_channels")
      .select("id, verified_at, created_at")
      .eq("user_id", userId)
      .eq("channel_id", channelId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 means 'no rows found', which is valid (not linked)
      console.error("GET_CHANNEL_LINK_STATUS_ERROR:", {
        error: error.message,
        userId,
        channelId,
      });
      throw error;
    }

    if (!data) {
      return {
        isLinked: false,
        isVerified: false,
      };
    }

    return {
      isLinked: true,
      isVerified: !!data.verified_at,
      userChannelId: data.id,
      verifiedAt: data.verified_at,
      linkCreatedAt: data.created_at,
    };

  } catch (error) {
    console.error("GET_CHANNEL_LINK_STATUS_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      userId,
      channelId,
    });
    // Return safe default on error
    return {
      isLinked: false,
      isVerified: false,
    };
  }
}

/**
 * Gets all channel links for a user with their verification status
 * Useful for displaying user's connected channels
 * 
 * @param userId - The user ID
 * @returns Promise<ChannelLinkStatus[]>
 */
export async function getUserChannelLinks(
  userId: string
): Promise<(ChannelLinkStatus & { channelId: string })[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_channels")
      .select("id, channel_id, verified_at, created_at")
      .eq("user_id", userId);

    if (error) {
      console.error("GET_USER_CHANNEL_LINKS_ERROR:", {
        error: error.message,
        userId,
      });
      throw error;
    }

    return (data || []).map(link => ({
      channelId: link.channel_id,
      isLinked: true,
      isVerified: !!link.verified_at,
      userChannelId: link.id,
      verifiedAt: link.verified_at,
      linkCreatedAt: link.created_at,
    }));

  } catch (error) {
    console.error("GET_USER_CHANNEL_LINKS_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      userId,
    });
    return [];
  }
}

/**
 * Validates a channel verification nonce without linking
 * Used for checking if a nonce is valid before attempting to link
 * 
 * @param nonce - The verification nonce
 * @param channelId - The channel ID
 * @returns Promise<{ isValid: boolean; isExpired: boolean; isRegistration: boolean; verification?: ChannelVerification }>
 */
export async function validateChannelVerificationNonce(
  nonce: string,
  channelId: string
): Promise<{
  isValid: boolean;
  isExpired: boolean;
  isRegistration: boolean;
  verification?: ChannelVerification;
}> {
  try {
    if (!nonce || !channelId) {
      return {
        isValid: false,
        isExpired: false,
        isRegistration: false,
      };
    }

    const supabase = getServiceRoleClient();
    const currentTime = new Date().toISOString();

    const { data: verification, error } = await supabase
      .from("channel_verifications")
      .select("*")
      .eq("nonce", nonce)
      .eq("channel_id", channelId)
      .single();

    if (error || !verification) {
      console.info("VALIDATE_NONCE_NOT_FOUND:", {
        nonce: nonce.substring(0, 8) + "...",
        channelId,
        error: error?.message,
      });
      return {
        isValid: false,
        isExpired: false,
        isRegistration: false,
      };
    }

    const isExpired = verification.expires_at <= currentTime;
    const isRegistration = verification.user_id === null;
    const isValid = !isExpired;

    console.info("VALIDATE_NONCE_RESULT:", {
      nonce: nonce.substring(0, 8) + "...",
      channelId,
      isValid,
      isExpired,
      isRegistration,
    });

    return {
      isValid,
      isExpired,
      isRegistration,
      verification: isValid ? verification : undefined,
    };

  } catch (error) {
    console.error("VALIDATE_NONCE_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      nonce: nonce.substring(0, 8) + "...",
      channelId,
    });
    return {
      isValid: false,
      isExpired: false,
      isRegistration: false,
    };
  }
}

/**
 * Cleans up expired channel verification records
 * Should be called periodically to maintain database hygiene
 * 
 * @param olderThanHours - Remove verifications older than this many hours (default: 24)
 * @returns Promise<{ deletedCount: number }>
 */
export async function cleanupExpiredVerifications(
  olderThanHours: number = 24
): Promise<{ deletedCount: number }> {
  try {
    const supabase = getServiceRoleClient();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);
    const cutoffTimeString = cutoffTime.toISOString();

    const { data, error } = await supabase
      .from("channel_verifications")
      .delete()
      .lt("expires_at", cutoffTimeString)
      .select("id");

    if (error) {
      console.error("CLEANUP_EXPIRED_VERIFICATIONS_ERROR:", {
        error: error.message,
        cutoffTime: cutoffTimeString,
      });
      throw error;
    }

    const deletedCount = data?.length || 0;
    
    console.info("CLEANUP_EXPIRED_VERIFICATIONS_SUCCESS:", {
      deletedCount,
      cutoffTime: cutoffTimeString,
    });

    return { deletedCount };

  } catch (error) {
    console.error("CLEANUP_EXPIRED_VERIFICATIONS_UNEXPECTED_ERROR:", {
      error: (error as Error).message,
      olderThanHours,
    });
    return { deletedCount: 0 };
  }
}

/**
 * Sends webhook notification for channel validation (non-blocking)
 * 
 * @param verification - The channel verification record
 */
async function sendChannelValidationWebhook(
  verification: ChannelVerification
): Promise<void> {
  try {
    const chatMetadata = verification.chat_metadata as Record<string, unknown> | null | undefined;
    let chatIdFromMetadata: string | null = null;
    
    if (chatMetadata) {
      const possible = chatMetadata["chat_id"] ?? chatMetadata["chatId"] ?? chatMetadata["id"];
      if (typeof possible === "string" || typeof possible === "number") {
        chatIdFromMetadata = String(possible);
      }
    }
    
    const chatId = verification.user_handle ?? chatIdFromMetadata ?? null;
    
    const payload = {
      channel: verification.channel_id,
      chatid: chatId,
    };

    const webhookRes = await fetch(
      "https://matteosca.app.n8n.cloud/webhook/validated",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!webhookRes.ok) {
      console.warn("CHANNEL_VALIDATED_WEBHOOK_FAILED:", {
        status: webhookRes.status,
        statusText: webhookRes.statusText,
        payload,
      });
    } else {
      console.info("CHANNEL_VALIDATED_WEBHOOK_SUCCESS:", {
        status: webhookRes.status,
        payload,
      });
    }
  } catch (error) {
    console.warn("CHANNEL_VALIDATED_WEBHOOK_ERROR:", {
      error: (error as Error).message,
      channelId: verification.channel_id,
    });
  }
}