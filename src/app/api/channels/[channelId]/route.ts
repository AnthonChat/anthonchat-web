import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { deleteUserChannel } from '@/lib/queries/channels'
import { apiLogger } from '@/lib/utils/loggers'
import type { User } from '@supabase/supabase-js'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  let user: User | null = null
  
  try {
    const supabase = await createClient()
    const { channelId } = await params

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      apiLogger.warn("Unauthorized channel deletion attempt", "CHANNEL_DELETE_API", { channelId })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    user = authUser

    if (!channelId) {
      apiLogger.warn("Channel deletion attempted without channel ID", "CHANNEL_DELETE_API", {}, user.id)
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
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingChannel) {
      apiLogger.warn("Channel not found or unauthorized deletion attempt", "CHANNEL_DELETE_API", { 
        channelId, 
        error: fetchError 
      }, user.id)
      return NextResponse.json(
        { error: 'Channel not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete the channel
    await deleteUserChannel(channelId, user.id)

    apiLogger.info("Channel deleted successfully", "CHANNEL_DELETE_API", { 
      channelId,
      channelType: existingChannel.channels[0]?.id
    }, user.id)

    return NextResponse.json(
      { message: 'Channel deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    apiLogger.error("Error deleting channel", "CHANNEL_DELETE_API", { 
      error,
      channelId: (await params).channelId 
    }, user?.id)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}