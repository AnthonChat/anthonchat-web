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
    const msg = serializeErrorForMessage(error)
    throw new Error(`getNewUsersCount error: ${msg}`)
  }
  return count ?? 0
}

export async function getSignupsAttribution(preset: TimePreset | DateRange = '7d') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  // Count only users with an explicit signup_source; ignore null/unknown sources
  let usersQuery = supabase.from('users').select('id, signup_source, created_at')
  if (range.start) usersQuery = usersQuery.gte('created_at', range.start)
  if (range.end) usersQuery = usersQuery.lt('created_at', range.end)

  const { data: users, error } = await usersQuery
  if (error) {
    const msg = serializeErrorForMessage(error)
    throw new Error(`getSignupsAttribution error: ${msg}`)
  }

  // Explicit counts only
  const explicitChat = users.filter(u => u.signup_source === 'chat').length
  const explicitWebsite = users.filter(u => u.signup_source === 'website').length
  const ignoredUnknown = users.filter(u => !u.signup_source).length

  const fromChat = explicitChat
  const fromWebsite = explicitWebsite
  const total = fromChat + fromWebsite

  try {
    console.info('getSignupsAttribution totals (explicit only)', {
      total,
      explicitChat,
      explicitWebsite,
      ignoredUnknown,
      fromChat,
      fromWebsite,
    })
  } catch {
    // ignore diagnostics failures
  }

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
    const msg = serializeErrorForMessage(error)
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

  // Get the true total via a count query (not limited by 1k row page size)
  const totalMessages = await getMessagesCount(range)

  // Uses shared extractUserIdFromRelation helper

  // Page through chat_messages to avoid 1k default limit and collect distinct user_ids
  const pageSize = 1000
  let from = 0
  const userSet = new Set<string>()

  while (true) {
    let q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (range.start) q = q.gte('created_at', range.start)
    if (range.end) q = q.lt('created_at', range.end)

    const { data, error } = await q
    if (error) {
      const msg = serializeErrorForMessage(error)
      throw new Error(`getAvgMessagesPerUser error: ${msg}`)
    }
    const rows = data ?? []
    for (const row of rows) {
      const rel = (row as { user_channels?: unknown }).user_channels as unknown
      const uid = extractUserIdFromRelation(rel)
      if (uid) userSet.add(uid)
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const activeUsers = userSet.size
  const average = activeUsers > 0 ? totalMessages / activeUsers : 0

  return { totalMessages, activeUsers, average }
}


// ========== Engagement: Active Users Windows (DAU/WAU/MAU) ==========
export interface DAUWAUMAU {
  dau: number
  wau: number
  mau: number
  stickiness: number
}

/**
 * Compute DAU/WAU/MAU using the end bound of the provided preset/range as the reference time.
 * - DAU: distinct users with ≥1 message in the last 1 day
 * - WAU: distinct users with ≥1 message in the last 7 days
 * - MAU: distinct users with ≥1 message in the last 30 days
 * Stickiness = DAU / MAU
 *
 * Notes:
 * - We fetch messages for the last 30 days once and derive all windows client-side
 * - Joins to user_channels to get the owning user_id per message
 */
export async function getDAUWAUMAU(preset: TimePreset | DateRange = '7d'): Promise<DAUWAUMAU> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const endIso = range.end ?? new Date().toISOString()
  const endTs = new Date(endIso).getTime()

  // Start at end - 30d
  const MS_DAY = 24 * 60 * 60 * 1000
  const start30Iso = new Date(endTs - 30 * MS_DAY).toISOString()

  const set1 = new Set<string>()
  const set7 = new Set<string>()
  const set30 = new Set<string>()


  // Page through last 30 days of messages to avoid 1k default limit
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .gte('created_at', start30Iso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      const msg = serializeErrorForMessage(error)
      throw new Error(`getDAUWAUMAU error: ${msg}`)
    }

    const rows = data ?? []
    for (const row of rows) {
      const rel = (row as { user_channels?: unknown }).user_channels as unknown
      const uid = extractUserIdFromRelation(rel)
      if (!uid) continue
      const t = new Date(String((row as { created_at?: unknown }).created_at)).getTime()
      if (t >= endTs - 1 * MS_DAY) set1.add(uid)
      if (t >= endTs - 7 * MS_DAY) set7.add(uid)
      if (t >= endTs - 30 * MS_DAY) set30.add(uid)
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const dau = set1.size
  const wau = set7.size
  const mau = set30.size
  const stickiness = mau > 0 ? dau / mau : 0

  try {
    console.info('getDAUWAUMAU diagnostics', { dau, wau, mau, endIso })
  } catch {
    // ignore diagnostics failures
  }

  return { dau, wau, mau, stickiness }
}


// ========== Engagement: New vs Returning Active Users ==========
export interface NewReturningActive {
  newActive: number
  returningActive: number
  totalActive: number
}

/**
 * New vs Returning Active Users over a range.
 * - "Active" = users who sent ≥1 message within [start, end)
 * - "New" = active users with NO messages before `start`
 * - "Returning" = active users WITH any message before `start`
 *
 * If the provided range has no `start` (e.g., lifetime), we fallback to a 7-day window
 * ending at `end` to make the classification meaningful.
 */
export async function getNewVsReturningActive(preset: TimePreset | DateRange = '7d'): Promise<NewReturningActive> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const endIso = range.end ?? new Date().toISOString()

  const MS_DAY = 24 * 60 * 60 * 1000
  const endTs = new Date(endIso).getTime()
  const startIso = range.start ?? new Date(endTs - 7 * MS_DAY).toISOString()

  // Helper to extract user_id from the joined relation
  // Uses shared extractUserIdFromRelation helper

  // 1) Distinct active users in the window — with pagination
  const pageSize = 1000
  let from = 0
  const activeSet = new Set<string>()

  while (true) {
    const { data: activeRows, error: activeErr } = await supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (activeErr) {
      const msg = serializeErrorForMessage(activeErr)
      throw new Error(`getNewVsReturningActive (active) error: ${msg}`)
    }

    const rows = activeRows ?? []
    for (const row of rows) {
      const rel = (row as { user_channels?: unknown }).user_channels as unknown
      const uid = extractUserIdFromRelation(rel)
      if (uid) activeSet.add(uid)
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const totalActive = activeSet.size
  if (totalActive === 0) {
    return { newActive: 0, returningActive: 0, totalActive: 0 }
  }

  // 2) Of those active users, which had any message before startIso?
  const ids = Array.from(activeSet)
  // Guard PostgREST IN length; if extremely large, chunk requests (simple chunking)
  const chunkSize = 500
  const beforeSet = new Set<string>()

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)

    let beforeFrom = 0
    while (true) {
      const { data: beforeRows, error: beforeErr } = await supabase
        .from('chat_messages')
        .select('created_at, user_channels!inner(user_id)')
        .lt('created_at', startIso)
        .in('user_channels.user_id', chunk)
        .order('created_at', { ascending: false })
        .range(beforeFrom, beforeFrom + pageSize - 1)

      if (beforeErr) {
        const msg = serializeErrorForMessage(beforeErr)
        throw new Error(`getNewVsReturningActive (before) error: ${msg}`)
      }

      const rows = beforeRows ?? []
      for (const row of rows) {
        const rel = (row as { user_channels?: unknown }).user_channels as unknown
        const uid = extractUserIdFromRelation(rel)
        if (uid) beforeSet.add(uid)
      }

      if (rows.length < pageSize) break
      beforeFrom += rows.length
    }
  }

  const returningActive = Array.from(activeSet).reduce((acc, uid) => acc + (beforeSet.has(uid) ? 1 : 0), 0)
  const newActive = Math.max(0, totalActive - returningActive)

  try {
    console.info('getNewVsReturningActive diagnostics', {
      startIso,
      endIso,
      totalActive,
      newActive,
      returningActive,
    })
  } catch {
    // ignore diagnostics failures
  }

  return { newActive, returningActive, totalActive }
}


// ========== Engagement: Activation metrics (time-to-first-message) ==========
export interface ActivationMetrics {
  signups: number
  withFirstMsg1d: number
  withFirstMsg7d: number
  pct1d: number
  pct7d: number
  medianHoursToFirstMsg: number | null
}

/**
 * Activation metrics within a signup window:
 * - signups: users created within [start,end)
 * - withFirstMsg1d/7d: those who sent their first message within 1/7 days from signup
 * - pct1d/pct7d: percentage of signups activated in 1/7 days
 * - medianHoursToFirstMsg: median time in hours from signup to first message (only for users who sent a first message)
 *
 * If the provided range lacks a start (e.g., "lifetime"), default to a 30-day window ending at `end`.
 */
export async function getActivationMetrics(preset: TimePreset | DateRange = '30d'): Promise<ActivationMetrics> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const endIso = range.end ?? new Date().toISOString()

  const MS_DAY = 24 * 60 * 60 * 1000
  const endTs = new Date(endIso).getTime()
  const startIso = range.start ?? new Date(endTs - 30 * MS_DAY).toISOString()

  // 1) Fetch signups in window
  const usersQ = supabase
    .from('users')
    .select('id, created_at')
    .gte('created_at', startIso)
    .lt('created_at', endIso)

  const { data: signupRows, error: usersErr } = await usersQ
  if (usersErr) {
    const msg = serializeErrorForMessage(usersErr)
    throw new Error(`getActivationMetrics (users) error: ${msg}`)
  }

  const signups = signupRows?.length ?? 0
  if (signups === 0) {
    return {
      signups: 0,
      withFirstMsg1d: 0,
      withFirstMsg7d: 0,
      pct1d: 0,
      pct7d: 0,
      medianHoursToFirstMsg: null,
    }
  }

  // Map userId -> signup timestamp
  const signupAt = new Map<string, number>()
  const userIds: string[] = []
  for (const u of signupRows ?? []) {
    const id = String((u as { id: unknown }).id)
    const ts = new Date(String((u as { created_at: unknown }).created_at)).getTime()
    if (Number.isFinite(ts)) {
      signupAt.set(id, ts)
      userIds.push(id)
    }
  }

  // 2) For those users, fetch their earliest chat message (any time)
  // Chunk to avoid IN list limits
  const chunkSize = 500
  const firstMsgAt = new Map<string, number>() // userId -> earliest message timestamp

  // Helper to extract user_id from joined relation safely
  // Uses shared extractUserIdFromRelation helper

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)

    const q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .in('user_channels.user_id', chunk)

    const { data: rows, error } = await q
    if (error) {
      const msg = serializeErrorForMessage(error)
      throw new Error(`getActivationMetrics (messages) error: ${msg}`)
    }

    for (const row of rows ?? []) {
      const rel = (row as { user_channels?: unknown }).user_channels as unknown
      const uid = extractUserIdFromRelation(rel)
      if (!uid) continue
      const t = new Date(String((row as { created_at?: unknown }).created_at)).getTime()
      if (!Number.isFinite(t)) continue
      const prev = firstMsgAt.get(uid)
      if (prev === undefined || t < prev) firstMsgAt.set(uid, t)
    }
  }

  // 3) Compute counts and median
  let withFirstMsg1d = 0
  let withFirstMsg7d = 0
  const deltas: number[] = [] // hours

  for (const uid of userIds) {
    const s = signupAt.get(uid)
    const f = firstMsgAt.get(uid)
    if (s === undefined || f === undefined) continue
    const deltaMs = f - s
    if (deltaMs < 0) continue // ignore clock skew anomalies
    if (deltaMs <= 1 * MS_DAY) withFirstMsg1d++
    if (deltaMs <= 7 * MS_DAY) withFirstMsg7d++
    const hours = deltaMs / (60 * 60 * 1000)
    if (Number.isFinite(hours)) deltas.push(hours)
  }

  deltas.sort((a, b) => a - b)
  const medianHoursToFirstMsg =
    deltas.length === 0
      ? null
      : (deltas.length % 2
          ? deltas[(deltas.length - 1) / 2]
          : (deltas[deltas.length / 2 - 1] + deltas[deltas.length / 2]) / 2)

  const pct1d = signups > 0 ? withFirstMsg1d / signups : 0
  const pct7d = signups > 0 ? withFirstMsg7d / signups : 0

  try {
    console.info('getActivationMetrics diagnostics', {
      signups,
      withFirstMsg1d,
      withFirstMsg7d,
      pct1d,
      pct7d,
      medianHoursToFirstMsg,
      window: { startIso, endIso },
    })
  } catch {
    // ignore diagnostics
  }

  return {
    signups,
    withFirstMsg1d,
    withFirstMsg7d,
    pct1d,
    pct7d,
    medianHoursToFirstMsg,
  }
}

// ========== Extended Engagement Analytics (time series, distributions, seasonality) ==========

export const analyticsConfig = {
  sessionIdleMinutes: 30,
  reactivationDays: 14,
  cohortMaxWeeksDefault: 8,
  weekStartsOn: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6, // Monday
  timezone: 'UTC',
}

type TimeSeriesPoint = { date: string; value: number }
type NVRBucketPoint = { date: string; newActive: number; returningActive: number; totalActive: number }

export interface DistributionBin {
  from: number
  to: number | null // null = open-ended upper bound
  users: number
  messages: number
}
export interface DistributionResult {
  method: 'quantile'
  totalUsers: number
  totalMessages: number
  bins: DistributionBin[]
}
export interface PowerUserConcentration {
  percentile: number // e.g., 0.01 for 1%
  share: number // share of total messages contributed by top X%
}

export interface WeekdaySeasonality {
  weekday: number // 0=Sunday .. 6=Saturday (JS convention)
  label: string   // Mon..Sun aligned to weekStartsOn
  messages: number
  days: number
  avgPerDay: number
}

type UserChannelsRel = { user_id?: string } | Array<{ user_id?: string }>;
type ChatMsgWithUser = { created_at?: unknown; user_channels?: UserChannelsRel };
type ChatMsgCreatedOnly = { created_at?: unknown };

// Helpers (module-local)
function ensureBoundedRange(range: DateRange, fallbackDays = 30): { start: string; end: string } {
  const endIso = range.end ?? new Date().toISOString()
  const end = new Date(endIso)
  let startIso = range.start
  if (!startIso) {
    const d = new Date(end.getTime())
    d.setDate(d.getDate() - fallbackDays)
    startIso = d.toISOString()
  }
  return { start: startIso, end: endIso }
}
function bucketizeByHoursServer(range: DateRange, hours = 24): DateRange[] {
  const { start, end } = ensureBoundedRange(range)
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const step = Math.max(1, hours * 60 * 60 * 1000)
  const parts = Math.max(1, Math.ceil((e - s) / step))
  const buckets: DateRange[] = []
  for (let i = 0; i < parts; i++) {
    const a = new Date(s + i * step).toISOString()
    const b = new Date(i === parts - 1 ? e : s + (i + 1) * step).toISOString()
    buckets.push({ start: a, end: b })
  }
  return buckets
}
function extractUserIdFromRelation(rel: unknown): string | null {
  if (!rel) return null
  if (Array.isArray(rel)) {
    const first = rel[0] as { user_id?: unknown } | undefined
    return typeof first?.user_id === 'string' && first.user_id ? first.user_id : null
  }
  if (typeof rel === 'object') {
    const uid = (rel as { user_id?: unknown }).user_id
    return typeof uid === 'string' && uid ? uid : null
  }
  return null
}
function safeTs(v: unknown): number {
  const t = new Date(String(v)).getTime()
  return Number.isFinite(t) ? t : NaN
}
function weekdayLabel(idx: number): string {
  // Map 0..6 to Mon..Sun based on weekStartsOn = Monday (1)
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return labels[idx] ?? String(idx)
}

// -------------- Stickiness over time (DAU/MAU per bucket end) --------------
/**
 * Stickiness over time. For each bucket end, compute:
 * - DAU: distinct users with a message in the trailing 1 day window
 * - MAU: distinct users with a message in the trailing 30 day window
 * value = DAU / MAU
 */
export async function getStickinessOverTime(preset: TimePreset | DateRange = '7d', bucketHours = 24): Promise<TimeSeriesPoint[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const buckets = bucketizeByHoursServer(range, bucketHours)
  if (buckets.length === 0) return []

  const MS_DAY = 24 * 60 * 60 * 1000
  const ends = buckets.map(b => safeTs(b.end ?? b.start))
  const minEnd = Math.min(...ends.filter(n => Number.isFinite(n)))
  const maxEnd = Math.max(...ends.filter(n => Number.isFinite(n)))

  // Fetch all messages in [minEnd-30d, maxEnd)
  const startIso = new Date(minEnd - 30 * MS_DAY).toISOString()
  const endIso = new Date(maxEnd).toISOString()

  // Page through messages once
  const pageSize = 1000
  let from = 0
  const samples: { t: number; uid: string }[] = []
  while (true) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`getStickinessOverTime error: ${serializeErrorForMessage(error)}`)

    const rows = data ?? []
    for (const row of rows) {
      const r = row as ChatMsgWithUser
      const uid = extractUserIdFromRelation(r.user_channels)
      const t = safeTs(r.created_at)
      if (uid && Number.isFinite(t)) samples.push({ t, uid })
    }
    if (rows.length < pageSize) break
    from += rows.length
  }

  // For each bucket end, compute DAU/MAU with a naive scan (OK for moderate volumes)
  samples.sort((a, b) => a.t - b.t)
  const out: TimeSeriesPoint[] = []
  for (const b of buckets) {
    const te = safeTs(b.end ?? b.start)
    if (!Number.isFinite(te)) continue
    const dauStart = te - 1 * MS_DAY
    const mauStart = te - 30 * MS_DAY
    const dau = new Set<string>()
    const mau = new Set<string>()
    for (const s of samples) {
      if (s.t >= mauStart && s.t < te) mau.add(s.uid)
      if (s.t >= dauStart && s.t < te) dau.add(s.uid)
    }
    const value = mau.size > 0 ? dau.size / mau.size : 0
    out.push({ date: new Date(te).toISOString(), value })
  }
  return out
}

// -------------- New vs Returning Active over time (bucketized) --------------
/**
 * For each bucket, compute New vs Returning Active using the definition
 * from getNewVsReturningActive. This reuses the existing API per bucket.
 */
export async function getNewReturningOverTime(preset: TimePreset | DateRange = '7d', bucketHours = 24): Promise<NVRBucketPoint[]> {
  // Delegated to optimized single-scan implementation to reduce DB queries while preserving output shape.
  return await getNewReturningOverTimeOptimized(preset, bucketHours)
}

// -------------- Messages per user distribution (quantile bins) --------------
/**
 * Compute dynamic quantile-based bins of messages per user within the selected range.
 * - activeOnlyInRange: include only users who sent ≥1 message in range (default true)
 * - binCount: number of quantile bins (default 5)
 */
export async function getMessagesPerUserDistribution(
  preset: TimePreset | DateRange = '7d',
  opts?: { binCount?: number; activeOnlyInRange?: boolean }
): Promise<DistributionResult> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const binCount = Math.max(2, Math.min(12, opts?.binCount ?? 5))
  const _activeOnly = opts?.activeOnlyInRange !== false
  void _activeOnly

  // Page messages in range and count per user
  const pageSize = 1000
  let from = 0
  const perUser = new Map<string, number>()
  let totalMessages = 0

  while (true) {
    let q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (range.start) q = q.gte('created_at', range.start)
    if (range.end) q = q.lt('created_at', range.end)

    const { data, error } = await q
    if (error) throw new Error(`getMessagesPerUserDistribution error: ${serializeErrorForMessage(error)}`)

    const rows = data ?? []
    for (const row of rows) {
      const r = row as ChatMsgWithUser
      const uid = extractUserIdFromRelation(r.user_channels)
      if (!uid) continue
      perUser.set(uid, (perUser.get(uid) ?? 0) + 1)
      totalMessages++
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const counts = Array.from(perUser.values()).sort((a, b) => a - b)
  const totalUsers = counts.length

  if (totalUsers === 0) {
    return {
      method: 'quantile',
      totalUsers: 0,
      totalMessages: 0,
      bins: [{ from: 0, to: null, users: 0, messages: 0 }],
    }
  }

  // Build quantile edges
  const edges: number[] = []
  for (let i = 1; i < binCount; i++) {
    const p = i / binCount
    const idx = Math.min(totalUsers - 1, Math.max(0, Math.floor(p * totalUsers) - 1))
    edges.push(counts[idx])
  }
  // Deduplicate and ensure strictly increasing where possible
  const uniqueEdges = Array.from(new Set(edges)).sort((a, b) => a - b)

  // Build bins from edges
  const bins: DistributionBin[] = []
  let prev = 0
  for (const e of uniqueEdges) {
    const fromInc = prev
    const toInc = Math.max(e, prev) // in case of duplicates
    bins.push({ from: fromInc, to: toInc, users: 0, messages: 0 })
    prev = toInc + 1
  }
  bins.push({ from: prev, to: null, users: 0, messages: 0 })

  // Tally users into bins
  for (const cnt of counts) {
    const idx = bins.findIndex(b => (cnt >= b.from) && (b.to === null ? true : cnt <= b.to))
    const b = bins[idx === -1 ? bins.length - 1 : idx]
    b.users++
    b.messages += cnt
  }

  return {
    method: 'quantile',
    totalUsers,
    totalMessages,
    bins,
  }
}

// -------------- Power-user concentration (top X% share) --------------
/**
 * Compute the share of messages contributed by the top X% of users.
 * - scope: 'in_range' (default) uses the selected window; 'lifetime' ignores date filters.
 */
export async function getPowerUserConcentration(
  preset: TimePreset | DateRange = '7d',
  opts?: { percentiles?: number[]; scope?: 'in_range' | 'lifetime' }
): Promise<PowerUserConcentration[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const scope = opts?.scope ?? 'in_range'
  const percentiles = (opts?.percentiles ?? [0.01, 0.05, 0.10]).map(p => Math.max(0.001, Math.min(0.5, p))).sort((a, b) => a - b)

  // Page messages (in-range or lifetime) and count per user
  const pageSize = 1000
  let from = 0
  const perUser = new Map<string, number>()
  let totalMessages = 0

  while (true) {
    let q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (scope === 'in_range') {
      if (range.start) q = q.gte('created_at', range.start)
      if (range.end) q = q.lt('created_at', range.end)
    }

    const { data, error } = await q
    if (error) throw new Error(`getPowerUserConcentration error: ${serializeErrorForMessage(error)}`)

    const rows = data ?? []
    for (const row of rows) {
      const r = row as ChatMsgWithUser
      const uid = extractUserIdFromRelation(r.user_channels)
      if (!uid) continue
      perUser.set(uid, (perUser.get(uid) ?? 0) + 1)
      totalMessages++
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const users = Array.from(perUser.entries()).sort((a, b) => b[1] - a[1]) // [uid, count] desc
  const n = users.length
  if (n === 0 || totalMessages === 0) return percentiles.map(p => ({ percentile: p, share: 0 }))

  const prefixSums: number[] = []
  let acc = 0
  for (const [, c] of users) {
    acc += c
    prefixSums.push(acc)
  }

  const res: PowerUserConcentration[] = []
  for (const p of percentiles) {
    const k = Math.max(1, Math.ceil(n * p))
    const share = prefixSums[k - 1] / totalMessages
    res.push({ percentile: p, share })
  }
  return res
}

// -------------- Engagement velocity (messages per active user) --------------
/**
 * Bucketized messages per active user. Applies a simple moving average smoothing (optional).
 */
export async function getEngagementVelocity(preset: TimePreset | DateRange = '7d', bucketHours = 24, smoothWindow = 3): Promise<TimeSeriesPoint[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const buckets = bucketizeByHoursServer(range, bucketHours)
  if (buckets.length === 0) return []

  // Fetch all messages in range once
  const pageSize = 1000
  let from = 0
  const points: { t: number; uid: string }[] = []
  while (true) {
    let q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (range.start) q = q.gte('created_at', range.start)
    if (range.end) q = q.lt('created_at', range.end)

    const { data, error } = await q
    if (error) throw new Error(`getEngagementVelocity error: ${serializeErrorForMessage(error)}`)

    const rows = data ?? []
    for (const row of rows) {
      const r = row as ChatMsgWithUser
      const uid = extractUserIdFromRelation(r.user_channels)
      const t = safeTs(r.created_at)
      if (uid && Number.isFinite(t)) points.push({ t, uid })
    }
    if (rows.length < pageSize) break
    from += rows.length
  }

  // For each bucket, compute messages and distinct active users
  const values: number[] = []
  const dates: string[] = []
  for (const b of buckets) {
    const ts = safeTs(b.start)
    const te = safeTs(b.end)
    if (!Number.isFinite(ts) || !Number.isFinite(te)) continue
    let msgs = 0
    const active = new Set<string>()
    for (const p of points) {
      if (p.t >= ts && p.t < te) {
        msgs++
        active.add(p.uid)
      }
    }
    const v = active.size > 0 ? msgs / active.size : 0
    values.push(v)
    dates.push((b.start ?? b.end)!)
  }

  // Simple moving average smoothing
  const win = Math.max(1, smoothWindow | 0)
  const smoothed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const a = Math.max(0, i - (win - 1))
    const b = i
    let sum = 0
    for (let j = a; j <= b; j++) sum += values[j]
    smoothed.push(sum / (b - a + 1))
  }

  return dates.map((d, i) => ({ date: d, value: smoothed[i] ?? values[i] ?? 0 }))
}

// -------------- Weekday / seasonality strip --------------
/**
 * Average messages per weekday within the selected range, normalized by the number of that weekday present in the range.
 */
export async function getWeekdaySeasonality(preset: TimePreset | DateRange = '7d'): Promise<WeekdaySeasonality[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const { start, end } = ensureBoundedRange(range, 30)
  const startTs = new Date(start).getTime()
  const endTs = new Date(end).getTime()

  // Count number of each weekday in [start,end)
  const weekdayDays: number[] = Array(7).fill(0)
  for (let t = startTs; t < endTs; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t)
    const wd = d.getUTCDay() // 0..6
    weekdayDays[wd]++
  }

  // Fetch all messages in range and tally by weekday
  const pageSize = 1000
  let from = 0
  const weekdayMsgs: number[] = Array(7).fill(0)

  while (true) {
    const q = supabase
      .from('chat_messages')
      .select('created_at')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    const { data, error } = await q
    if (error) throw new Error(`getWeekdaySeasonality error: ${serializeErrorForMessage(error)}`)

    const rows = data ?? []
    for (const row of rows) {
      const r = row as ChatMsgCreatedOnly
      const t = safeTs(r.created_at)
      if (!Number.isFinite(t)) continue
      const wd = new Date(t).getUTCDay()
      weekdayMsgs[wd]++
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  const res: WeekdaySeasonality[] = []
  for (let wd = 0; wd < 7; wd++) {
    const days = Math.max(1, weekdayDays[wd]) // avoid division by zero when range < 1 week
    const messages = weekdayMsgs[wd]
    res.push({
      weekday: wd,
      label: weekdayLabel(wd),
      messages,
      days,
      avgPerDay: messages / days,
    })
  }
  
  // Efficient: compute New vs Returning Active over time with a single window scan
    // Rotate so Monday-first if configured
    if (analyticsConfig.weekStartsOn === 1) {
      // JS: 0=Sun..6=Sat. Move Sunday to end.
      const sunday = res.shift()!
      res.push(sunday)
    }
    return res
  }
  
  // Efficient: compute New vs Returning Active over time with a single window scan
  export async function getNewReturningOverTimeOptimized(
    preset: TimePreset | DateRange = '7d',
    bucketHours = 24
  ): Promise<{ date: string; newActive: number; returningActive: number; totalActive: number }[]> {
    const supabase = createServiceRoleClient()
    const range = resolvePresetOrRange(preset)
    const buckets = (function makeBuckets(r: DateRange, hours: number) {
      const { start, end } = (function ensure(range: DateRange, fallbackDays = 30) {
        const endIso = range.end ?? new Date().toISOString()
        const end = new Date(endIso)
        let startIso = range.start
        if (!startIso) {
          const d = new Date(end.getTime())
          d.setDate(d.getDate() - fallbackDays)
          startIso = d.toISOString()
        }
        return { start: startIso, end: endIso }
      })(r)
      const s = new Date(start).getTime()
      const e = new Date(end).getTime()
      const step = Math.max(1, hours * 60 * 60 * 1000)
      const parts = Math.max(1, Math.ceil((e - s) / step))
      const out: DateRange[] = []
      for (let i = 0; i < parts; i++) {
        const a = new Date(s + i * step).toISOString()
        const b = new Date(i === parts - 1 ? e : s + (i + 1) * step).toISOString()
        out.push({ start: a, end: b })
      }
      return out
    })(range, bucketHours)
    if (buckets.length === 0) return []
  
    const windowStartIso = buckets[0].start ?? range.start ?? new Date().toISOString()
    const windowEndIso = buckets[buckets.length - 1].end ?? range.end ?? new Date().toISOString()
    const windowStartTs = new Date(windowStartIso).getTime()
    const windowEndTs = new Date(windowEndIso).getTime()
  
    type Row = { created_at?: unknown; user_channels?: { user_id?: string } | Array<{ user_id?: string }> }
    const points: { t: number; uid: string }[] = []
  
    // 1) Fetch all messages in [windowStart, windowEnd) once
    {
      const pageSize = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('created_at, user_channels!inner(user_id)')
          .gte('created_at', windowStartIso)
          .lt('created_at', windowEndIso)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1)
  
        if (error) throw new Error(`getNewReturningOverTimeOptimized (window) error: ${serializeErrorForMessage(error)}`)
        const rows = (data ?? []) as Row[]
        for (const r of rows) {
          const uid = extractUserIdFromRelation(r.user_channels)
          const t = new Date(String(r.created_at)).getTime()
          if (uid && Number.isFinite(t)) points.push({ t, uid })
        }
        if (rows.length < pageSize) break
        from += rows.length
      }
    }
  
    // 2) Build active sets per bucket and union of active users
    const activePerBucket: Array<Set<string>> = buckets.map(() => new Set<string>())
    const unionActive = new Set<string>()
    for (const p of points) {
      if (p.t < windowStartTs || p.t >= windowEndTs) continue
      const idx = Math.min(
        buckets.length - 1,
        Math.max(0, Math.floor((p.t - windowStartTs) / Math.max(1, bucketHours * 60 * 60 * 1000)))
      )
      activePerBucket[idx].add(p.uid)
      unionActive.add(p.uid)
    }
  
    // 3) For those active users, check if they had any message before windowStart
    const priorSet = new Set<string>()
    if (unionActive.size > 0) {
      const ids = Array.from(unionActive)
      const chunkSize = 500
      const pageSize = 1000
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('created_at, user_channels!inner(user_id)')
            .lt('created_at', windowStartIso)
            .in('user_channels.user_id', chunk)
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1)
  
          if (error) throw new Error(`getNewReturningOverTimeOptimized (prior) error: ${serializeErrorForMessage(error)}`)
          const rows = (data ?? []) as Row[]
          for (const r of rows) {
            const uid = extractUserIdFromRelation(r.user_channels)
            if (uid) priorSet.add(uid)
          }
          if (rows.length < pageSize) break
          from += rows.length
        }
      }
    }
  
    // 4) Walk buckets in chronological order, evolving "seen" set
    const seen = new Set<string>(priorSet)
    const out: { date: string; newActive: number; returningActive: number; totalActive: number }[] = []
    for (let i = 0; i < buckets.length; i++) {
      const set = activePerBucket[i]
      const totalActive = set.size
      let newActive = 0
      let returningActive = 0
      for (const uid of set) {
        if (seen.has(uid)) returningActive++
        else newActive++
      }
      // Update "seen" after classifying this bucket
      for (const uid of set) seen.add(uid)
  
      const date = buckets[i].start ?? buckets[i].end ?? new Date(windowStartTs + i * bucketHours * 60 * 60 * 1000).toISOString()
      out.push({ date, newActive, returningActive, totalActive })
    }
    return out
  }
  
// ========== Growth decomposition, Cohorts/Retention, Funnel, Sessionization, Reactivation ==========

export interface GrowthDecompositionPoint {
  date: string
  newActive: number
  reactivated: number
  churned: number
  active: number
}

/**
 * Growth decomposition per bucket (approximate churn as previousActive - currentActive).
 * - newActive: users whose first-ever message falls inside the bucket
 * - reactivated: users active in the bucket whose last activity before bucket start was ≥ reactivationDays ago
 * - churned: users active in previous bucket but not in current bucket (approximation accepted)
 */
export async function getGrowthDecomposition(
  preset: TimePreset | DateRange = '7d',
  bucketHours = 24,
  reactivationDays = analyticsConfig.reactivationDays
): Promise<GrowthDecompositionPoint[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const buckets = bucketizeByHoursServer(range, bucketHours)
  if (buckets.length === 0) return []

  const MS_DAY = 24 * 60 * 60 * 1000
  const lookbackStartIso = new Date(
    Math.max(
      0,
      new Date(buckets[0].start ?? range.start ?? new Date().toISOString()).getTime() - reactivationDays * MS_DAY
    )
  ).toISOString()
  const endIso = buckets[buckets.length - 1].end ?? range.end ?? new Date().toISOString()

  // Fetch messages in [lookbackStart, end] once and index by user
  const pageSize = 1000
  let from = 0
  const byUser: Map<string, number[]> = new Map()

  while (true) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .gte('created_at', lookbackStartIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`getGrowthDecomposition error: ${serializeErrorForMessage(error)}`)

    const rows = (data ?? []) as ChatMsgWithUser[]
    for (const row of rows) {
      const uid = extractUserIdFromRelation(row.user_channels)
      const t = safeTs(row.created_at)
      if (!uid || !Number.isFinite(t)) continue
      let arr = byUser.get(uid)
      if (!arr) {
        arr = []
        byUser.set(uid, arr)
      }
      arr.push(t)
    }

    if (rows.length < pageSize) break
    from += rows.length
  }

  // Ensure sorted arrays
  for (const arr of byUser.values()) arr.sort((a, b) => a - b)

  const reactMs = reactivationDays * MS_DAY
  let prevActive = new Set<string>()
  const out: GrowthDecompositionPoint[] = []

  for (const b of buckets) {
    const s = safeTs(b.start)
    const e = safeTs(b.end)
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue

    const activeNow = new Set<string>()
    let newActive = 0
    let reactivated = 0

    for (const [uid, tsList] of byUser.entries()) {
      // Binary search to check if any ts in [s,e)
      // Lower bound
      let lo = 0
      let hi = tsList.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (tsList[mid] < s) lo = mid + 1
        else hi = mid
      }
      const idx = lo
      const hasNow = idx < tsList.length && tsList[idx] < e
      if (!hasNow) continue

      activeNow.add(uid)

      // New active if first-ever is inside [s,e)
      const firstT = tsList[0]
      if (firstT >= s && firstT < e) {
        newActive++
        continue // do not count also as reactivated
      }

      // Reactivated if last before s exists and gap >= reactMs
      const beforeIdx = idx - 1
      const lastBefore = beforeIdx >= 0 ? tsList[beforeIdx] : undefined
      if (typeof lastBefore === 'number' && s - lastBefore >= reactMs) {
        reactivated++
      }
    }

    // Approximate churn as previousActive - currentActive
    let churned = 0
    for (const uid of prevActive) {
      if (!activeNow.has(uid)) churned++
    }

    out.push({
      date: new Date(s).toISOString(),
      newActive,
      reactivated,
      churned,
      active: activeNow.size,
    })
    prevActive = activeNow
  }

  return out
}

export interface CohortWeekStat {
  week: number // 0-based since signup week
  retained: number
  rate: number
}
export interface CohortRetentionRow {
  cohortStart: string // ISO Monday 00:00:00Z
  size: number
  weeks: CohortWeekStat[] // up to depth
}

/**
 * Cohort retention heatmap based on weekly signup cohorts (week starts Monday UTC).
 * - weeksDepth configurable (2..12).
 * - Retention for week k = users with ≥1 message in week k (since signup week) / cohort size.
 */
export async function getCohortRetentionHeatmap(
  preset: TimePreset | DateRange = '30d',
  weeksDepth = analyticsConfig.cohortMaxWeeksDefault
): Promise<CohortRetentionRow[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const depth = Math.min(12, Math.max(2, weeksDepth))

  // Fetch signups in selected range
  const { data: signupRows, error: usersErr } = await supabase
    .from('users')
    .select('id, created_at')
    .gte('created_at', range.start ?? '1970-01-01T00:00:00.000Z')
    .lt('created_at', range.end ?? new Date().toISOString())

  if (usersErr) throw new Error(`getCohortRetentionHeatmap (users) error: ${serializeErrorForMessage(usersErr)}`)

  const userIds: string[] = []
  const signupAt = new Map<string, number>()
  const cohortOf = new Map<string, number>() // user -> cohortStartTs (Monday UTC)
  let minCohortTs = Number.POSITIVE_INFINITY
  let maxSignupTs = 0

  function mondayUtc(ts: number): number {
    const d = new Date(ts)
    const day = d.getUTCDay() // 0..6 (Sun..Sat)
    // We want Monday (1) as start => compute offset back to Monday
    const back = (day + 6) % 7 // Sun(0)->6, Mon(1)->0, Tue(2)->1, ...
    const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back, 0, 0, 0, 0)
    return monday
  }

  for (const r of signupRows ?? []) {
    const id = String((r as { id?: unknown }).id)
    const t = safeTs((r as { created_at?: unknown }).created_at)
    if (!id || !Number.isFinite(t)) continue
    userIds.push(id)
    signupAt.set(id, t)
    const cts = mondayUtc(t)
    cohortOf.set(id, cts)
    if (cts < minCohortTs) minCohortTs = cts
    if (t > maxSignupTs) maxSignupTs = t
  }

  if (userIds.length === 0) return []

  const MS_WEEK = 7 * 24 * 60 * 60 * 1000
  const msgsStart = new Date(minCohortTs).toISOString()
  const msgsEnd = new Date(maxSignupTs + depth * MS_WEEK).toISOString()

  // Fetch messages for these users within [minCohort, maxSignup + depth weeks]
  const chunkSize = 500
  const userWeeksActive = new Map<string, Set<number>>() // user -> set of weekIndex

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('created_at, user_channels!inner(user_id)')
        .in('user_channels.user_id', chunk)
        .gte('created_at', msgsStart)
        .lt('created_at', msgsEnd)
        .order('created_at', { ascending: true })
        .range(from, from + 999)

      if (error) throw new Error(`getCohortRetentionHeatmap (messages) error: ${serializeErrorForMessage(error)}`)
      const rows = (data ?? []) as ChatMsgWithUser[]
      for (const row of rows) {
        const uid = extractUserIdFromRelation(row.user_channels)
        const t = safeTs(row.created_at)
        if (!uid || !Number.isFinite(t)) continue
        const cts = cohortOf.get(uid)
        if (cts === undefined) continue
        const wk = Math.floor((t - cts) / MS_WEEK)
        if (wk < 0 || wk >= depth) continue
        let s = userWeeksActive.get(uid)
        if (!s) {
          s = new Set<number>()
          userWeeksActive.set(uid, s)
        }
        s.add(wk)
      }

      if (rows.length < 1000) break
      from += rows.length
    }
  }

  // Aggregate per cohort
  const cohorts = new Map<number, { size: number; userIds: string[] }>()
  for (const uid of userIds) {
    const cts = cohortOf.get(uid)!
    let c = cohorts.get(cts)
    if (!c) {
      c = { size: 0, userIds: [] }
      cohorts.set(cts, c)
    }
    c.size++
    c.userIds.push(uid)
  }

  const rows: CohortRetentionRow[] = []
  const sortedCohorts = Array.from(cohorts.keys()).sort((a, b) => a - b)
  for (const cts of sortedCohorts) {
    const c = cohorts.get(cts)!
    const weeks: CohortWeekStat[] = []
    for (let k = 0; k < depth; k++) {
      let retained = 0
      for (const uid of c.userIds) {
        const s = userWeeksActive.get(uid)
        if (s?.has(k)) retained++
      }
      const rate = c.size > 0 ? retained / c.size : 0
      weeks.push({ week: k, retained, rate })
    }
    rows.push({
      cohortStart: new Date(cts).toISOString(),
      size: c.size,
      weeks,
    })
  }

  return rows
}

export interface CohortCurvePoint { day: number; rate: number }
export interface CohortRetentionCurve {
  cohortStart: string
  size: number
  points: CohortCurvePoint[] // cumulative-by-day survival up to maxDays
}

/**
 * Day-0/1/7/30 (and up to maxDays) retention curves per signup cohort.
 * Cumulative-by-day survival style: rate(day N) = share with first message by day N since signup.
 */
export async function getRetentionCurvesByCohort(
  preset: TimePreset | DateRange = '30d',
  maxDays = 30
): Promise<CohortRetentionCurve[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const depth = Math.max(1, Math.min(90, maxDays))

  // Signups in range
  const { data: signupRows, error: usersErr } = await supabase
    .from('users')
    .select('id, created_at')
    .gte('created_at', range.start ?? '1970-01-01T00:00:00.000Z')
    .lt('created_at', range.end ?? new Date().toISOString())

  if (usersErr) throw new Error(`getRetentionCurvesByCohort (users) error: ${serializeErrorForMessage(usersErr)}`)

  const userIds: string[] = []
  const signupAt = new Map<string, number>()
  const cohortOf = new Map<string, number>() // user -> cohortStartTs (Monday)
  function mondayUtc(ts: number): number {
    const d = new Date(ts)
    const day = d.getUTCDay()
    const back = (day + 6) % 7
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back, 0, 0, 0, 0)
  }
  for (const r of signupRows ?? []) {
    const id = String((r as { id?: unknown }).id)
    const t = safeTs((r as { created_at?: unknown }).created_at)
    if (!id || !Number.isFinite(t)) continue
    userIds.push(id)
    signupAt.set(id, t)
    cohortOf.set(id, mondayUtc(t))
  }
  if (userIds.length === 0) return []

  // Earliest first message per user
  const firstMsgAt = new Map<string, number>()
  const chunkSize = 500

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('created_at, user_channels!inner(user_id)')
        .in('user_channels.user_id', chunk)
        .order('created_at', { ascending: true })
        .range(from, from + 999)

      if (error) throw new Error(`getRetentionCurvesByCohort (messages) error: ${serializeErrorForMessage(error)}`)
      const rows = (data ?? []) as ChatMsgWithUser[]
      for (const row of rows) {
        const uid = extractUserIdFromRelation(row.user_channels)
        const t = safeTs(row.created_at)
        if (!uid || !Number.isFinite(t)) continue
        if (!firstMsgAt.has(uid) || t < (firstMsgAt.get(uid) as number)) {
          firstMsgAt.set(uid, t)
        }
      }
      if (rows.length < 1000) break
      from += rows.length
    }
  }

  // Group users per cohort
  const cohorts = new Map<number, string[]>()
  for (const uid of userIds) {
    const cts = cohortOf.get(uid)!
    let arr = cohorts.get(cts)
    if (!arr) {
      arr = []
      cohorts.set(cts, arr)
    }
    arr.push(uid)
  }

  const MS_DAY = 24 * 60 * 60 * 1000
  const result: CohortRetentionCurve[] = []
  const sortedCohorts = Array.from(cohorts.keys()).sort((a, b) => a - b)

  for (const cts of sortedCohorts) {
    const users = cohorts.get(cts)!
    const size = users.length
    const firstMsgDeltaDays: number[] = []
    for (const uid of users) {
      const s = signupAt.get(uid)!
      const f = firstMsgAt.get(uid)
      if (typeof f === 'number') {
        const d = Math.floor((f - s) / MS_DAY)
        if (d >= 0) firstMsgDeltaDays.push(d)
      }
    }
    firstMsgDeltaDays.sort((a, b) => a - b)

    const points: CohortCurvePoint[] = []
    for (let day = 0; day <= depth; day++) {
      const retained = firstMsgDeltaDays.filter((v) => v <= day).length
      const rate = size > 0 ? retained / size : 0
      points.push({ day, rate })
    }
    result.push({ cohortStart: new Date(cts).toISOString(), size, points })
  }

  return result
}

export interface Funnel24h {
  signups: number
  firstMsg24h: number
  twoSessions24h: number
}

/**
 * First 24h engagement funnel:
 * signup -> first message (within 24h) -> second session within 24h (session gap ≥ 30 minutes).
 */
export async function getFirst24hFunnel(
  preset: TimePreset | DateRange = '30d',
  sessionIdleMinutes = analyticsConfig.sessionIdleMinutes
): Promise<Funnel24h> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  // Signups in window
  const { data: signupRows, error: usersErr } = await supabase
    .from('users')
    .select('id, created_at')
    .gte('created_at', range.start ?? '1970-01-01T00:00:00.000Z')
    .lt('created_at', range.end ?? new Date().toISOString())

  if (usersErr) throw new Error(`getFirst24hFunnel (users) error: ${serializeErrorForMessage(usersErr)}`)

  const userIds: string[] = []
  const signupAt = new Map<string, number>()
  let minSignup = Number.POSITIVE_INFINITY
  let maxSignup = 0
  for (const r of signupRows ?? []) {
    const id = String((r as { id?: unknown }).id)
    const t = safeTs((r as { created_at?: unknown }).created_at)
    if (!id || !Number.isFinite(t)) continue
    userIds.push(id)
    signupAt.set(id, t)
    if (t < minSignup) minSignup = t
    if (t > maxSignup) maxSignup = t
  }
  const signups = userIds.length
  if (signups === 0) return { signups: 0, firstMsg24h: 0, twoSessions24h: 0 }

  const windowStart = new Date(minSignup).toISOString()
  const windowEnd = new Date(maxSignup + 24 * 60 * 60 * 1000).toISOString()

  // Fetch messages for these users within [minSignup, maxSignup+24h]
  const chunkSize = 500
  const byUserTs = new Map<string, number[]>()

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('created_at, user_channels!inner(user_id)')
        .in('user_channels.user_id', chunk)
        .gte('created_at', windowStart)
        .lt('created_at', windowEnd)
        .order('created_at', { ascending: true })
        .range(from, from + 999)

      if (error) throw new Error(`getFirst24hFunnel (messages) error: ${serializeErrorForMessage(error)}`)
      const rows = (data ?? []) as ChatMsgWithUser[]
      for (const row of rows) {
        const uid = extractUserIdFromRelation(row.user_channels)
        const t = safeTs(row.created_at)
        if (!uid || !Number.isFinite(t)) continue
        let arr = byUserTs.get(uid)
        if (!arr) {
          arr = []
          byUserTs.set(uid, arr)
        }
        arr.push(t)
      }
      if (rows.length < 1000) break
      from += rows.length
    }
  }

  const idleMs = Math.max(1, sessionIdleMinutes) * 60 * 1000
  let firstMsg24h = 0
  let twoSessions24h = 0

  for (const uid of userIds) {
    const s = signupAt.get(uid)!
    const ts = (byUserTs.get(uid) ?? []).filter((t) => t >= s && t < s + 24 * 60 * 60 * 1000)
    if (ts.length > 0) firstMsg24h++

    // Sessionize within 24h window
    if (ts.length > 0) {
      let sessions = 1
      for (let i = 1; i < ts.length; i++) {
        if (ts[i] - ts[i - 1] >= idleMs) sessions++
      }
      if (sessions >= 2) twoSessions24h++
    }
  }

  return { signups, firstMsg24h, twoSessions24h }
}

export interface SessionizationSeries {
  sessionsPerUser: TimeSeriesPoint[]
  avgSessionMinutes: TimeSeriesPoint[]
}

/**
 * Sessionization metrics over time:
 * - sessionsPerUser: total sessions / active users per bucket
 * - avgSessionMinutes: average session length (minutes) per bucket
 */
export async function getSessionizationMetrics(
  preset: TimePreset | DateRange = '7d',
  bucketHours = 24,
  sessionIdleMinutes = analyticsConfig.sessionIdleMinutes
): Promise<SessionizationSeries> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const buckets = bucketizeByHoursServer(range, bucketHours)
  if (buckets.length === 0) return { sessionsPerUser: [], avgSessionMinutes: [] }

  // Fetch all messages in range once
  const pageSize = 1000
  let from = 0
  const points: { t: number; uid: string }[] = []
  while (true) {
    let q = supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (range.start) q = q.gte('created_at', range.start)
    if (range.end) q = q.lt('created_at', range.end)

    const { data, error } = await q
    if (error) throw new Error(`getSessionizationMetrics error: ${serializeErrorForMessage(error)}`)

    const rows = (data ?? []) as ChatMsgWithUser[]
    for (const row of rows) {
      const uid = extractUserIdFromRelation(row.user_channels)
      const t = safeTs(row.created_at)
      if (uid && Number.isFinite(t)) points.push({ t, uid })
    }
    if (rows.length < pageSize) break
    from += rows.length
  }

  const idleMs = Math.max(1, sessionIdleMinutes) * 60 * 1000
  const sessionsPerUser: TimeSeriesPoint[] = []
  const avgSessionMinutes: TimeSeriesPoint[] = []

  for (const b of buckets) {
    const ts = safeTs(b.start)
    const te = safeTs(b.end)
    if (!Number.isFinite(ts) || !Number.isFinite(te)) continue

    // Group points by user within bucket
    const byUser = new Map<string, number[]>()
    for (const p of points) {
      if (p.t >= ts && p.t < te) {
        let arr = byUser.get(p.uid)
        if (!arr) {
          arr = []
          byUser.set(p.uid, arr)
        }
        arr.push(p.t)
      }
    }

    let totalSessions = 0
    let totalDurationMs = 0
    let activeUsers = 0

    for (const arr of byUser.values()) {
      if (arr.length === 0) continue
      activeUsers++
      arr.sort((a, b) => a - b)
      let sessions = 1
      let sessStart = arr[0]
      let last = arr[0]
      for (let i = 1; i < arr.length; i++) {
        const t = arr[i]
        if (t - last >= idleMs) {
          // close previous session
          totalDurationMs += Math.max(0, last - sessStart)
          sessions++
          sessStart = t
        }
        last = t
      }
      // close final session
      totalDurationMs += Math.max(0, last - sessStart)
      totalSessions += sessions
    }

    const spu = activeUsers > 0 ? totalSessions / activeUsers : 0
    const avgMin = totalSessions > 0 ? totalDurationMs / totalSessions / (60 * 1000) : 0

    sessionsPerUser.push({ date: new Date(ts).toISOString(), value: spu })
    avgSessionMinutes.push({ date: new Date(ts).toISOString(), value: avgMin })
  }

  return { sessionsPerUser, avgSessionMinutes }
}

export interface ReactivationPoint {
  date: string
  reactivated: number
  active: number
  rate: number
}

/**
 * Reactivation over time:
 * - reactivated: users active in bucket with last activity before bucket start ≥ reactivationDays old (and not first-ever in bucket)
 * - rate: reactivated / active in bucket
 */
export async function getReactivationRate(
  preset: TimePreset | DateRange = '30d',
  bucketHours = 24,
  reactivationDays = analyticsConfig.reactivationDays
): Promise<ReactivationPoint[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const buckets = bucketizeByHoursServer(range, bucketHours)
  if (buckets.length === 0) return []

  const MS_DAY = 24 * 60 * 60 * 1000
  const reactMs = reactivationDays * MS_DAY
  const lookbackStartIso = new Date(
    Math.max(
      0,
      new Date(buckets[0].start ?? range.start ?? new Date().toISOString()).getTime() - reactMs
    )
  ).toISOString()
  const endIso = buckets[buckets.length - 1].end ?? range.end ?? new Date().toISOString()

  // Fetch messages in [lookbackStart, end]
  const pageSize = 1000
  let from = 0
  const byUser: Map<string, number[]> = new Map()
  while (true) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('created_at, user_channels!inner(user_id)')
      .gte('created_at', lookbackStartIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`getReactivationRate error: ${serializeErrorForMessage(error)}`)

    const rows = (data ?? []) as ChatMsgWithUser[]
    for (const row of rows) {
      const uid = extractUserIdFromRelation(row.user_channels)
      const t = safeTs(row.created_at)
      if (!uid || !Number.isFinite(t)) continue
      let arr = byUser.get(uid)
      if (!arr) {
        arr = []
        byUser.set(uid, arr)
      }
      arr.push(t)
    }

    if (rows.length < pageSize) break
    from += rows.length
  }
  for (const arr of byUser.values()) arr.sort((a, b) => a - b)

  const out: ReactivationPoint[] = []
  for (const b of buckets) {
    const s = safeTs(b.start)
    const e = safeTs(b.end)
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue

    let active = 0
    let reactivated = 0
    for (const [, tsList] of byUser.entries()) {
      // Any activity now?
      // lower bound for s
      let lo = 0
      let hi = tsList.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (tsList[mid] < s) lo = mid + 1
        else hi = mid
      }
      const idx = lo
      const hasNow = idx < tsList.length && tsList[idx] < e
      if (!hasNow) continue
      active++

      // First-ever in bucket?
      const firstT = tsList[0]
      if (firstT >= s && firstT < e) {
        // New users are not counted as reactivated
        continue
      }

      const lastBefore = idx - 1 >= 0 ? tsList[idx - 1] : undefined
      if (typeof lastBefore === 'number' && s - lastBefore >= reactMs) {
        reactivated++
      }
    }
    const rate = active > 0 ? reactivated / active : 0
    out.push({ date: new Date(s).toISOString(), reactivated, active, rate })
  }

  return out
}