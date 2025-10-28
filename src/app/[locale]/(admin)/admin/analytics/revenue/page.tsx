import { DateRangePicker } from '@/components/admin/analytics/DateRangePicker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getChurnRate, getEarningsByCurrency, getMRRByCurrency, getTrialRenewalsCount, type AmountByCurrency } from '@/lib/analytics/revenue'
import { coerceRangeFromSearchParams, type SearchParams as SP } from '@/lib/analytics/time'
import type { DateRange } from '@/lib/analytics/time'
import AreaChart from '@/components/admin/analytics/AreaChart'


// Helpers for range inheritance + bucketization
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

function bucketize(range: DateRange, parts = 8): DateRange[] {
  const { start, end } = ensureBoundedRange(range)
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const total = Math.max(1, e - s)
  const step = Math.floor(total / parts)
  const buckets: DateRange[] = []
  for (let i = 0; i < parts; i++) {
    const a = new Date(s + i * step).toISOString()
    const b = new Date(i === parts - 1 ? e : s + (i + 1) * step).toISOString()
    buckets.push({ start: a, end: b })
  }
  return buckets
}

// Stripe zero-decimal currencies (major = minor)
const ZERO_DECIMAL = new Set([
  'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'
])

function formatCurrency(currency: string, amountMinor: number) {
  const isZero = ZERO_DECIMAL.has(currency.toUpperCase())
  const major = isZero ? amountMinor : amountMinor / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major)
  } catch {
    return `${currency.toUpperCase()} ${major.toLocaleString()}`
  }
}

function sumMinor(amounts: AmountByCurrency[]): number {
  return amounts.reduce((acc, a) => acc + (a.amount || 0), 0)
}

function parseAsOfDateRange(range: { start: string | null; end: string | null }): Date | null {
  if (!range.end) return new Date()
  return new Date(range.end)
}

export default async function RevenueAnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  // Unified page-level range (defaults to last 30 days for revenue)
  const baseR = coerceRangeFromSearchParams(sp, 'range', '30d').range

  const getFirst = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const hasOverride = (key: string) => {
    const v = getFirst(sp[key])
    const s = getFirst(sp[`${key}_start`])
    const e = getFirst(sp[`${key}_end`])
    return Boolean(v || s || e)
  }
  const rangeFor = (key: string, def: '7d' | '30d' | 'this_month' | 'lifetime') => {
    if (hasOverride(key)) return coerceRangeFromSearchParams(sp, key, def).range
    return baseR
  }

  // Effective ranges with inheritance (and special handling for churn which requires bounded start+end)
  const earnR = rangeFor('earn', '30d')
  const renR = rangeFor('ren', '30d')

  // Churn must be bounded. If baseR has no start (e.g., 'lifetime'), fall back to 'this_month' unless overridden.
  const churnR = (() => {
    if (hasOverride('churn')) return coerceRangeFromSearchParams(sp, 'churn', 'this_month').range
    if (baseR.start && baseR.end) return baseR
    return coerceRangeFromSearchParams(sp, 'churn', 'this_month').range
  })()

  // MRR is "as of" a date; we still let it inherit the page range when bounded, otherwise lifetime by default.
  const mrrR = (() => {
    if (hasOverride('mrr')) return coerceRangeFromSearchParams(sp, 'mrr', 'lifetime').range
    return baseR
  })()

  const [earnings, renewals, churn, mrr] = await Promise.all([
    getEarningsByCurrency(earnR),
    getTrialRenewalsCount(renR),
    getChurnRate(churnR),
    getMRRByCurrency(parseAsOfDateRange(mrrR)),
  ])

  // Sparklines (currency-less metrics only to avoid FX ambiguity)
  const [renSpark, churnSpark] = await Promise.all([
    Promise.all(bucketize(renR).map(r => getTrialRenewalsCount(r))),
    Promise.all(bucketize(churnR).map(async r => (await getChurnRate(r)).churnPercent)),
  ])

  // Optional MRR sparkline (sum of minor units across currencies, indicative only)
  const mrrSpark = await Promise.all(
    bucketize(mrrR).map(async r => sumMinor(await getMRRByCurrency(parseAsOfDateRange(r))))
  )

  // Prepare series for area charts (bucketized)
  const renSeries = [
    {
      name: "Trial Renewals",
      color: "var(--primary)",
      data: bucketize(renR).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: renSpark[i] ?? 0,
      })),
    },
  ]

  const churnSeries = [
    {
      name: "Churn",
      color: "var(--primary)",
      data: bucketize(churnR).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: churnSpark[i] ?? 0,
      })),
    },
  ]

  const mrrSeries = [
    {
      name: "MRR",
      color: "var(--primary)",
      data: bucketize(mrrR).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: mrrSpark[i] ?? 0,
      })),
    },
  ]

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Revenue Analytics</h1>
        <DateRangePicker paramKey="range" defaultPreset="30d" />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Earnings</CardTitle>
              <CardDescription>Sum of paid invoices</CardDescription>
            </div>
            <DateRangePicker paramKey="earn" defaultPreset="30d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid invoices</p>
            ) : (
              <div className="space-y-1">
                {earnings.map(e => (
                  <div key={e.currency} className="flex items-center justify-between text-sm">
                    <span className="uppercase text-muted-foreground">{e.currency}</span>
                    <span className="font-semibold">{formatCurrency(e.currency, e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Trial Renewals</CardTitle>
              <CardDescription>First paid invoice after trial end</CardDescription>
            </div>
            <DateRangePicker paramKey="ren" defaultPreset="30d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{renewals.toLocaleString()}</div>
            <div className="mt-2 h-12">
              <AreaChart compact series={renSeries} height={48} className="h-12" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Churn Rate</CardTitle>
              <CardDescription>Customers canceled in period / start customers</CardDescription>
            </div>
            {/* No inheritance from page-level when base is lifetime to avoid invalid range */}
            <DateRangePicker paramKey="churn" defaultPreset="this_month" allowAllTime={false} compact />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{churn.churnPercent.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {churn.numerator.toLocaleString()} canceled / {churn.denominator.toLocaleString()} start
            </p>
            <div className="mt-2 h-12">
              <AreaChart compact series={churnSeries} height={48} className="h-12" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">MRR</CardTitle>
              <CardDescription>Active subscriptions as of date</CardDescription>
            </div>
            <DateRangePicker paramKey="mrr" defaultPreset="lifetime" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            {mrr.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active subscriptions</p>
            ) : (
              <>
                <div className="space-y-1">
                  {mrr.map(e => (
                    <div key={e.currency} className="flex items-center justify-between text-sm">
                      <span className="uppercase text-muted-foreground">{e.currency}</span>
                      <span className="font-semibold">{formatCurrency(e.currency, e.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-12">
                  <AreaChart compact series={mrrSeries} height={48} className="h-12" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Area charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AreaChart
          title="Trial Renewals"
          description="Trial renewals over time"
          series={renSeries}
          height={200}
        />
        <AreaChart
          title="Churn Rate"
          description="Churn percent over time"
          series={churnSeries}
          height={200}
        />
        <AreaChart
          title="MRR (indicative)"
          description="Sum of MRR across currencies (minor units)"
          series={mrrSeries}
          height={200}
        />
      </div>
    </div>
  )
}