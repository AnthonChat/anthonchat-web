import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { deleteUserChannel } from '@/lib/queries'
import { apiLogger } from '@/lib/logging/loggers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  let userId: string | null = null
  
  try {
    const supabase = await createClient()
    const { channelId } = await params

    // Get authenticated user claims
    const {
      data: claims,
      error: authError,
    } = await supabase.auth.getClaims()

    if (authError || !claims) {
      apiLogger.warn("Unauthorized channel deletion attempt", "CHANNEL_DELETE_API", { channelId })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    userId = claims.claims.sub

    if (!channelId) {
      apiLogger.warn("Channel deletion attempted without channel ID", "CHANNEL_DELETE_API", {}, userId)
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Verify the channel belongs to the user before deletion
    const { data: existingChannel, error: fetchError } = await supabase
      .from('user_channels')
      .select('id, channel_id, channels(id)')
      .eq('id', channelId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingChannel) {
      apiLogger.warn("Channel not found or unauthorized deletion attempt", "CHANNEL_DELETE_API", { 
        channelId, 
        error: fetchError 
      }, userId)
      return NextResponse.json(
        { error: 'Channel not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete the channel
    await deleteUserChannel(channelId, userId)

    apiLogger.info("Channel deleted successfully", "CHANNEL_DELETE_API", { 
      channelId,
      channelType: existingChannel.channels[0]?.id
    }, userId)

    return NextResponse.json(
      { message: 'Channel deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    apiLogger.error("Error deleting channel", new Error("CHANNEL_DELETE_API"), { 
      error,
      channelId: (await params).channelId 
    }, userId || undefined)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}