"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RANGE_OPTIONS, type RangeKey } from "@/lib/analytics/range"

export function RangeSelector({ current }: { current: RangeKey }) {
  const pathname = usePathname()
  return (
    <div
      className="inline-flex bg-white border border-zinc-200 rounded-full p-1 text-sm shadow-sm"
      role="tablist"
      aria-label="Tarih aralığı"
    >
      {RANGE_OPTIONS.map((o) => {
        const active = current === o.key
        return (
          <Link
            key={o.key}
            href={`${pathname}?range=${o.key}`}
            scroll={false}
            role="tab"
            aria-selected={active}
            className={cn(
              "px-3.5 py-1.5 rounded-full transition-colors min-h-[36px] min-w-[44px] inline-flex items-center justify-center font-medium",
              active
                ? "bg-[#1B6B8A] text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-50"
            )}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
