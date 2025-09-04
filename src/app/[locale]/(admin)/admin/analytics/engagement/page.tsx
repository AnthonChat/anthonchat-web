import { DateRangePicker } from '@/components/admin/analytics/DateRangePicker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAvgMessagesPerUser, getMessagesCount, getMessagesPerChannel, getNewUsersCount, getSignupsAttribution, getUsersPerChannel } from '@/lib/analytics/engagement'
import { coerceRangeFromSearchParams, type SearchParams as SP } from '@/lib/analytics/time'
import type { DateRange } from '@/lib/analytics/time'
import AreaChart from '@/components/admin/analytics/AreaChart'
import IntervalSelector from '@/components/admin/analytics/IntervalSelector'


// Helpers to derive effective ranges and bucketize for sparklines
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

/**
 * Bucketize by fixed hours interval (e.g., 3h). This produces buckets with
 * a step of `hours` hours and ensures the last bucket ends at the requested end.
 */
function bucketizeByHours(range: DateRange, hours = 3): DateRange[] {
  const { start, end } = ensureBoundedRange(range)
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const step = Math.max(1, hours * 60 * 60 * 1000) // milliseconds per step
  const parts = Math.max(1, Math.ceil((e - s) / step))
  const buckets: DateRange[] = []
  for (let i = 0; i < parts; i++) {
    const a = new Date(s + i * step).toISOString()
    const b = new Date(i === parts - 1 ? e : s + (i + 1) * step).toISOString()
    buckets.push({ start: a, end: b })
  }
  return buckets
}

export default async function EngagementAnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  // Resolve searchParams per Next.js async dynamic API
  const sp = await searchParams

  // Unified page-level range
  const baseR = coerceRangeFromSearchParams(sp, 'range', '7d').range

  const getFirst = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const hasOverride = (key: string) => {
    const v = getFirst(sp[key])
    const s = getFirst(sp[`${key}_start`])
    const e = getFirst(sp[`${key}_end`])
    return Boolean(v || s || e)
  }
  const rangeFor = (key: string, defaultPreset: '7d' | '30d' | 'this_month' | 'lifetime' = '7d') => {
    if (hasOverride(key)) return coerceRangeFromSearchParams(sp, key, defaultPreset).range
    return baseR
  }

  // Read optional interval parameter for messages & new-users bucketization (e.g. "3h")
  const parseHoursInterval = (val: string | null | undefined, fallback = 3) => {
    if (!val) return fallback
    const m = /^(\d+)\s*h$/i.exec(val)
    if (!m) return fallback
    const n = parseInt(m[1], 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  // Global interval from the header IntervalSelector (?interval=...)
  const globalIntervalParam = getFirst(sp['interval'])
  const globalIntervalHours = parseHoursInterval(globalIntervalParam, 3)
  const msgIntervalParam = getFirst(sp['msg_interval'])
  const msgIntervalHours = parseHoursInterval(msgIntervalParam, globalIntervalHours)
  const nuIntervalParam = getFirst(sp['nu_interval'])
  const nuIntervalHours = parseHoursInterval(nuIntervalParam, globalIntervalHours)

  // Effective per-widget ranges (inherit from page if not overridden)
  const nuR = rangeFor('nu', '7d')
  const regR = rangeFor('reg', '7d')
  const msgR = rangeFor('msg', '7d')
  const mpcR = rangeFor('mpc', '7d')

  // Users per channel keeps lifetime by default unless overridden explicitly
  const upcParam = coerceRangeFromSearchParams(sp, 'upc', 'lifetime')
  const upcR = upcParam.preset === 'lifetime' ? 'lifetime' : upcParam.range

  const avgR = rangeFor('avg', '7d')

  // Helper to produce a stable, non-empty string from unknown thrown values so we
  // never propagate empty/opaque objects to the client render path.
  const serializeError = (e: unknown) => {
    const safeStringify = (v: unknown) => {
      try {
        if (v instanceof Error) {
          return v.message || v.name || String(v)
        }
        if (typeof v === 'string') return v
        if (typeof v === 'object' && v !== null) {
          // Prefer common fields
          const obj = v as Record<string, unknown>
          const msg = obj['message']
          if (typeof msg === 'string' && msg.trim()) return msg
          const err = obj['error']
          if (typeof err === 'string' && err.trim()) return err
          // Fall back to JSON; limit length to avoid huge messages
          try {
            const s = JSON.stringify(obj)
            return s.length > 1000 ? s.slice(0, 1000) + '…' : s
          } catch {
            // Shallow copy of enumerable props
            const copy: Record<string, unknown> = {}
            for (const k of Object.keys(obj)) {
              try {
                copy[k] = (obj as Record<string, unknown>)[k]
              } catch {
                copy[k] = '[unserializable]'
              }
            }
            const s = JSON.stringify(copy)
            return s.length > 1000 ? s.slice(0, 1000) + '…' : s
          }
        }
        return String(v)
      } catch {
        try {
          return String(v)
        } catch {
          return 'Unknown error'
        }
      }
    }

    const s = safeStringify(e).trim()
    // If resulting string is empty or only contains an empty message JSON, normalize.
    if (!s || s === '{}' || s === '[]' || /^\{"message":\s*""\}$/.test(s)) {
      return 'Unknown error (empty message)'
    }
    return s
  }

  let newUsers, regData, totalMsgs, msgsPerChannel, usersPerChannel, avg;
  try {
    [newUsers, regData, totalMsgs, msgsPerChannel, usersPerChannel, avg] =
      await Promise.all([
        getNewUsersCount(nuR),
        getSignupsAttribution(regR),
        getMessagesCount(msgR),
        getMessagesPerChannel(mpcR),
        upcR === "lifetime"
          ? getUsersPerChannel("lifetime")
          : getUsersPerChannel(upcR),
        getAvgMessagesPerUser(avgR),
      ]);
  } catch (err) {
    // Log server-side with the raw error for diagnostics, but rethrow a stable
    // Error instance with a concise message so React Server Components and the
    // client don't receive opaque/empty error objects.
    console.error("EngagementAnalyticsPage data fetch error:", err);
    throw new Error(
      `EngagementAnalyticsPage data fetch failed: ${serializeError(err)}`
    );
  }

  // Sparkline series (bucketized over each effective range)
  let nuSpark, msgSpark;
  try {
    // Use configured bucket interval for new users as well
    nuSpark = await Promise.all(bucketizeByHours(nuR, nuIntervalHours).map(r => getNewUsersCount(r)));
    // Bucketize messages using the configured interval (msgIntervalHours)
    msgSpark = await Promise.all(bucketizeByHours(msgR, msgIntervalHours).map(r => getMessagesCount(r)));
  } catch (err) {
    // Log and rethrow with stable message
    console.error("EngagementAnalyticsPage sparkline fetch error:", err);
    throw new Error(
      `EngagementAnalyticsPage sparkline fetch failed: ${serializeError(err)}`
    );
  }

  const mpcTotal = msgsPerChannel.reduce((acc, r) => acc + (r.count || 0), 0)
  
  // Prepare small series for area charts (bucketized)
  const nuSeries = [
    {
      name: "New Users",
      color: "var(--primary)",
      data: bucketizeByHours(nuR, nuIntervalHours).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: nuSpark[i] ?? 0,
      })),
    },
  ]
  
  const msgSeries = [
    {
      name: "Messages",
      color: "var(--primary)",
      data: bucketizeByHours(msgR, msgIntervalHours).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: msgSpark[i] ?? 0,
      })),
    },
  ]
  
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Engagement Analytics</h1>
        <div className="flex items-center gap-3">
          <IntervalSelector />
          <DateRangePicker paramKey="range" defaultPreset="7d" />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">New Users</CardTitle>
            <DateRangePicker paramKey="nu" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{newUsers.toLocaleString()}</div>
            <div className="mt-2 h-12">
              <AreaChart compact series={nuSeries} height={48} className="h-12" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Total Messages</CardTitle>
            <DateRangePicker paramKey="msg" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMsgs.toLocaleString()}</div>
            <div className="mt-2 h-12">
              <AreaChart compact series={msgSeries} height={48} className="h-12" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Avg Messages per User</CardTitle>
            <DateRangePicker paramKey="avg" defaultPreset="7d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avg.average.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {avg.totalMessages.toLocaleString()} messages • {avg.activeUsers.toLocaleString()} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Registrations from Chat</CardTitle>
            <DateRangePicker paramKey="reg" defaultPreset="7d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{regData.fromChat.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Website: {regData.fromWebsite.toLocaleString()} • Total: {regData.total.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages per channel distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Messages per Channel</CardTitle>
            <DateRangePicker paramKey="mpc" defaultPreset="7d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            {msgsPerChannel.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-3">
                {msgsPerChannel.map((r) => {
                  const pct = mpcTotal ? (r.count / mpcTotal) * 100 : 0
                  return (
                    <div key={r.channel_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{r.channel_id}</span>
                        <span className="font-medium">{r.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full rounded bg-primary/15">
                        <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total messages card kept for balance on md grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Total Messages</CardTitle>
            <DateRangePicker paramKey="msg" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMsgs.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users per channel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Users per Channel</CardTitle>
            <CardDescription>Lifetime by default; toggle timeframe if needed</CardDescription>
          </div>
          <DateRangePicker paramKey="upc" defaultPreset="lifetime" compact />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {usersPerChannel.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              usersPerChannel.map((u) => (
                <div key={u.channel_id} className="flex items-center justify-between rounded border p-3">
                  <span className="text-sm capitalize">{u.channel_id}</span>
                  <span className="font-semibold">{u.users.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Small trend chart for New Users (bucketized) */}
      <AreaChart
        title="New Users"
        description="Trend over the selected period (bucketized)"
        series={nuSeries}
        height={200}
      />

      {/* Small trend chart for Messages */}
      <AreaChart
        title="Messages"
        description="Messages over the selected period (bucketized)"
        series={msgSeries}
        height={200}
      />
    </div>
  )
}