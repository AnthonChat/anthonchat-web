import { unstable_cache as nextCache } from "next/cache"
import AreaChart from "@/components/admin/analytics/AreaChart"
import HelpPopover from "@/components/common/HelpPopover"
import type { TimePreset, DateRange } from "@/lib/analytics/time"
import {
  getStickinessOverTime,
  getNewReturningOverTimeOptimized,
  getEngagementVelocity,
  getReactivationRate,
  getSessionizationMetrics,
} from "@/lib/analytics/engagement"

type TPoint = { date: string; value: number }
type NVRBucketPoint = { date: string; newActive: number; returningActive: number; totalActive: number }
type ReactivationPoint = { date: string; reactivated: number; active: number; rate: number }

const cachedGetStickinessOverTime = nextCache(
  (range: TimePreset | DateRange, bucketHours: number) => getStickinessOverTime(range, bucketHours),
  ["MoreTrendsSection_getStickinessOverTime"],
  { revalidate: 60 }
)

const cachedGetNewReturningOverTime = nextCache(
  (range: TimePreset | DateRange, bucketHours: number) => getNewReturningOverTimeOptimized(range, bucketHours),
  ["MoreTrendsSection_getNewReturningOverTimeOptimized"],
  { revalidate: 60 }
)

const cachedGetEngagementVelocity = nextCache(
  (range: TimePreset | DateRange, bucketHours: number) => getEngagementVelocity(range, bucketHours),
  ["MoreTrendsSection_getEngagementVelocity"],
  { revalidate: 60 }
)

const cachedGetReactivationRate = nextCache(
  (range: TimePreset | DateRange, bucketHours: number) => getReactivationRate(range, bucketHours),
  ["MoreTrendsSection_getReactivationRate"],
  { revalidate: 60 }
)

const cachedGetSessionizationMetrics = nextCache(
  (range: TimePreset | DateRange, bucketHours: number) => getSessionizationMetrics(range, bucketHours),
  ["MoreTrendsSection_getSessionizationMetrics"],
  { revalidate: 60 }
)

export default async function MoreTrendsSection({
  bucketHours,
  dwmR,
  nvrR,
  msgR,
  baseR,
}: {
  bucketHours: number
  dwmR: TimePreset | DateRange
  nvrR: TimePreset | DateRange
  msgR: TimePreset | DateRange
  baseR: TimePreset | DateRange
}) {
  const [
    stickinessOverTime,
    nvrOverTime,
    velocity,
    reactivation,
    sessionization,
  ] = await Promise.all([
    cachedGetStickinessOverTime(dwmR, bucketHours),
    cachedGetNewReturningOverTime(nvrR, bucketHours),
    cachedGetEngagementVelocity(msgR, bucketHours),
    cachedGetReactivationRate(baseR, bucketHours),
    cachedGetSessionizationMetrics(baseR, bucketHours),
  ])

  const stickinessSeriesFull = [
    {
      name: "Stickiness %",
      color: "var(--primary)",
      data: (stickinessOverTime ?? []).map((p: TPoint) => ({ date: p.date, value: Math.round((p.value || 0) * 100) })),
    },
  ]

  const nvrOverSeries = [
    {
      name: "New Active",
      color: "#10b981",
      data: (nvrOverTime ?? []).map((p: NVRBucketPoint) => ({ date: p.date, value: p.newActive || 0 })),
    },
    {
      name: "Returning Active",
      color: "#0ea5e9",
      data: (nvrOverTime ?? []).map((p: NVRBucketPoint) => ({ date: p.date, value: p.returningActive || 0 })),
    },
  ]

  const velocitySeries = [
    {
      name: "Messages per Active User",
      color: "var(--primary)",
      data: (velocity ?? []).map((p: TPoint) => ({ date: p.date, value: p.value || 0 })),
    },
  ]

  const reactivationRateSeries = [
    {
      name: "Reactivation rate %",
      color: "#a855f7",
      data: (reactivation ?? []).map((p: ReactivationPoint) => ({ date: p.date, value: Math.round((p.rate || 0) * 100) })),
    },
  ]

  const sessionsPerUserSeries = [
    {
      name: "Sessions per user",
      color: "var(--primary)",
      data: (sessionization?.sessionsPerUser ?? []).map((p: TPoint) => ({ date: p.date, value: p.value || 0 })),
    },
  ]

  const avgSessionMinutesSeries = [
    {
      name: "Avg session minutes",
      color: "#f97316",
      data: (sessionization?.avgSessionMinutes ?? []).map((p: TPoint) => ({ date: p.date, value: p.value || 0 })),
    },
  ]

  return (
    <>
      <h2 className="mt-8 mb-2 text-lg font-semibold flex items-center gap-2">
        More Trends
        <HelpPopover>
          <div className="p-1">
            <p className="mb-1">Additional engagement KPIs over time. Uses the global interval for bucketing.</p>
          </div>
        </HelpPopover>
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChart
          title="Stickiness over time"
          description="DAU / MAU as a percentage over the selected period"
          series={stickinessSeriesFull}
          height={200}
        />
        <AreaChart
          title="New vs Returning Active over time"
          description="Bucketized counts of new vs returning active users"
          series={nvrOverSeries}
          height={200}
        />
        <AreaChart
          title="Engagement velocity"
          description="Messages per active user (moving average)"
          series={velocitySeries}
          height={200}
        />
        <AreaChart
          title="Reactivation rate"
          description="Share of active users who were inactive for ≥14 days before the bucket"
          series={reactivationRateSeries}
          height={200}
        />
        <AreaChart
          title="Sessions per user"
          description="Average sessions per active user per bucket (30m idle gap)"
          series={sessionsPerUserSeries}
          height={200}
        />
        <AreaChart
          title="Avg session minutes"
          description="Average session length (minutes) per bucket (30m idle gap)"
          series={avgSessionMinutesSeries}
          height={200}
        />
      </div>
    </>
  )
}