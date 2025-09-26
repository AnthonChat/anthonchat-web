import "server-only"
import { unstable_cache as nextCache } from "next/cache"
import type { TimePreset, DateRange } from "@/lib/analytics/time"
import {
  getMessagesPerUserDistribution,
  getPowerUserConcentration,
  type PowerUserConcentration as PowerShare,
} from "@/lib/analytics/engagement"
import { DateRangePicker } from "@/components/admin/analytics/DateRangePicker"
import ParamSelect from "@/components/admin/analytics/ParamSelect"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import HelpPopover from "@/components/common/HelpPopover"

type DistBin = { from: number; to: number | null; users: number; messages: number }

const cachedGetMessagesPerUserDistribution = nextCache(
  (range: TimePreset | DateRange, opts: { binCount?: number; activeOnlyInRange?: boolean }) =>
    getMessagesPerUserDistribution(range, opts),
  ["DistributionsSection_getMessagesPerUserDistribution"],
  { revalidate: 60 }
)

const cachedGetPowerUserConcentration = nextCache(
  (range: TimePreset | DateRange, opts: { percentiles?: number[]; scope?: "in_range" | "lifetime" }) =>
    getPowerUserConcentration(range, opts),
  ["DistributionsSection_getPowerUserConcentration"],
  { revalidate: 60 }
)

export default async function DistributionsSection({
  distR,
  distBins,
  distActive,
  pucR,
  pucScope,
}: {
  distR: TimePreset | DateRange
  distBins: number
  distActive: boolean
  pucR: TimePreset | DateRange
  pucScope: "in_range" | "lifetime"
}) {
  const [distribution, powerShare] = await Promise.all([
    cachedGetMessagesPerUserDistribution(distR, { binCount: distBins, activeOnlyInRange: distActive }),
    cachedGetPowerUserConcentration(pucR, { percentiles: [0.01, 0.05, 0.1], scope: pucScope }),
  ])

  return (
    <>
      <h2 className="mt-8 mb-2 text-lg font-semibold flex items-center gap-2">
        Distributions
        <HelpPopover>
          <div className="p-1">
            <p className="mb-1">
              <strong>Messages per user</strong>: Quantile bins computed within the selected range.
            </p>
            <p className="mb-1">
              <strong>Power-user concentration</strong>: Share of messages by top 1%, 5%, 10% of users.
            </p>
          </div>
        </HelpPopover>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Messages per user distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-1">
                Messages per user distribution
                <HelpPopover text="Dynamic quantile bins of messages per user among users active in the selected period." />
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <ParamSelect
                paramKey="dist_active"
                label="Active-only"
                options={[
                  { value: "1", label: "Yes" },
                  { value: "0", label: "No" },
                ]}
                compact
              />
              <ParamSelect
                paramKey="dist_bins"
                label="Bins"
                options={[
                  { value: "4", label: "4" },
                  { value: "5", label: "5" },
                  { value: "7", label: "7" },
                  { value: "10", label: "10" },
                  { value: "12", label: "12" },
                ]}
                compact
              />
              <DateRangePicker paramKey="dist" defaultPreset="7d" inheritFromKey="range" compact />
            </div>
          </CardHeader>
          <CardContent>
            {distribution && distribution.bins?.length ? (
              <div className="space-y-2">
                {(distribution.bins as DistBin[]).map((b: DistBin, idx: number) => {
                  const users = b.users || 0
                  const msgs = b.messages || 0
                  const pct = distribution.totalUsers ? Math.round((users / distribution.totalUsers) * 100) : 0
                  const label = b.to === null ? `${b.from}+` : `${b.from}–${b.to}`
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-muted-foreground">
                          {users.toLocaleString()} users • {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded bg-primary/15">
                        <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground">{msgs.toLocaleString()} messages</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Power-user concentration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-1">
                Power-user concentration
                <HelpPopover text="Share of total messages contributed by the top X% of users. Scope can be the selected period or lifetime." />
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <ParamSelect
                paramKey="puc_scope"
                label="Scope"
                options={[
                  { value: "in_range", label: "In-range" },
                  { value: "lifetime", label: "Lifetime" },
                ]}
                compact
              />
              <DateRangePicker paramKey="puc" defaultPreset="7d" inheritFromKey="range" compact />
            </div>
          </CardHeader>
          <CardContent>
            {powerShare && powerShare.length ? (
              <div className="space-y-2">
                {(powerShare as PowerShare[]).map((p: PowerShare) => {
                  const pct = Math.round((p.share || 0) * 100)
                  const label = `Top ${Math.round(p.percentile * 100)}%`
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded bg-primary/15">
                        <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
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
      </div>
    </>
  )
}