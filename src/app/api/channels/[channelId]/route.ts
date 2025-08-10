import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { deleteUserChannel } from "@/lib/queries/channels";

export async function OPTIONS() {
  // CORS preflight for DELETE
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { channelId } = await params;

    // Get authenticated user claims
    const { data: claims, error: authError } = await supabase.auth.getClaims();

    if (authError || !claims) {
      console.warn("Unauthorized channel deletion attempt", { channelId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = claims.claims.sub;

    if (!channelId) {
      console.warn("Channel deletion attempted without channel ID", { userId });
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Verify the channel belongs to the user before deletion
    const { data: existingChannel, error: fetchError } = await supabase
      .from("user_channels")
      .select("id, channel_id, channels(id)")
      .eq("id", channelId)
      .eq("user_id", userId)
      .single();
 
     if (fetchError || !existingChannel) {
       console.warn("Channel not found or unauthorized deletion attempt", {
         channelId,
         error: fetchError,
         userId,
       });
       return NextResponse.json(
         { error: "Channel not found or unauthorized" },
         { status: 404 }
       );
     }

    // Delete the channel
    await deleteUserChannel(channelId, userId);

    console.info("Channel deleted successfully", {
      channelId,
      channelType: existingChannel.channels[0]?.id,
      userId,
    });

    return NextResponse.json(
      { message: "Channel deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting channel", {
      error,
      channelId: (await params).channelId,
      userId: userId || undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
