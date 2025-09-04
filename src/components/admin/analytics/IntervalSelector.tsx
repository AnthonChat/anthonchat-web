"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * IntervalSelector — small client component that writes a global `interval`
 * search param (e.g. ?interval=3h). Used in the analytics header.
 */
export function IntervalSelector({
  paramKey = "interval",
  defaultValue = "3h",
  className,
}: {
  paramKey?: string;
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = (searchParams?.get(paramKey) as string) || defaultValue;

  const update = (v: string | null) => {
    const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (v === null) sp.delete(paramKey);
    else sp.set(paramKey, v);
    router.replace("?" + sp.toString());
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label className="text-sm text-muted-foreground">Interval</label>
      <select
        value={current}
        onChange={(e) => update(e.target.value || null)}
        className="h-8 text-sm rounded border px-2"
      >
        <option value="1h">1h</option>
        <option value="3h">3h</option>
        <option value="6h">6h</option>
        <option value="12h">12h</option>
        <option value="24h">24h</option>
      </select>
    </div>
  );
}

export default IntervalSelector;