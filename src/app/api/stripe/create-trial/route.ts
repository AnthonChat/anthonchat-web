import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createTrialSubscription } from "@/lib/stripe/subscriptions";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Get the authenticated user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user already has a subscription
		const { data: existingSubscription } = await supabase
			.from("subscriptions")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (existingSubscription) {
			return NextResponse.json(
				{ error: "User already has a subscription" },
				{ status: 400 }
			);
		}

		// Create trial subscription
		const subscription = await createTrialSubscription(user.id);

		return NextResponse.json({
			success: true,
			subscription,
		});
	} catch (error) {
		console.error("Error creating trial subscription:", error);
		return NextResponse.json(
			{ error: "Failed to create trial subscription" },
			{ status: 500 }
		);
	}
}
