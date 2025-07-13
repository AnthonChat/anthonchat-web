"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            This information will be used to identify you in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="nickname" className="text-sm font-medium">
              Nickname
            </Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              placeholder="e.g., Johnny"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="first_name" className="text-sm font-medium">
              First Name
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="e.g., John"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <Label htmlFor="last_name" className="text-sm font-medium">
              Last Name
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="e.g., Doe"
              required
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {mandatoryChannels.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Connect Your Accounts</CardTitle>
            <CardDescription>
              We need this to send and receive messages on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {mandatoryChannels.map((channel) => (
              <div className="space-y-3" key={channel.id}>
                <Label htmlFor={`channel-${channel.id}`} className="text-sm font-medium">
                  {channel.name} User ID
                </Label>
                <Input
                  id={`channel-${channel.id}`}
                  value={channelInputs[channel.id] || ''}
                  onChange={(e) =>
                    handleChannelInputChange(channel.id, e.target.value)
                  }
                  placeholder={
                    channel.name.toLowerCase() === 'whatsapp'
                      ? 'e.g., +1234567890'
                      : `Your ${channel.name} user ID`
                  }
                  required
                  className="h-11"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-4">
        {error && (
          <p className="text-destructive text-sm bg-destructive/10 p-4 rounded-md w-full text-center">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? 'Completing Setup...' : 'Complete Setup'}
        </Button>
      </div>
    </form>
  )
}
