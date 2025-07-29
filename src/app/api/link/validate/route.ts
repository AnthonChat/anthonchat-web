// app/api/link/validate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { apiLogger } from "@/lib/utils/loggers";

export async function POST(request: NextRequest) {
	// ❗️ SECURITY: Protect this endpoint, as it is called by your bot, not a browser user.
	const botSecret = request.headers.get("x-bot-secret");
	if (botSecret !== process.env.BOT_SECRET_TOKEN) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const supabase = await createClient();

	// 1️⃣ Parse the nonce and link from the bot's request body
	const { nonce, link } = await request.json();
	if (!nonce || !link) {
		return NextResponse.json(
			{ error: "Missing verification nonce or link identifier" },
			{ status: 400 }
		);
	}

	// 2️⃣ Call the database function to securely finalize the link
	const { data, error: rpcError } = await supabase.rpc(
		"finalize_channel_link",
		{
			p_nonce: nonce,
			p_link: link,
		}
	);

	// 3️⃣ Handle errors from the remote procedure call itself
	if (rpcError) {
		apiLogger.error('FINALIZE_CHANNEL_LINK_RPC_ERROR', 'API_LINK', { error: rpcError, nonce, link });
		return NextResponse.json(
			{ error: "Server error during verification." },
			{ status: 500 }
		);
	}

	// 4️⃣ The function returns a specific 'error' field on logical failure
	if (data.error) {
		return NextResponse.json({ error: data.error }, { status: 400 });
	}

	// 5️⃣ On success, the function returns the user's ID
	if (data.user_id) {
		return NextResponse.json({
			message: "Channel linked successfully.",
			userId: data.user_id,
		});
	}

	// 6️⃣ Fallback for any other unexpected responses
	return NextResponse.json(
		{ error: "An unknown error occurred during verification." },
		{ status: 500 }
	);
}
