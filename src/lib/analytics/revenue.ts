import { createServiceRoleClient } from "@/lib/db/server";
import { resolvePresetOrRange, type TimePreset, type DateRange } from "./time";

type Currency = string

export interface AmountByCurrency {
  currency: Currency
  amount: number
}

export async function getEarningsByCurrency(preset: TimePreset | DateRange = '30d'): Promise<AmountByCurrency[]> {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)

  let q = supabase
    .schema('stripe')
    .from('invoices')
    .select('amount_paid, currency, status, created')
    .eq('status', 'paid')

  if (range.start) q = q.gte('created', Math.floor(new Date(range.start).getTime() / 1000))
  if (range.end) q = q.lt('created', Math.floor(new Date(range.end).getTime() / 1000))

  const { data, error } = await q
  if (error) throw error

  const totals: Record<Currency, number> = {}
  for (const inv of data ?? []) {
    const curr = inv.currency as Currency | null
    const amt = inv.amount_paid as number | null
    if (!curr || !amt) continue
    totals[curr] = (totals[curr] ?? 0) + amt
  }
  return Object.entries(totals).map(([currency, amount]) => ({ currency, amount }))
}

export async function getTrialRenewalsCount(preset: TimePreset | DateRange = '30d') {
  // Option B: count subscriptions whose FIRST paid invoice after trial_end occurs within the timeframe
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  const rangeStartUnix = range.start ? Math.floor(new Date(range.start).getTime() / 1000) : null
  const rangeEndUnix = range.end ? Math.floor(new Date(range.end).getTime() / 1000) : null

  // Get all subscriptions with a trial_end
  const { data: subs, error: subsError } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('id, customer, trial_end')
    .not('trial_end', 'is', null)

  if (subsError) throw subsError
  if (!subs || subs.length === 0) return 0

  // Fetch all paid invoices for those subscriptions after their trial_end
  const subIds = subs.map(s => s.id as string)
  const { data: invoices, error: invError } = await supabase
    .schema('stripe')
    .from('invoices')
    .select('subscription, status, created')
    .eq('status', 'paid')
    .in('subscription', subIds)

  if (invError) throw invError

  // Compute first paid invoice after trial_end per subscription
  const firstPaidAfterTrial: Record<string, number> = {}
  const trialEndBySub: Record<string, number> = {}
  for (const s of subs) {
    const sid = s.id as string
    const te = s.trial_end as number | null
    if (te) trialEndBySub[sid] = te
  }

  for (const inv of invoices ?? []) {
    const sid = inv.subscription as string | null
    const created = inv.created as number | null
    if (!sid || !created) continue
    const trialEnd = trialEndBySub[sid]
    if (!trialEnd) continue
    if (created <= trialEnd) continue // only after trial end
    const currentMin = firstPaidAfterTrial[sid]
    if (currentMin === undefined || created < currentMin) {
      firstPaidAfterTrial[sid] = created
    }
  }

  // Count those whose first paid invoice after trial falls within the timeframe
  let count = 0
  for (const sid of Object.keys(firstPaidAfterTrial)) {
    const ts = firstPaidAfterTrial[sid]
    if ((rangeStartUnix === null || ts >= rangeStartUnix) && (rangeEndUnix === null || ts < rangeEndUnix)) {
      count++
    }
  }
  return count
}

export async function getChurnRate(preset: TimePreset | DateRange = 'this_month') {
  const supabase = createServiceRoleClient()
  const range = resolvePresetOrRange(preset)
  if (!range.start || !range.end) {
    throw new Error('Churn rate requires a bounded timeframe')
  }

  const startUnix = Math.floor(new Date(range.start).getTime() / 1000)
  const endUnix = Math.floor(new Date(range.end).getTime() / 1000)

  // Numerator: customers who canceled in period
  const { data: canceled, error: canceledError } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('customer, canceled_at, ended_at')
    .or(`and(canceled_at.gte.${startUnix},canceled_at.lt.${endUnix}),and(ended_at.gte.${startUnix},ended_at.lt.${endUnix})`)

  if (canceledError) throw canceledError
  const canceledCustomers = new Set<string>()
  for (const s of canceled ?? []) {
    const cust = s.customer as string | null
    if (cust) canceledCustomers.add(cust)
  }

  // Denominator: customers with an active subscription at start of period
  const { data: allSubs, error: allSubsError } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('customer, start_date, canceled_at')

  if (allSubsError) throw allSubsError
  const startCustomers = new Set<string>()
  for (const s of allSubs ?? []) {
    const cust = s.customer as string | null
    const start = s.start_date as number | null
    const canceledAt = s.canceled_at as number | null
    if (!cust || !start) continue
    const activeAtStart = start <= startUnix && (!canceledAt || canceledAt > startUnix)
    if (activeAtStart) startCustomers.add(cust)
  }

  const numerator = canceledCustomers.size
  const denominator = startCustomers.size || 1
  const churnPercent = (numerator / denominator) * 100
  return { numerator, denominator, churnPercent }
}

export async function getMRRByCurrency(asOf: Date | null): Promise<AmountByCurrency[]> {
  const supabase = createServiceRoleClient()
  const asOfUnix = asOf ? Math.floor(asOf.getTime() / 1000) : Math.floor(Date.now() / 1000)

  // Subscriptions considered active as of date: start_date <= asOf and (canceled_at is null or > asOf) and status in active-like
  const { data: subs, error: subsError } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('id, status, start_date, canceled_at')

  if (subsError) throw subsError

  const activeSubIds: string[] = []
  for (const s of subs ?? []) {
    const id = s.id as string
    const status = s.status as string | null
    const start = s.start_date as number | null
    const canceledAt = s.canceled_at as number | null
    const active = (!!start && start <= asOfUnix) && (!canceledAt || canceledAt > asOfUnix) && status === 'active'
    if (active) activeSubIds.push(id)
  }
  if (activeSubIds.length === 0) return []

  // Join subscription_items -> prices to compute monthly amount, per currency
  const { data: items, error: itemsError } = await supabase
    .schema('stripe')
    .from('subscription_items')
    .select('subscription, price, quantity')
    .in('subscription', activeSubIds)

  if (itemsError) throw itemsError
  const priceIds = Array.from(new Set((items ?? []).map(i => i.price).filter(Boolean)))
  if (priceIds.length === 0) return []

  const { data: prices, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('id, currency, unit_amount, recurring')
    .in('id', priceIds as string[])

  if (pricesError) throw pricesError
  type PriceRow = {
    id: string
    currency: string | null
    unit_amount: number | null
    recurring: { interval?: string; interval_count?: number } | null
  }
  const priceMap = new Map<string, PriceRow>()
  for (const p of prices ?? []) priceMap.set(p.id as string, p as PriceRow)

  const totals: Record<Currency, number> = {}
  for (const it of items ?? []) {
    const pid = it.price as string
    const qty = it.quantity as number | null
    const p = priceMap.get(pid)
    if (!p) continue
    const unit = p.unit_amount as number | null
    const currency = p.currency as string | null
    const recurring = p.recurring as { interval?: string; interval_count?: number } | null
    if (!unit || !currency || !recurring) continue
    const interval = recurring.interval || 'month'
    const intervalCount = recurring.interval_count || 1
    // Normalize to monthly amount; Stripe integers are in minor units (e.g., cents)
    const monthly = normalizeToMonthly(unit * (qty || 1), interval, intervalCount)
    totals[currency] = (totals[currency] ?? 0) + monthly
  }
  return Object.entries(totals).map(([currency, amount]) => ({ currency, amount }))
}

function normalizeToMonthly(amountMinor: number, interval: string, count: number): number {
  switch (interval) {
    case 'month':
      return amountMinor / Math.max(1, count)
    case 'year':
      return amountMinor / (12 * Math.max(1, count))
    case 'week':
      return (amountMinor * (52 / 12)) / Math.max(1, count)
    case 'day':
      return (amountMinor * (365 / 12)) / Math.max(1, count)
    default:
      return amountMinor // fallback
  }
}
