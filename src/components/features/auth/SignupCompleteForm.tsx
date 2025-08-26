"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/db/client";
import ChannelVerification from "../channels/ChannelVerification";

interface Channel {
  id: string;
  name: string;
  active: boolean;
  link_method: string;
}

interface UserChannel {
  channel_id: string;
  link: string;
}

interface UserProfile {
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface User {
  id: string;
  email?: string;
}

interface ChannelLinkingContext {
  hasError?: boolean;
  showFallback?: boolean;
  channel?: string;
}

interface SignupCompleteFormProps {
  user: User;
  userProfile: UserProfile | null;
  channels: Channel[];
  existingChannels: UserChannel[];
  channelLinkingContext?: ChannelLinkingContext;
}

export default function SignupCompleteForm({
  user,
  channels,
  existingChannels,
  channelLinkingContext,
}: SignupCompleteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Channel verification state
  const [, setVerifiedChannels] = useState<Record<string, string>>(() => {
    const verified: Record<string, string> = {};
    existingChannels.forEach((uc) => {
      verified[uc.channel_id] = uc.link;
    });
    return verified;
  });

  // Initialize allChannelsVerified based on existing channels
  const [allChannelsVerified, setAllChannelsVerified] = useState(
    existingChannels.length > 0
  );




  const handleVerificationComplete = useCallback(
    async (channelId: string, link: string) => {
      // Update local state so the UI marks that tile as "verified"
      setVerifiedChannels((prev) => {
        const newVerified = { ...prev, [channelId]: link };
        // Check if at least one channel is verified
        if (Object.keys(newVerified).length >= 1) {
          setAllChannelsVerified(true);
        }
        return newVerified;
      });

      // Now do the one-off upsert for just *this* channel
      try {
        const supabase = createClient();
        const { error } = await supabase.from("user_channels").upsert(
          [
            {
              user_id: user.id,
              channel_id: channelId,
              link: link,
              verified_at: new Date().toISOString(),
            },
          ],
          {
            onConflict: "user_id, channel_id",
          }
        );

        if (error) {
          console.error("CHANNEL_RECORD_ERROR", {
            error,
            channelId,
            userId: user.id,
          });
          setError("Could not save channel connection. Try again?");
        }
      } catch (err) {
        console.error("CHANNEL_VERIFICATION_ERROR", {
          err,
          channelId,
          userId: user.id,
        });
        setError("Could not save channel connection. Try again?");
      }
    },
    [user.id]
  ); // Dependency array for useCallback

  const validateForm = () => {
    // Check if at least one channel is verified
    if (!allChannelsVerified) {
      setError("Please verify at least one channel before continuing");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();


      // Channel connections are now handled in handleVerificationComplete
      // No need to upsert here since they're already in the database

      // Manually check if onboarding is now complete using the database function
      const { data: isComplete, error: checkError } = await supabase.rpc(
        "check_onboarding_complete",
        { user_id_param: user.id }
      );

      if (checkError) {
        console.error("ONBOARDING_STATUS_CHECK_ERROR", {
          checkError,
          userId: user.id,
        });
        throw new Error(
          `Failed to verify onboarding status: ${checkError.message}`
        );
      }

      if (isComplete) {
        // Check if user already has a subscription
        const { data: existingSubscription, error: checkSubError } =
          await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .single();

        // Only create trial subscription if user doesn't have one
        if (checkSubError?.code === "PGRST116" || !existingSubscription) {
          // Get the free/trial tier
          const { data: tier, error: tierError } = await supabase
            .from("tiers")
            .select("id")
            .eq("slug", "free")
            .single();

          if (!tierError && tier) {
            const { error: subscriptionError } = await supabase
              .from("subscriptions")
              .insert({
                user_id: user.id,
                tier_id: tier.id,
                status: "trialing",
                current_period_end: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ), // 30 days from now
              });

            if (subscriptionError) {
              console.error("TRIAL_SUBSCRIPTION_CREATE_ERROR", {
                subscriptionError,
                userId: user.id,
                tierId: tier.id,
              });
              // Don't block the flow for subscription creation failure
            }
          }
        }

        router.push("/dashboard");
      } else {
        setError(
          "Setup incomplete. Please ensure at least one channel is connected."
        );
      }
    } catch (err: unknown) {
      console.error("SETUP_ERROR", { err, userId: user.id });

      let errorMessage = "An error occurred during setup";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        // Handle Supabase error objects
        const supabaseError = err as {
          message?: string;
          error_description?: string;
          [key: string]: unknown;
        };
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.error_description) {
          errorMessage = supabaseError.error_description;
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>

      <div className="mt-8">
        {/* Show channel linking context if present */}
        {channelLinkingContext?.hasError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              We couldn&apos;t automatically link your {channelLinkingContext.channel} channel. 
              Please verify it manually below.
            </p>
            {channelLinkingContext.showFallback && (
              <p className="text-xs text-yellow-600 mt-2">
                You can also set up the channel manually using the verification process.
              </p>
            )}
          </div>
        )}

        <ChannelVerification
          channels={channels}
          onVerificationComplete={handleVerificationComplete}
          existingChannels={existingChannels}
        />
      </div>

      <div className="mt-8 space-y-4">
        {error && (
          <p className="text-destructive text-sm bg-destructive/10 p-4 rounded-md w-full text-center">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || !allChannelsVerified}
          className="w-full h-11"
        >
          {loading ? "Completing Setup..." : "Complete Setup"}
        </Button>
      </div>
    </form>
  );
}
