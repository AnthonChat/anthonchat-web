// app/api/link/status/[nonce]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/link/status/:nonce
 *
 * Implements Option A: reads channel_verifications.verified_at (instead of deleting the row)
 * to determine whether the link handshake has completed.
 *
 * Returns:
 *  - { status: 'pending' } until verified_at is set
 *  - { status: 'done' } once verified_at is non-null
 *  - 410 if the nonce has expired
 */
export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ nonce: string }> }
) {
	const { nonce } = await params;

	if (!nonce) {
		return NextResponse.json(
			{ error: "Nonce parameter is required" },
			{ status: 400 }
		);
	}

	const supabase = await createClient();

	// 1️⃣ Fetch the verification record (with both expires_at and verified_at)
	const { data: ver, error: verErr } = await supabase
		.from("channel_verifications")
		.select("expires_at, verified_at")
		.eq("nonce", nonce)
		.single();

	if (verErr || !ver) {
		// No such nonce (or it was purged) → still pending
		const res = NextResponse.json({ status: "pending" });
		res.headers.set("Cache-Control", "no-store");
		return res;
	}

	// 2️⃣ If not yet verified and already expired → link code expired
	if (ver.verified_at === null && new Date(ver.expires_at) < new Date()) {
		return NextResponse.json(
			{ error: "Link code expired" },
			{ status: 410 }
		);
	}

	// 3️⃣ If verified_at is set → done
	if (ver.verified_at !== null) {
		return NextResponse.json({ status: "done" });
	}

	// 4️⃣ Otherwise still pending
	const res = NextResponse.json({ status: "pending" });
	res.headers.set("Cache-Control", "no-store");
	return res;
}
