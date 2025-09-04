import { createServiceRoleClient } from "@/lib/db/server";
import { resolvePresetOrRange, type TimePreset, type DateRange } from "./time";

type ChannelId = 'telegram' | 'whatsapp'

/**
 * Safely produce a concise string for thrown/returned error objects so we never
 * end up throwing or logging empty objects (which React DevTools may render as `{}`).
 */
function serializeErrorForMessage(e: unknown): string {
  try {
    if (!e && e !== 0) return String(e);
    if (e instanceof Error) return e.message || e.name || String(e);
    if (typeof e === "string") return e;
    if (typeof e === "object") {
      try {
        // Try to pick common fields first
        const obj = e as Record<string, unknown>;
        if (obj.message && typeof obj.message === "string" && obj.message.trim()) return obj.message;
        if (obj.error && typeof obj.error === "string" && obj.error.trim()) return obj.error;
        return JSON.stringify(obj);
      } catch {
        return String(e);
      }
    }
    return String(e);
  } catch {
    try {
      return String(e);
    } catch {
      return "Unknown error";
    }
  }
}

export interface MessagesPerChannel {
  channel_id: ChannelId
  count: number
}

export interface UsersPerChannel {
  channel_id: ChannelId
  users: number
}

export async function getNewUsersCount(preset: TimePreset | DateRange = '7d') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  let q = supabase.from('users').select('id', { count: 'exact', head: true })
  if (range.start) q = q.gte('created_at', range.start)
  if (range.end) q = q.lt('created_at', range.end)
  const { count, error } = await q
  if (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : JSON.stringify(error)
    throw new Error(`getNewUsersCount error: ${msg}`)
  }
  return count ?? 0
}

export async function getSignupsAttribution(preset: TimePreset | DateRange = '7d') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  // Prefer explicit attribution via users.signup_source when available
  // Include created_at for inference fallback
  let usersQuery = supabase.from('users').select('id, signup_source, created_at')
  if (range.start) usersQuery = usersQuery.gte('created_at', range.start)
  if (range.end) usersQuery = usersQuery.lt('created_at', range.end)

  const { data: users, error } = await usersQuery
  if (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : JSON.stringify(error)
    throw new Error(`getSignupsAttribution error: ${msg}`)
  }

  // Count explicit chat attributions
  const explicitChat = users.filter(u => u.signup_source === 'chat').length

  // Attempt a lightweight inference for rows without signup_source:
  // If the user has a channel_verifications record tied to their user_id created
  // close to the user's created_at, attribute as "chat".
  let inferredChat = 0
  try {
    const unknown = users.filter(u => !u.signup_source)
    if (unknown.length > 0) {
      const ids: string[] = unknown.map(u => u.id)
      // Query verifications for these users
      const { data: verifs, error: vErr } = await supabase
        .from('channel_verifications')
        .select('user_id, created_at')
        .in('user_id', ids)

      if (!vErr && verifs && verifs.length > 0) {
        const createdMap = new Map<string, number>()
        for (const u of unknown) {
          const t = u.created_at ? new Date(u.created_at).getTime() : NaN
          if (!Number.isNaN(t)) createdMap.set(u.id, t)
        }
        const windowMs = 24 * 60 * 60 * 1000 // 24h window
        const seen = new Set<string>()
        for (const v of verifs) {
          const uid = v.user_id as string | null
          if (!uid || seen.has(uid)) continue
          const userCreated = createdMap.get(uid)
          if (!userCreated) continue
          const verifCreated = v.created_at ? new Date(v.created_at).getTime() : NaN
          if (Number.isNaN(verifCreated)) continue
          if (Math.abs(verifCreated - userCreated) <= windowMs) {
            seen.add(uid)
          }
        }
        inferredChat = seen.size
      }
    }
  } catch (e) {
    // Non-fatal; keep analytics resilient
    console.warn('getSignupsAttribution inference fallback failed', { error: serializeErrorForMessage(e) })
  }

  const fromChat = explicitChat + inferredChat
  const total = users.length
  const fromWebsite = Math.max(0, total - fromChat)

  return { total, fromChat, fromWebsite }
}

export async function getMessagesCount(preset: TimePreset | DateRange = '7d') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  let q = supabase.from('chat_messages').select('id', { count: 'exact', head: true })
  if (range.start) q = q.gte('created_at', range.start)
  if (range.end) q = q.lt('created_at', range.end)
  const { count, error } = await q
  if (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : JSON.stringify(error)
    throw new Error(`getMessagesCount error: ${msg}`)
  }
  return count ?? 0
}

export async function getMessagesPerChannel(preset: TimePreset | DateRange = '7d'): Promise<MessagesPerChannel[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  // Known channel ids — ensure zero-count channels are returned.
  const channels: ChannelId[] = ['telegram', 'whatsapp']

  // Build count queries per channel (exact counts, head:true).
  // Include the user_channels relation in the select so filtering by the joined
  // relationship is valid for the Supabase client when performing head/count queries.
  const queries = channels.map((ch) => {
    let q = supabase
      .from('chat_messages')
      .select('id, user_channels!inner(channel_id)', { count: 'exact', head: true })
      .eq('user_channels.channel_id', ch)

    if (range.start) q = q.gte('created_at', range.start)
    if (range.end) q = q.lt('created_at', range.end)

    return q
  })

  // Execute in parallel
  const results = await Promise.all(queries)

  const counts: Record<string, number> = {}
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i]
    const res = results[i] as { count?: number | null; error?: unknown }
    if (res.error) {
      // Log the raw error server-side to capture non-enumerable fields.
      // Do NOT throw here — prefer returning zero counts so the UI stays usable.
      console.error('getMessagesPerChannel count query error', {
        channel: ch,
        rawError: res.error,
        serialized: serializeErrorForMessage(res.error),
      })
      // Fallback to zero so channels with errors don't break the page render.
      counts[ch] = 0
      continue
    }
    counts[ch] = res.count ?? 0
  }

  const result = channels.map((channel_id) => ({ channel_id, count: counts[channel_id] ?? 0 }))
  // Sort descending by count (greatest -> lowest)
  result.sort((a, b) => b.count - a.count)
  return result
}

export async function getUsersPerChannel(preset: TimePreset | DateRange | 'lifetime' = 'lifetime'): Promise<UsersPerChannel[]> {
  const supabase = createServiceRoleClient()

  // Pull all verified user_channels, optionally filtered by verified_at timeframe
  let q = supabase
    .from('user_channels')
    .select('user_id, channel_id, verified_at')
    .not('verified_at', 'is', null)

  if (preset !== 'lifetime') {
    const range = resolvePresetOrRange(preset)
    if (range.start) q = q.gte('verified_at', range.start)
    if (range.end) q = q.lt('verified_at', range.end)
  }

  const { data, error } = await q
  if (error) {
    const msg = serializeErrorForMessage(error)
    throw new Error(`getUsersPerChannel error: ${msg}`)
  }

  // Dedup users per channel
  const userSets: Record<string, Set<string>> = {}
  for (const row of data) {
    const c = row.channel_id as ChannelId
    const u = row.user_id as string
    if (!userSets[c]) userSets[c] = new Set()
    userSets[c].add(u)
  }
  return Object.entries(userSets).map(([channel_id, set]) => ({ channel_id: channel_id as ChannelId, users: set.size }))
}

export async function getAvgMessagesPerUser(preset: TimePreset | DateRange = '7d') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  // Fetch chat_messages with join to user_channels to get user_id, then compute distinct users and total
  let q = supabase
    .from('chat_messages')
    .select('id, created_at, user_channels!inner(user_id)')

  if (range.start) q = q.gte('created_at', range.start)
  if (range.end) q = q.lt('created_at', range.end)

  const { data, error } = await q
  if (error) {
    const msg = serializeErrorForMessage(error)
    throw new Error(`getAvgMessagesPerUser error: ${msg}`)
  }

  const totalMessages = data?.length ?? 0
  const userSet = new Set<string>()
  for (const row of data ?? []) {
    // user_channels is returned as an array due to the join; handle accordingly
    const channels = row.user_channels as { user_id: string }[] | undefined
    if (!channels || channels.length === 0) continue
    // use the first linked user_id for the message
    const uid = channels[0]?.user_id
    if (typeof uid === 'string' && uid) userSet.add(uid)
  }
  const activeUsers = userSet.size
  const avg = activeUsers > 0 ? totalMessages / activeUsers : 0
  return { totalMessages, activeUsers, average: avg }
}
