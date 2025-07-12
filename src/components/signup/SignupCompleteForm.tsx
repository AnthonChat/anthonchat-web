"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/browser";

interface Channel {
  id: string;
  name: string;
  mandatory: boolean;
}

interface UserChannel {
  channel_id: string;
  channel_user_id: string;
  channels: { name: string } | null;
}

interface UserProfile {
  onboarding_complete: boolean;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface User {
  id: string;
  email?: string;
}

interface SignupCompleteFormProps {
  user: User;
  userProfile: UserProfile | null;
  mandatoryChannels: Channel[];
  existingChannels: UserChannel[];
}

export default function SignupCompleteForm({
  user,
  userProfile,
  mandatoryChannels,
  existingChannels,
}: SignupCompleteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nickname: userProfile?.nickname || "",
    first_name: userProfile?.first_name || "",
    last_name: userProfile?.last_name || "",
  });

  // Channel connections state
  const [channelInputs, setChannelInputs] = useState<Record<string, string>>(
    () => {
      const inputs: Record<string, string> = {};
      mandatoryChannels.forEach((channel) => {
        const existing = existingChannels.find(
          (uc) => uc.channel_id === channel.id
        );
        inputs[channel.id] = existing?.channel_user_id || "";
      });
      return inputs;
    }
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChannelInputChange = (channelId: string, value: string) => {
    setChannelInputs((prev) => ({ ...prev, [channelId]: value }));
  };

  const validateForm = () => {
    // Check profile fields
    if (
      !formData.nickname.trim() ||
      !formData.first_name.trim() ||
      !formData.last_name.trim()
    ) {
      setError("Please fill in all profile fields");
      return false;
    }

    // Check mandatory channels
    for (const channel of mandatoryChannels) {
      const input = channelInputs[channel.id]?.trim();
      if (!input) {
        setError(`Please provide your ${channel.name} information`);
        return false;
      }

      // Validate WhatsApp phone number format
      if (channel.name.toLowerCase() === "whatsapp") {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(input)) {
          setError(
            "Please enter a valid WhatsApp phone number with country code (e.g., +1234567890)"
          );
          return false;
        }
      }
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

      // Update user profile
      const { error: profileError } = await supabase
        .from("users")
        .update({
          nickname: formData.nickname.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update/insert channel connections
      for (const channel of mandatoryChannels) {
        const channelUserId = channelInputs[channel.id].trim();

        // Check if connection already exists
        const existing = existingChannels.find(
          (uc) => uc.channel_id === channel.id
        );

        if (existing) {
          // Update existing connection
          const { error: updateError } = await supabase
            .from("user_channels")
            .update({ channel_user_id: channelUserId })
            .eq("user_id", user.id)
            .eq("channel_id", channel.id);

          if (updateError) throw updateError;
        } else {
          // Insert new connection
          const { error: insertError } = await supabase
            .from("user_channels")
            .insert({
              user_id: user.id,
              channel_id: channel.id,
              channel_user_id: channelUserId,
            });

          if (insertError) throw insertError;
        }
      }

      // Manually check if onboarding is now complete using the database function
      const { data: isComplete, error: checkError } = await supabase
        .rpc("check_onboarding_complete", { user_id_param: user.id });

      if (checkError) {
        console.error("Error checking onboarding status:", checkError);
        throw new Error(`Failed to verify onboarding status: ${checkError.message}`);
      }

      if (isComplete) {
        // Update the onboarding_complete flag
        const { error: updateError } = await supabase
          .from("users")
          .update({ onboarding_complete: true })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating onboarding status:", updateError);
          throw new Error(`Failed to update onboarding status: ${updateError.message}`);
        }
        // Create trial subscription
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            status: "trialing",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          });

        if (subscriptionError) {
          console.error(
            "Failed to create trial subscription:",
            subscriptionError
          );
          // Don't block the flow for subscription creation failure
        }

        router.push("/dashboard");
      } else {
        setError(
          "Setup incomplete. Please ensure all mandatory channels are connected."
        );
      }
    } catch (err: unknown) {
      console.error("Setup error:", err);
      
      let errorMessage = "An error occurred during setup";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
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
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Profile Information
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nickname">Nickname *</Label>
            <Input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => handleInputChange("nickname", e.target.value)}
              placeholder="How should we call you?"
              required
            />
          </div>
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value)}
              placeholder="Your first name"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange("last_name", e.target.value)}
              placeholder="Your last name"
              required
            />
          </div>
        </div>
      </div>

      {/* Channels Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Connect Your Channels
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect all mandatory channels to access AnthonChat AI features.
        </p>

        <div className="space-y-4">
          {mandatoryChannels.map((channel) => (
            <div key={channel.id} className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor={channel.id} className="flex items-center">
                  {channel.name}
                  <span className="text-red-500 ml-1">*</span>
                  {channel.name.toLowerCase() === "whatsapp" && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Phone number with country code)
                    </span>
                  )}
                </Label>
                <Input
                  id={channel.id}
                  type={
                    channel.name.toLowerCase() === "whatsapp" ? "tel" : "text"
                  }
                  value={channelInputs[channel.id] || ""}
                  onChange={(e) =>
                    handleChannelInputChange(channel.id, e.target.value)
                  }
                  placeholder={
                    channel.name.toLowerCase() === "whatsapp"
                      ? "+1234567890"
                      : `Enter your ${channel.name} username`
                  }
                  required
                />
              </div>
              <div className="flex-shrink-0">
                {channelInputs[channel.id]?.trim() ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Setting up..." : "Complete Setup"}
        </Button>
      </div>
    </form>
  );
}
