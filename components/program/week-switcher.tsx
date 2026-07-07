"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { addWeeks, formatWeekRange, getWeekStart } from "@/lib/week"

export function WeekSwitcher({
  baseHref,
  weekStart,
}: {
  baseHref: string
  weekStart: string
}) {
  const prev = addWeeks(weekStart, -1)
  const next = addWeeks(weekStart, 1)
  const thisWeek = getWeekStart()
  const isThisWeek = weekStart === thisWeek

  const hrefFor = (ws: string) => `${baseHref}?hafta=${ws}`

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={hrefFor(prev)}
        className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
        aria-label="Önceki hafta"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <div className="min-w-[168px] text-center">
        <div className="text-sm font-semibold text-zinc-900 tabular-nums">
          {formatWeekRange(weekStart)}
        </div>
        {!isThisWeek && (
          <Link href={hrefFor(thisWeek)} className="text-xs text-[#1B6B8A] hover:underline">
            Bu haftaya dön
          </Link>
        )}
        {isThisWeek && <div className="text-xs text-[#F97316] font-medium">Bu hafta</div>}
      </div>

      <Link
        href={hrefFor(next)}
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
        )}
        aria-label="Sonraki hafta"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
