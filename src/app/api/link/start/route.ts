// app/api/link/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { apiLogger } from "@/lib/utils/loggers";

export async function POST(request: NextRequest) {
	const supabase = await createClient();

	// 1️⃣ Authenticate the user
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json(
			{ error: "Not authenticated" },
			{ status: 401 }
		);
	}

	// 2️⃣ Parse and validate the request payload
	const { channel_id } = await request.json();
	if (!channel_id || !["telegram", "whatsapp"].includes(channel_id)) {
		return NextResponse.json(
			{ error: "Invalid or missing channel_id" },
			{ status: 400 }
		);
	}

	// 3️⃣ Generate a new nonce and expiry for verification
	const nonce = randomUUID();
	const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString(); // 5-minute expiry

	// 4️⃣ Create the verification record with the user's ID in our new table
	const { error: verificationError } = await supabase
		.from("channel_verifications")
		.insert({
			user_id: user.id,
			channel_id: channel_id,
			nonce: nonce,
			expires_at: expiresAt,
		});

	if (verificationError) {
		apiLogger.error('CHANNEL_VERIFICATION_CREATE_ERROR', 'API_LINK', { 
			error: verificationError, 
			userId: user.id, 
			channelId: channel_id, 
			nonce 
		});
		return NextResponse.json(
			{ error: "Failed to initiate link verification." },
			{ status: 500 }
		);
	}

	// 5️⃣ Build the deep-link and command for the user
	const command = `/link ${nonce}`;
	const deeplink =
		channel_id === "telegram"
			? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=link_${nonce}`
			: `https://wa.me/${
					process.env.NEXT_PUBLIC_WHATSAPP_BOT_PHONE
			  }?text=${encodeURIComponent(command)}`;

	// 6️⃣ Return the details to the client
	return NextResponse.json({ nonce, command, deepLink: deeplink });
}
