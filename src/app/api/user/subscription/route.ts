import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import {
  getUserSubscription,
  getUserLatestSubscription,
} from "@/lib/queries/subscription";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the authenticated user claims
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = claims.claims.sub;

    // Get active subscription
    const subscription = await getUserSubscription(userId);

    // If no active subscription, get the latest (including cancelled/expired)
    let pastSubscription = null;
    if (!subscription) {
      pastSubscription = await getUserLatestSubscription(userId);
    }

    return NextResponse.json({ subscription, pastSubscription });
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
