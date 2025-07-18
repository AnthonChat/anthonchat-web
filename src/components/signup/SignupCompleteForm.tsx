"use client";

import { useState, useCallback } from "react";
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
import ChannelVerification from "./ChannelVerification";

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

interface SignupCompleteFormProps {
  user: User;
  userProfile: UserProfile | null;
  channels: Channel[];
  existingChannels: UserChannel[];
}

export default function SignupCompleteForm({
  user,
  userProfile,
  channels,
  existingChannels,
}: SignupCompleteFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [profileSaving, setProfileSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [profileSaved, setProfileSaved] = useState(false);

	// Form state
	const [formData, setFormData] = useState({
		nickname: userProfile?.nickname || "",
		first_name: userProfile?.first_name || "",
		last_name: userProfile?.last_name || "",
	});

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

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setProfileSaved(false); // Mark as unsaved when data changes
	};

	// Check if profile data has changed from initial values
	const profileDataChanged =
		formData.nickname !== (userProfile?.nickname || "") ||
		formData.first_name !== (userProfile?.first_name || "") ||
		formData.last_name !== (userProfile?.last_name || "");

	// Check if profile data is complete
	const profileDataComplete =
		formData.nickname.trim() &&
		formData.first_name.trim() &&
		formData.last_name.trim();

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
					console.error("Failed to record channel:", error);
					setError("Could not save channel connection. Try again?");
				}
			} catch (err) {
				console.error("Channel verification error:", err);
				setError("Could not save channel connection. Try again?");
			}
		},
		[user.id]
	); // Dependency array for useCallback

	const saveProfile = async () => {
		// Validate profile fields only
		if (
			!formData.nickname.trim() ||
			!formData.first_name.trim() ||
			!formData.last_name.trim()
		) {
			setError("Please fill in all profile fields");
			return;
		}

		setProfileSaving(true);
		setError(null);

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

			setProfileSaved(true);
			setError(null);
		} catch (err: unknown) {
			console.error("Profile save error:", err);

			let errorMessage = "Failed to save profile";

			if (err instanceof Error) {
				errorMessage = err.message;
			} else if (typeof err === "object" && err !== null) {
				const supabaseError = err as {
					message?: string;
					error_description?: string;
					[key: string]: unknown;
				};
				if (supabaseError.message) {
					errorMessage = supabaseError.message;
				} else if (supabaseError.error_description) {
					errorMessage = supabaseError.error_description;
				}
			}

			setError(errorMessage);
		} finally {
			setProfileSaving(false);
		}
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

			// Channel connections are now handled in handleVerificationComplete
			// No need to upsert here since they're already in the database

			// Manually check if onboarding is now complete using the database function
			const { data: isComplete, error: checkError } = await supabase.rpc(
				"check_onboarding_complete",
				{ user_id_param: user.id }
			);

			if (checkError) {
				console.error("Error checking onboarding status:", checkError);
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
				if (
					checkSubError?.code === "PGRST116" ||
					!existingSubscription
				) {
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
							console.error(
								"Failed to create trial subscription:",
								subscriptionError
							);
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
			console.error("Setup error:", err);

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
			<Card>
				<CardHeader>
					<CardTitle>Your Profile</CardTitle>
					<CardDescription>
						This information will be used to identify you in the
						system.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<div className="space-y-3">
						<Label
							htmlFor="nickname"
							className="text-sm font-medium">
							Nickname
						</Label>
						<Input
							id="nickname"
							value={formData.nickname}
							onChange={(e) =>
								handleInputChange("nickname", e.target.value)
							}
							placeholder="e.g., Johnny"
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-3">
						<Label
							htmlFor="first_name"
							className="text-sm font-medium">
							First Name
						</Label>
						<Input
							id="first_name"
							value={formData.first_name}
							onChange={(e) =>
								handleInputChange("first_name", e.target.value)
							}
							placeholder="e.g., John"
							required
							className="h-11"
						/>
					</div>
					<div className="space-y-3 sm:col-span-2">
						<Label
							htmlFor="last_name"
							className="text-sm font-medium">
							Last Name
						</Label>
						<Input
							id="last_name"
							value={formData.last_name}
							onChange={(e) =>
								handleInputChange("last_name", e.target.value)
							}
							placeholder="e.g., Doe"
							required
							className="h-11"
						/>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-3">
					{profileSaved && (
						<div className="w-full p-3 bg-green-50 border border-green-200 rounded-md">
							<p className="text-green-800 text-sm text-center">
								✓ Profile saved successfully!
							</p>
						</div>
					)}

					<Button
						type="button"
						onClick={saveProfile}
						disabled={
							profileSaving ||
							!profileDataComplete ||
							(!profileDataChanged && !profileSaved)
						}
						variant="outline"
						className="w-full h-11">
						{profileSaving ? "Saving Profile..." : "Save Profile"}
					</Button>
				</CardFooter>
			</Card>

			<div className="mt-8">
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
					className="w-full h-11">
					{loading ? "Completing Setup..." : "Complete Setup"}
				</Button>
			</div>
		</form>
	);
}
