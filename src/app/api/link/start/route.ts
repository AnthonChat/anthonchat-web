// app/api/link/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
	const supabase = await createClient();

	// 1️⃣ Authenticate
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

	// 2️⃣ Parse & validate payload
	const { channel_code, channel_user_id: provided_user_id } = await request.json();
	if (!channel_code || !["telegram", "whatsapp"].includes(channel_code)) {
		return NextResponse.json(
			{ error: "Invalid channel_code" },
			{ status: 400 }
		);
	}

	// 3️⃣ Generate nonce + expiry
	const nonce = randomUUID();
	const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
	const channel_user_id = provided_user_id || `pending::${nonce}`;

	// 4️⃣ Upsert into channel_verifications with user_id
	const { error: upsertError } = await supabase
		.from("channel_verifications")
		.upsert(
			{
				user_id: user.id,
				channel_user_id,
				channel_code,
				nonce,
				expires_at: expiresAt,
			},
			{ onConflict: 'channel_user_id,channel_code',}
		);

	if (upsertError) {
		return NextResponse.json(
			{ error: "Failed to initiate link" },
			{ status: 500 }
		);
	}

	// 5️⃣ Build deep-link & command
	const command = `/link ${nonce}`;
	const deeplink =
		channel_code === "telegram"
			? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=link_${nonce}`
			: `https://wa.me/${
					process.env.WHATSAPP_BOT_PHONE
			  }?text=${encodeURIComponent(command)}`;

	// 6️⃣ Return to client
	return NextResponse.json({ nonce, command, deepLink: deeplink });
}
