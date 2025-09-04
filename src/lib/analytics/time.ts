export type TimePreset = "7d" | "30d" | "this_month" | "lifetime";

export interface DateRange {
  start: string | null;
  end: string | null;
}

function toISO(date: Date): string {
  return new Date(date.getTime()).toISOString();
}

export function resolveRange(preset: TimePreset, now = new Date()): DateRange {
  const end = toISO(now);
  const d = new Date(now.getTime());

  switch (preset) {
    case "7d": {
      d.setDate(d.getDate() - 7);
      return { start: toISO(d), end };
    }
    case "30d": {
      d.setDate(d.getDate() - 30);
      return { start: toISO(d), end };
    }
    case "this_month": {
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      return { start: toISO(startOfMonth), end };
    }
    case "lifetime":
    default:
      return { start: null, end };
  }
}

export function resolvePresetOrRange(
  presetOrRange: TimePreset | DateRange,
  now = new Date()
): DateRange {
  if (typeof presetOrRange === "string")
    return resolveRange(presetOrRange, now);
  const start = presetOrRange.start ?? null;
  const end = presetOrRange.end ?? now.toISOString();
  return { start, end };
}

export function parseDateOnlyToIsoStart(d: string): string | null {
  if (!d) return null;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(d);
  if (!m) return null;
  return new Date(d + "T00:00:00.000Z").toISOString();
}

export function parseDateOnlyToIsoEndExclusive(d: string): string | null {
  const startIso = parseDateOnlyToIsoStart(d);
  if (!startIso) return null;
  const t = new Date(startIso).getTime() + 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function coerceRangeFromSearchParams(
  sp: SearchParams,
  key: string,
  defaultPreset: TimePreset
): { range: DateRange; preset: string } {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const preset = (get(key) as string | undefined) || defaultPreset;
  const startParam = get(`${key}_start`) as string | undefined;
  const endParam = get(`${key}_end`) as string | undefined;

  if (startParam || endParam) {
    // If only one bound present, ignore and fall back to preset
    if (!startParam || !endParam) {
      return { range: resolveRange(preset as TimePreset), preset };
    }
    return { range: { start: startParam, end: endParam }, preset: "custom" };
  }
  return { range: resolveRange(preset as TimePreset), preset };
}

// Define a type for Supabase query builders that have gte and lt methods
interface SupabaseQueryBuilder<T = unknown> {
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
}

export function rangeFilter<T extends SupabaseQueryBuilder<T>>(
  q: T,
  column: string,
  range: DateRange
): T {
  if (range.start) q = q.gte(column, range.start);
  if (range.end) q = q.lt(column, range.end);
  return q;
}
