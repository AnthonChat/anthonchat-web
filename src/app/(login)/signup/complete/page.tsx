import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SignupCompleteForm from "@/components/signup/SignupCompleteForm";
import { uiLogger } from "@/lib/utils/loggers";

export default async function SignupCompletePage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	// 1. Check if user is already onboarded using the function
	const { data: isOnboarded, error: rpcError } = await supabase.rpc(
		"check_onboarding_complete",
		{
			user_id_param: user.id,
		}
	);

	// If the check fails, we can log it but we'll still show the form
	if (rpcError) {
		uiLogger.error("ONBOARDING_CHECK_FUNCTION_ERROR", "SIGNUP_COMPLETE", {
			rpcError: rpcError.message,
			userId: user.id
		});
	}

	// 2. If the function returns `true`, redirect immediately
	if (isOnboarded === true) {
		redirect("/dashboard");
	}

	// 3. If the user is NOT onboarded, we continue and fetch their profile details
	//    to pre-fill the form. Notice `onboarding_complete` is removed from the select.
	const { data: userProfile } = await supabase
		.from("users")
		.select("nickname, first_name, last_name")
		.eq("id", user.id)
		.single();

	// Fetch all active channels from database
	const { data: channels } = await supabase
		.from("channels")
		.select("id, is_active, link_method")
		.eq("is_active", true);

	// Check existing channel connections
	const { data: userChannels, error: userChannelsError } = await supabase
		.from("user_channels")
		.select("channel_id, link") // Just get what you need
		.eq("user_id", user.id)
		.not("verified_at", "is", null); // Only select channels that are actually verified

	if (userChannelsError) {
		uiLogger.error("VERIFIED_CHANNELS_FETCH_ERROR", "SIGNUP_COMPLETE", {
			userChannelsError: userChannelsError.message,
			userId: user.id
		});
	}

	return (
		<div className="max-w-2xl w-full space-y-8">
			<div className="text-center">
				<h2 className="mt-6 text-3xl font-extrabold text-foreground">
					Complete Your Profile
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Just a few more details to get you started with AnthonChat
				</p>
			</div>

			<SignupCompleteForm
				user={user}
				userProfile={userProfile}
				channels={(channels || []).map((channel) => ({
					id: channel.id,
					active: channel.is_active,
					link_method: channel.link_method,
					name: channel.id,
				}))}
				existingChannels={userChannels || []} // No mapping needed, pass it directly
			/>
		</div>
	);
}
