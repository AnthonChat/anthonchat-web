import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SignupCompleteForm from "@/components/signup/SignupCompleteForm";

export default async function SignupCompletePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user already completed onboarding
  const { data: userProfile } = await supabase
    .from("users")
    .select("onboarding_complete, nickname, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (userProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  // Fetch mandatory channels from database
  const { data: mandatoryChannels } = await supabase
    .from("channels")
    .select("id, name, mandatory")
    .eq("mandatory", true)
    .eq("is_active", true);

  // Check existing channel connections
  const { data: userChannels } = await supabase
    .from("user_channels")
    .select(
      `
      channel_id,
      channel_user_id,
      channels (
        name
      )
    `
    )
    .eq("user_id", user.id);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Complete Your Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Just a few more details to get you started with AnthonChat
          </p>
        </div>

        <SignupCompleteForm
          user={user}
          userProfile={userProfile}
          mandatoryChannels={mandatoryChannels || []}
          existingChannels={(userChannels || []).map((uc) => ({
            ...uc,
            channels: Array.isArray(uc.channels) ? uc.channels[0] : uc.channels,
          }))}
        />
      </div>
    </div>
  );
}
