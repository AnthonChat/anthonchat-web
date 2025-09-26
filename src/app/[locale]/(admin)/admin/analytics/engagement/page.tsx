import { DateRangePicker } from '@/components/admin/analytics/DateRangePicker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  getAvgMessagesPerUser,
  getMessagesCount,
  getMessagesPerChannel,
  getNewUsersCount,
  getSignupsAttribution,
  getUsersPerChannel,
  getDAUWAUMAU,
  getNewVsReturningActive,
  getActivationMetrics,
  getWeekdaySeasonality,
  getFirst24hFunnel,
} from '@/lib/analytics/engagement'
import { coerceRangeFromSearchParams, type SearchParams as SP } from '@/lib/analytics/time'
import type { DateRange, TimePreset } from '@/lib/analytics/time'
import AreaChart from '@/components/admin/analytics/AreaChart'
import IntervalSelector from '@/components/admin/analytics/IntervalSelector'
import HelpPopover from '@/components/common/HelpPopover'
import { unstable_cache as nextCache } from 'next/cache'
import { Suspense } from 'react'
import MoreTrendsSection from '@/components/admin/analytics/MoreTrendsSection'
import DistributionsSection from '@/components/admin/analytics/DistributionsSection'
import CohortsSection from '@/components/admin/analytics/CohortsSection'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { NewUsersCard } from '@/components/admin/analytics/NewUsersCard'
import { CardSkeleton } from '@/components/admin/analytics/CardSkeleton'
import type {
  MessagesPerChannel,
  UsersPerChannel,
  WeekdaySeasonality as WSeasonality,
  Funnel24h,
} from '@/lib/analytics/engagement'


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

/**
 * Build a stable key for Suspense boundaries so cards remount (and show skeletons)
 * when time windows or intervals change during client navigation.
 */
function rangeKey(r: TimePreset | DateRange | 'lifetime'): string {
  if (typeof r === 'string') return r
  const s = r.start ?? ''
  const e = r.end ?? ''
  return `${s}|${e}`
}


// Cached wrappers (TTL ~60s)
const cachedGetNewUsersCount = nextCache(
  (range: TimePreset | DateRange) => getNewUsersCount(range),
  ['getNewUsersCount'],
  { revalidate: 60 }
)
const cachedGetMessagesCount = nextCache(
  (range: TimePreset | DateRange) => getMessagesCount(range),
  ['getMessagesCount'],
  { revalidate: 60 }
)
const cachedGetSignupsAttribution = nextCache(
  (range: TimePreset | DateRange) => getSignupsAttribution(range),
  ['getSignupsAttribution'],
  { revalidate: 60 }
)
const cachedGetMessagesPerChannel = nextCache(
  (range: TimePreset | DateRange) => getMessagesPerChannel(range),
  ['getMessagesPerChannel'],
  { revalidate: 60 }
)
const cachedGetUsersPerChannel = nextCache(
  (range: TimePreset | DateRange | 'lifetime') => getUsersPerChannel(range),
  ['getUsersPerChannel'],
  { revalidate: 60 }
)
const cachedGetAvgMessagesPerUser = nextCache(
  (range: TimePreset | DateRange) => getAvgMessagesPerUser(range),
  ['getAvgMessagesPerUser'],
  { revalidate: 60 }
)
const cachedGetDAUWAUMAU = nextCache(
  (range: TimePreset | DateRange) => getDAUWAUMAU(range),
  ['getDAUWAUMAU'],
  { revalidate: 60 }
)
const cachedGetNewVsReturningActive = nextCache(
  (range: TimePreset | DateRange) => getNewVsReturningActive(range),
  ['getNewVsReturningActive'],
  { revalidate: 60 }
)
const cachedGetActivationMetrics = nextCache(
  (range: TimePreset | DateRange) => getActivationMetrics(range),
  ['getActivationMetrics'],
  { revalidate: 60 }
)
const cachedGetWeekdaySeasonality = nextCache(
  (range: TimePreset | DateRange) => getWeekdaySeasonality(range),
  ['getWeekdaySeasonality'],
  { revalidate: 60 }
)
const cachedGetFirst24hFunnel = nextCache(
  (range: TimePreset | DateRange) => getFirst24hFunnel(range),
  ['getFirst24hFunnel'],
  { revalidate: 60 }
)

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
  const actR = rangeFor('act', '7d')
  const nvrR = rangeFor('nvr', '7d')
  const dwmR = rangeFor('dwm', '7d')

  // Ranges for new widgets (per-widget override; inherit from page if not set)
  const distR = rangeFor('dist', '7d')
  const pucR = rangeFor('puc', '7d')
  const wkdR = rangeFor('wkd', '7d')
  const cohR = rangeFor('coh', '30d')
  const rcvR = rangeFor('rcv', '30d')

  // Additional analytics inputs and computed series params
  const cohortWeeksParam = getFirst(sp['cohort_weeks'])
  const cohortWeeks = (() => {
    const n = parseInt(cohortWeeksParam || '', 10)
    return Number.isFinite(n) ? Math.min(12, Math.max(2, n)) : 8
  })()

  // Flags (URL-driven)
  const distBinsParam = getFirst(sp['dist_bins'])
  const distBins = (() => {
    const n = parseInt(distBinsParam || '', 10)
    return Number.isFinite(n) ? Math.max(2, Math.min(12, n)) : 5
  })()
  const distActiveParam = getFirst(sp['dist_active'])
  const distActive = distActiveParam === '0' ? false : true

  const pucScopeParam = getFirst(sp['puc_scope'])
  const pucScope: 'in_range' | 'lifetime' = pucScopeParam === 'lifetime' ? 'lifetime' : 'in_range'

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
      <h2 className="mt-6 mb-2 text-lg font-semibold">Acquisition and Activity</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Suspense fallback={<CardSkeleton title="New Users" showChart />}>
          <NewUsersCard
            key={`nu-${rangeKey(nuR)}-${nuIntervalHours}`}
            range={nuR}
            intervalHours={nuIntervalHours}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Total Messages" showChart />}>
          <TotalMessagesCard
            key={`msg-${rangeKey(msgR)}-${msgIntervalHours}`}
            range={msgR}
            intervalHours={msgIntervalHours}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Avg Messages per User" />}>
          <AvgMessagesPerUserCard
            key={`avg-${rangeKey(avgR)}`}
            range={avgR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Registrations from Chat" />}>
          <RegistrationsCard
            key={`reg-${rangeKey(regR)}`}
            range={regR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="New vs Returning Active" />}>
          <NewVsReturningActiveCard
            key={`nvr-${rangeKey(nvrR)}`}
            range={nvrR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="DAU / WAU / MAU" />}>
          <DauWauMauCard
            key={`dwm-${rangeKey(dwmR)}`}
            range={dwmR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Stickiness" />}>
          <StickinessCard
            key={`stick-${rangeKey(dwmR)}`}
            range={dwmR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Activation" />}>
          <ActivationCard
            key={`act-${rangeKey(actR)}`}
            range={actR}
          />
        </Suspense>
      </div>

      {/* Messages per channel distribution */}
      <h2 className="mt-8 mb-2 text-lg font-semibold">Channels</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Suspense fallback={<CardSkeleton title="Messages per Channel" />}>
          <MessagesPerChannelCard
            key={`mpc-${rangeKey(mpcR)}`}
            range={mpcR}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton title="Total Messages" />}>
          <TotalMessagesSimpleCard
            key={`msg-simple-${rangeKey(msgR)}`}
            range={msgR}
          />
        </Suspense>
      </div>

      {/* Users per channel */}
      <h2 className="mt-8 mb-2 text-lg font-semibold">Audience by Channel</h2>
      <Suspense fallback={<CardSkeleton title="Users per Channel" />}>
        <UsersPerChannelCard
          key={`upc-${rangeKey(upcR)}`}
          range={upcR}
        />
      </Suspense>

      {/* Small trend chart for New Users (bucketized) */}
      <h2 className="mt-8 mb-2 text-lg font-semibold">Trends</h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading new users trend…</div>}>
        <NewUsersTrendChart
          key={`nu-tr-${rangeKey(nuR)}-${nuIntervalHours}`}
          range={nuR}
          intervalHours={nuIntervalHours}
        />
      </Suspense>

      {/* Small trend chart for Messages */}
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading messages trend…</div>}>
        <MessagesTrendChart
          key={`msg-tr-${rangeKey(msgR)}-${msgIntervalHours}`}
          range={msgR}
          intervalHours={msgIntervalHours}
        />
      </Suspense>

      {/* More Trends (streamed) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground">Failed to load trends section</div>}>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading trends…</div>}>
          <MoreTrendsSection
            key={`mt-${rangeKey(dwmR)}-${rangeKey(nvrR)}-${rangeKey(msgR)}-${rangeKey(baseR)}-${globalIntervalHours}`}
            bucketHours={globalIntervalHours}
            dwmR={dwmR}
            nvrR={nvrR}
            msgR={msgR}
            baseR={baseR}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Distributions (streamed) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground">Failed to load distributions section</div>}>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading distributions…</div>}>
          <DistributionsSection
            key={`dist-${rangeKey(distR)}-${distBins}-${distActive}-${rangeKey(pucR)}-${pucScope}`}
            distR={distR}
            distBins={distBins}
            distActive={distActive}
            pucR={pucR}
            pucScope={pucScope}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Seasonality */}
      <h2 className="mt-8 mb-2 text-lg font-semibold flex items-center gap-2">
        Weekday seasonality
        <HelpPopover text="Average messages per weekday normalized by the number of days present in the selected range." />
      </h2>
      <Suspense fallback={<CardSkeleton title="Weekday seasonality" />}>
        <WeekdaySeasonalityCard
          key={`wkd-${rangeKey(wkdR)}`}
          range={wkdR}
        />
      </Suspense>

      {/* Cohorts (streamed) */}
      <ErrorBoundary fallback={<div className="text-sm text-muted-foreground">Failed to load cohorts section</div>}>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading cohorts…</div>}>
          <CohortsSection
            key={`coh-${rangeKey(cohR)}-${cohortWeeks}-${rangeKey(rcvR)}`}
            cohR={cohR}
            cohortWeeks={cohortWeeks}
            rcvR={rcvR}
          />
        </Suspense>
      </ErrorBoundary>

      {/* First 24h funnel */}
      <h2 className="mt-8 mb-2 text-lg font-semibold flex items-center gap-2">
        First 24h engagement funnel
        <HelpPopover>
          <div className="p-1">
            <p className="mb-1">Signup → first message within 24h → second session within 24h (≥30m idle gap).</p>
          </div>
        </HelpPopover>
      </h2>
      <Suspense fallback={<CardSkeleton title="24h Funnel" />}>
        <First24hFunnelCard
          key={`f24-${rangeKey(baseR)}`}
          range={baseR}
        />
      </Suspense>
    </div>
  )
}


/**
 * Async server components per-card, each wrapped by Suspense in the page above.
 */

async function TotalMessagesCard({ range, intervalHours }: { range: TimePreset | DateRange; intervalHours: number }) {
  const totalMsgs = await cachedGetMessagesCount(range)
  const buckets = bucketizeByHours(range as DateRange, intervalHours)
  const msgSpark = await Promise.all(buckets.map((r) => cachedGetMessagesCount(r)))
  const msgSeries = [
    {
      name: 'Messages',
      color: 'var(--primary)',
      data: buckets.map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: msgSpark[i] ?? 0,
      })),
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Total Messages
            <HelpPopover text="Count of messages sent across all channels in the selected period." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="msg" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalMsgs.toLocaleString()}</div>
        <div className="mt-2 h-12">
          <AreaChart compact series={msgSeries} height={48} className="h-12" />
        </div>
      </CardContent>
    </Card>
  )
}

async function AvgMessagesPerUserCard({ range }: { range: TimePreset | DateRange }) {
  const avg = await cachedGetAvgMessagesPerUser(range)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Avg Messages per User
            <HelpPopover text="Total messages divided by distinct active users (users who sent ≥1 message) in the selected period." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="avg" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{avg.average.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">
          {avg.totalMessages.toLocaleString()} messages • {avg.activeUsers.toLocaleString()} active users
        </p>
      </CardContent>
    </Card>
  )
}

async function RegistrationsCard({ range }: { range: TimePreset | DateRange }) {
  const regData = await cachedGetSignupsAttribution(range)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Registrations from Chat
            <HelpPopover text="Users with signup_source = chat in the selected period. Website counts signup_source = website. Unknown/empty sources are excluded." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="reg" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{regData.fromChat.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          Website: {regData.fromWebsite.toLocaleString()} • Total: {regData.total.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}

async function NewVsReturningActiveCard({ range }: { range: TimePreset | DateRange }) {
  const { newActive, returningActive, totalActive } = await cachedGetNewVsReturningActive(range)
  const newPct = totalActive ? Math.round((newActive / totalActive) * 100) : 0
  const returningPct = totalActive ? 100 - newPct : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            New vs Returning Active
            <HelpPopover>
              <div className="p-1">
                <p className="mb-1"><strong>Active</strong>: Users who sent ≥1 message in the selected period.</p>
                <p className="mb-1"><strong>New</strong>: Active users with no messages before the period start.</p>
                <p><strong>Returning</strong>: Active users with at least one message before the period start.</p>
              </div>
            </HelpPopover>
          </span>
        </CardTitle>
        <DateRangePicker paramKey="nvr" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm text-muted-foreground">
          Total active: <span className="font-medium text-foreground">{totalActive.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-emerald-600 dark:text-emerald-400">New</span>
          <span className="font-medium">{newActive.toLocaleString()} ({newPct}%)</span>
        </div>
        <div className="h-2 w-full rounded bg-primary/15 mb-2" role="progressbar" aria-label="New active users percentage" aria-valuenow={newPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-l bg-emerald-500" style={{ width: `${newPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-sky-600 dark:text-sky-400">Returning</span>
          <span className="font-medium">{returningActive.toLocaleString()} ({returningPct}%)</span>
        </div>
        <div className="h-2 w-full rounded bg-primary/15" role="progressbar" aria-label="Returning active users percentage" aria-valuenow={returningPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-l bg-sky-500" style={{ width: `${returningPct}%` }} />
        </div>
      </CardContent>
    </Card>
  )
}

async function DauWauMauCard({ range }: { range: TimePreset | DateRange }) {
  const { dau, wau, mau } = await cachedGetDAUWAUMAU(range)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            DAU / WAU / MAU
            <HelpPopover>
              <div className="p-1">
                <p className="mb-1"><strong>DAU</strong>: Distinct users with ≥1 message in the last 24h (ending at the selected end time).</p>
                <p className="mb-1"><strong>WAU</strong>: Distinct users active in the last 7 days.</p>
                <p><strong>MAU</strong>: Distinct users active in the last 30 days.</p>
              </div>
            </HelpPopover>
          </span>
        </CardTitle>
        <DateRangePicker paramKey="dwm" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">DAU</div>
            <div className="text-2xl font-semibold">{dau.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">WAU</div>
            <div className="text-2xl font-semibold">{wau.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">MAU</div>
            <div className="text-2xl font-semibold">{mau.toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function StickinessCard({ range }: { range: TimePreset | DateRange }) {
  const { stickiness } = await cachedGetDAUWAUMAU(range)
  const stickinessPct = Math.round((stickiness || 0) * 100)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Stickiness
            <HelpPopover text="DAU / MAU. Higher means users are active more frequently within the month." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="dwm" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{stickinessPct}%</div>
        <p className="text-xs text-muted-foreground">Computed from DAU and MAU</p>
      </CardContent>
    </Card>
  )
}

async function ActivationCard({ range }: { range: TimePreset | DateRange }) {
  const activation = await cachedGetActivationMetrics(range)
  const activationPct1d = Math.round(((activation?.pct1d ?? 0) * 100))
  const activationPct7d = Math.round(((activation?.pct7d ?? 0) * 100))
  const medianHours = activation?.medianHoursToFirstMsg

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Activation
            <HelpPopover>
              <div className="p-1">
                <p className="mb-1">Share of signups who send their first message within 1 or 7 days of signup.</p>
                <p className="mb-1"><strong>1-day</strong> and <strong>7-day</strong> activation = users with first message within 1/7 days divided by signups.</p>
                <p><strong>Median time to first message</strong> in hours among those who sent a first message.</p>
              </div>
            </HelpPopover>
          </span>
        </CardTitle>
        <DateRangePicker paramKey="act" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm text-muted-foreground">
          Signups: <span className="font-medium text-foreground">{activation?.signups?.toLocaleString?.() ?? 0}</span>
        </div>

        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-emerald-600 dark:text-emerald-400">1-day activation</span>
          <span className="font-medium">{activationPct1d}% ({activation?.withFirstMsg1d?.toLocaleString?.() ?? 0})</span>
        </div>
        <div className="h-2 w-full rounded bg-primary/15 mb-2" role="progressbar" aria-label="1-day activation" aria-valuenow={activationPct1d} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-l bg-emerald-500" style={{ width: `${activationPct1d}%` }} />
        </div>

        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-sky-600 dark:text-sky-400">7-day activation</span>
          <span className="font-medium">{activationPct7d}% ({activation?.withFirstMsg7d?.toLocaleString?.() ?? 0})</span>
        </div>
        <div className="h-2 w-full rounded bg-primary/15 mb-2" role="progressbar" aria-label="7-day activation" aria-valuenow={activationPct7d} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-l bg-sky-500" style={{ width: `${activationPct7d}%` }} />
        </div>

        <div className="text-sm text-muted-foreground">
          Median time to first msg: <span className="font-medium text-foreground">{typeof medianHours === 'number' ? `${medianHours.toFixed(1)}h` : '—'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

async function MessagesPerChannelCard({ range }: { range: TimePreset | DateRange }) {
  const msgsPerChannel = await cachedGetMessagesPerChannel(range)
  const mpcTotal = (msgsPerChannel as Array<{ count: number }>).reduce((acc, r) => acc + (r.count || 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Messages per Channel
            <HelpPopover text="Distribution of total messages by channel in the selected period." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="mpc" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        {msgsPerChannel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="space-y-3">
            {(msgsPerChannel as MessagesPerChannel[]).map((r) => {
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
  )
}

async function TotalMessagesSimpleCard({ range }: { range: TimePreset | DateRange }) {
  const totalMsgs = await cachedGetMessagesCount(range)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            Total Messages
            <HelpPopover text="Count of messages sent across all channels in the selected period." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="msg" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalMsgs.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}

async function UsersPerChannelCard({ range }: { range: TimePreset | DateRange | 'lifetime' }) {
  const usersPerChannel =
    range === 'lifetime'
      ? await cachedGetUsersPerChannel('lifetime')
      : await cachedGetUsersPerChannel(range)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">
            <span className="inline-flex items-center gap-1">
              Users per Channel
              <HelpPopover text="Distinct verified users per channel. Defaults to lifetime unless a timeframe is selected." />
            </span>
          </CardTitle>
          <CardDescription>Lifetime by default; toggle timeframe if needed</CardDescription>
        </div>
        <DateRangePicker paramKey="upc" defaultPreset="lifetime" compact />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {usersPerChannel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            (usersPerChannel as UsersPerChannel[]).map((u) => (
              <div key={u.channel_id} className="flex items-center justify-between rounded border p-3">
                <span className="text-sm capitalize">{u.channel_id}</span>
                <span className="font-semibold">{u.users.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

async function NewUsersTrendChart({ range, intervalHours }: { range: TimePreset | DateRange; intervalHours: number }) {
  const buckets = bucketizeByHours(range as DateRange, intervalHours)
  const nuSpark = await Promise.all(buckets.map((r) => cachedGetNewUsersCount(r)))
  const nuSeries = [
    {
      name: 'New Users',
      color: 'var(--primary)',
      data: buckets.map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: nuSpark[i] ?? 0,
      })),
    },
  ]

  return (
    <AreaChart
      title="New Users"
      description="Trend over the selected period (bucketized)"
      series={nuSeries}
      height={200}
    />
  )
}

async function MessagesTrendChart({ range, intervalHours }: { range: TimePreset | DateRange; intervalHours: number }) {
  const buckets = bucketizeByHours(range as DateRange, intervalHours)
  const msgSpark = await Promise.all(buckets.map((r) => cachedGetMessagesCount(r)))
  const msgSeries = [
    {
      name: 'Messages',
      color: 'var(--primary)',
      data: buckets.map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: msgSpark[i] ?? 0,
      })),
    },
  ]

  return (
    <AreaChart
      title="Messages"
      description="Messages over the selected period (bucketized)"
      series={msgSeries}
      height={200}
    />
  )
}

async function WeekdaySeasonalityCard({ range }: { range: TimePreset | DateRange }) {
  const weekdaySeasonality: WSeasonality[] = await cachedGetWeekdaySeasonality(range)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Weekday seasonality</CardTitle>
        <DateRangePicker paramKey="wkd" defaultPreset="7d" inheritFromKey="range" compact />
      </CardHeader>
      <CardContent>
        {weekdaySeasonality && weekdaySeasonality.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(weekdaySeasonality as WSeasonality[]).map((d, idx) => {
              const v = Math.round(d.avgPerDay || 0)
              const max = Math.max(...(weekdaySeasonality as WSeasonality[]).map((x) => x.avgPerDay || 0), 1)
              const width = Math.round(((d.avgPerDay || 0) / max) * 100)
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{d.label}</span>
                    <span className="text-muted-foreground">{v.toLocaleString()} / day</span>
                  </div>
                  <div className="h-2 w-full rounded bg-primary/15">
                    <div className="h-2 rounded bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data</p>
        )}
      </CardContent>
    </Card>
  )
}

async function First24hFunnelCard({ range }: { range: TimePreset | DateRange }) {
  const funnel24h: Funnel24h | undefined = await cachedGetFirst24hFunnel(range)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">24h Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Signups</div>
            <div className="text-2xl font-semibold">{(funnel24h?.signups ?? 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">First msg (24h)</div>
            <div className="text-2xl font-semibold">{(funnel24h?.firstMsg24h ?? 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Two sessions (24h)</div>
            <div className="text-2xl font-semibold">{(funnel24h?.twoSessions24h ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}