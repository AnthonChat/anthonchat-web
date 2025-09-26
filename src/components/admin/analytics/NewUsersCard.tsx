import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from '@/components/admin/analytics/DateRangePicker'
import HelpPopover from '@/components/common/HelpPopover'
import AreaChart from '@/components/admin/analytics/AreaChart'
import { getNewUsersCount } from '@/lib/analytics/engagement'
import { unstable_cache as nextCache } from 'next/cache'
import type { DateRange, TimePreset } from '@/lib/analytics/time'

// Create cached version within this component
const cachedGetNewUsersCount = nextCache(
  (range: TimePreset | DateRange) => getNewUsersCount(range),
  ['getNewUsersCount'],
  { revalidate: 60 }
)

// Helper function for bucketizing (copied from main page)
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

interface NewUsersCardProps {
  range: DateRange | TimePreset
  intervalHours: number
}

async function NewUsersCardContent({ range, intervalHours }: NewUsersCardProps) {
  const newUsers = await cachedGetNewUsersCount(range)

  // Sparkline data
  const nuSpark = await Promise.all(
    bucketizeByHours(range, intervalHours).map((r) => cachedGetNewUsersCount(r))
  )

  const nuSeries = [
    {
      name: "New Users",
      color: "var(--primary)",
      data: bucketizeByHours(range, intervalHours).map((r, i) => ({
        date: r.start ?? r.end ?? new Date().toISOString(),
        value: nuSpark[i] ?? 0,
      })),
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-1">
            New Users
            <HelpPopover text="Distinct accounts created in the selected period." />
          </span>
        </CardTitle>
        <DateRangePicker paramKey="nu" defaultPreset="7d" inheritFromKey="range" showIntervalOptions compact />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{newUsers.toLocaleString()}</div>
        <div className="mt-2 h-12">
          <AreaChart compact series={nuSeries} height={48} className="h-12" />
        </div>
      </CardContent>
    </Card>
  )
}

export function NewUsersCard(props: NewUsersCardProps) {
  return <NewUsersCardContent {...props} />
}