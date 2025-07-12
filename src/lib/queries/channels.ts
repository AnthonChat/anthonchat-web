import { createClient } from "@/utils/supabase/server"

export async function getUserChannels(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_channels')
    .select(`
      *,
      channels (
        id,
        name,
        icon_url,
        mandatory
      )
    `)
    .eq('user_id', userId)
    
  if (error) {
    throw error
  }
  
  return data || []
}

export async function getMandatoryChannels() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_active', true)
    .eq('mandatory', true)
    
  if (error) {
    throw error
  }
  
  return data || []
}

export async function getAllChannels() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_active', true)
    
  if (error) {
    throw error
  }
  
  return data || []
}

export async function getChannelConnectionStatus(userId: string, channelId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_channels')
    .select('*')
    .eq('user_id', userId)
    .eq('channel_id', channelId)
    .single()
    
  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  return data
}