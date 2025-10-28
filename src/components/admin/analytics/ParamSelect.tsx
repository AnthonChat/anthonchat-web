"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

export default function ParamSelect({
  paramKey,
  options,
  label,
  defaultValue,
  className,
  compact = true,
}: {
  paramKey: string
  options: Option[]
  label?: string
  defaultValue?: string
  className?: string
  compact?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams?.get(paramKey) as string) ?? defaultValue ?? options[0]?.value ?? ""

  const update = (v: string | null) => {
    const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []))
    if (v === null) sp.delete(paramKey)
    else sp.set(paramKey, v)
    router.replace("?" + sp.toString())
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label ? (
        <label className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>{label}</label>
      ) : null}
      <select
        value={current}
        onChange={(e) => update(e.target.value || null)}
        className={cn(
          "rounded border px-2",
          compact ? "h-7 text-[11px]" : "h-8 text-sm"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}