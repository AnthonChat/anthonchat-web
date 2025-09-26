import "server-only"
import { unstable_cache as nextCache } from "next/cache"
import type { TimePreset, DateRange } from "@/lib/analytics/time"
import {
  getCohortRetentionHeatmap,
  getRetentionCurvesByCohort,
  type CohortRetentionRow,
  type CohortRetentionCurve,
} from "@/lib/analytics/engagement"
import { DateRangePicker } from "@/components/admin/analytics/DateRangePicker"
import ParamSelect from "@/components/admin/analytics/ParamSelect"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import HelpPopover from "@/components/common/HelpPopover"

const cachedGetCohortRetentionHeatmap = nextCache(
  (range: TimePreset | DateRange, depth: number) => getCohortRetentionHeatmap(range, depth),
  ["CohortsSection_getCohortRetentionHeatmap"],
  { revalidate: 60 }
)

const cachedGetRetentionCurvesByCohort = nextCache(
  (range: TimePreset | DateRange, maxDays: number) => getRetentionCurvesByCohort(range, maxDays),
  ["CohortsSection_getRetentionCurvesByCohort"],
  { revalidate: 60 }
)

export default async function CohortsSection({
  cohR,
  cohortWeeks,
  rcvR,
}: {
  cohR: TimePreset | DateRange
  cohortWeeks: number
  rcvR: TimePreset | DateRange
}) {
  const [cohortHeatmap, retentionCurves] = await Promise.all([
    cachedGetCohortRetentionHeatmap(cohR, cohortWeeks),
    cachedGetRetentionCurvesByCohort(rcvR, 30),
  ])

  return (
    <>
      <h2 className="mt-8 mb-2 text-lg font-semibold flex items-center gap-2">
        Retention & Cohorts
        <HelpPopover>
          <div className="p-1">
            <p className="mb-1">Weekly signup cohorts (Mon-start, UTC). Heatmap shows retention in weeks 0..N.</p>
            <p className="mb-1">Curves are cumulative-by-day (survival-like) up to day 30.</p>
          </div>
        </HelpPopover>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cohort retention heatmap */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Cohort retention heatmap</CardTitle>
            <div className="flex items-center gap-2">
              <ParamSelect
                paramKey="cohort_weeks"
                label="Weeks"
                options={[
                  { value: "2", label: "2" },
                  { value: "4", label: "4" },
                  { value: "6", label: "6" },
                  { value: "8", label: "8" },
                  { value: "10", label: "10" },
                  { value: "12", label: "12" },
                ]}
                compact
              />
              <DateRangePicker paramKey="coh" defaultPreset="30d" inheritFromKey="range" compact />
            </div>
          </CardHeader>
          <CardContent>
            {cohortHeatmap && cohortHeatmap.length ? (
              <div className="space-y-2">
                {(cohortHeatmap as CohortRetentionRow[]).map((row: CohortRetentionRow) => (
                  <div key={row.cohortStart} className="flex items-center gap-2">
                    <div className="w-36 shrink-0 text-xs text-muted-foreground">
                      {new Date(row.cohortStart).toLocaleDateString()} • {row.size.toLocaleString()}
                    </div>
                    <div className="grid grid-flow-col auto-cols-[18px] gap-1">
                      {row.weeks.map((w) => {
                        const rate = w.rate || 0
                        const pct = Math.round(rate * 100)
                        return (
                          <div
                            key={w.week}
                            className="h-4 w-[18px] rounded"
                            title={`Week ${w.week}: ${pct}%`}
                            style={{
                              background: "hsl(var(--primary))",
                              opacity: Math.max(0.08, rate),
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Retention curves summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Day 0/1/7/30 retention</CardTitle>
            <DateRangePicker paramKey="rcv" defaultPreset="30d" inheritFromKey="range" compact />
          </CardHeader>
          <CardContent>
            {retentionCurves && retentionCurves.length ? (
              <div className="space-y-4">
                {/* Latest cohort KPIs */}
                {(retentionCurves as CohortRetentionCurve[]).slice(0, 1).map((c: CohortRetentionCurve) => {
                  const d0 = Math.round(100 * (c.points.find((p) => p.day === 0)?.rate || 0))
                  const d1 = Math.round(100 * (c.points.find((p) => p.day === 1)?.rate || 0))
                  const d7 = Math.round(100 * (c.points.find((p) => p.day === 7)?.rate || 0))
                  const d30 = Math.round(100 * (c.points.find((p) => p.day === 30)?.rate || 0))

                  return (
                    <div key={c.cohortStart} className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Latest cohort: {new Date(c.cohortStart).toLocaleDateString()}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <KPI
                          label="Day 0 Retention"
                          value={d0}
                          format="percentage"
                          thresholds={{ good: 90, warning: 70 }}
                        />
                        <KPI
                          label="Day 1 Retention"
                          value={d1}
                          format="percentage"
                          thresholds={{ good: 60, warning: 40 }}
                        />
                        <KPI
                          label="Day 7 Retention"
                          value={d7}
                          format="percentage"
                          thresholds={{ good: 30, warning: 20 }}
                        />
                        <KPI
                          label="Day 30 Retention"
                          value={d30}
                          format="percentage"
                          thresholds={{ good: 15, warning: 10 }}
                        />
                      </div>
                    </div>
                  )
                })}

                {/* Historical table for comparison */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Historical Comparison</div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <div>Cohort</div>
                      <div>D0</div>
                      <div>D1</div>
                      <div>D7</div>
                      <div>D30</div>
                    </div>
                    {(retentionCurves as CohortRetentionCurve[]).slice(0, 5).map((c: CohortRetentionCurve) => {
                      const pick = (day: number) =>
                        Math.round(100 * (c.points.find((p) => p.day === day)?.rate || 0))
                      return (
                        <div key={c.cohortStart} className="grid grid-cols-5 gap-2 text-sm">
                          <div className="text-muted-foreground truncate">
                            {new Date(c.cohortStart).toLocaleDateString()}
                          </div>
                          <div>{pick(0)}%</div>
                          <div>{pick(1)}%</div>
                          <div>{pick(7)}%</div>
                          <div>{pick(30)}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
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