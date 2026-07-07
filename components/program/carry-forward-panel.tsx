"use client"

import { useState, useTransition } from "react"
import { History, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DAYS } from "@/lib/days"
import { carryForwardItems } from "@/app/koc/ogrenciler/[id]/program/weekly-actions"
import type { ProgramItem } from "@/components/program/weekly-program-board"

function dayLabel(n: number) {
  return DAYS.find((d) => d.num === n)?.label ?? "—"
}

function titleOf(item: ProgramItem): string {
  if (item.subject?.name && item.baslik) return `${item.subject.name} · ${item.baslik}`
  return item.subject?.name ?? item.baslik ?? "—"
}

export function CarryForwardPanel({
  studentId,
  weekStart,
  items,
}: {
  studentId: string
  weekStart: string
  items: ProgramItem[]
}) {
  const [pending, startTransition] = useTransition()
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  if (items.length === 0) return null

  const remaining = items.filter((i) => !addedIds.has(i.id))
  if (remaining.length === 0) return null

  function addItems(ids: string[]) {
    startTransition(async () => {
      const res = await carryForwardItems(studentId, weekStart, ids)
      if (res.success) {
        setAddedIds((prev) => {
          const next = new Set(prev)
          for (const id of ids) next.add(id)
          return next
        })
        toast.success(
          ids.length > 1 ? "Kalemler bu haftaya eklendi." : "Kalem bu haftaya eklendi.",
        )
      } else {
        toast.error(res.error ?? "Eklenemedi.")
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5 p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#F97316]" />
          <h2 className="font-semibold text-zinc-900">
            Geçen haftadan tamamlanmayanlar
          </h2>
          <span className="text-xs font-semibold text-[#F97316] bg-[#F97316]/10 rounded-full px-2 py-0.5">
            {remaining.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() => addItems(remaining.map((i) => i.id))}
        >
          <Plus className="h-3.5 w-3.5" /> Tümünü Bu Haftaya Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {remaining.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg bg-white border border-zinc-200 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                {dayLabel(item.day_of_week)}
              </div>
              <div className="text-sm font-medium text-zinc-900 truncate">
                {titleOf(item)}
              </div>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => addItems([item.id])}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-[#F97316]/40 text-[#F97316] text-xs font-medium px-2 py-1 hover:bg-[#F97316]/10 disabled:opacity-50",
              )}
            >
              <Plus className="h-3 w-3" /> Ekle
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
