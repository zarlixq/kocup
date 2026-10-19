"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { ProgramItem } from "@/components/program/weekly-program-board"
import { toggleProgramItemDone } from "@/app/ogrenci/program/actions"

// Bugünün program blokları — tamamlandı işaretleme (koç kaleminde de izinli).
export function TodayProgram({ items }: { items: ProgramItem[] }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (cur, next: { id: string; done: boolean }) =>
    cur.map((i) => (i.id === next.id ? { ...i, is_completed: next.done } : i)),
  )
  const [, start] = useTransition()

  function toggle(id: string, done: boolean) {
    start(async () => {
      setOptimistic({ id, done })
      const res = await toggleProgramItemDone(id, done)
      if (!res.success) toast.error(res.error ?? "İşaretlenemedi.")
    })
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {optimistic.map((i) => {
        const title = i.baslik || i.topic_name || i.subject?.name || "Çalışma bloğu"
        const sub = [i.subject?.name, i.baslik ? i.topic_name : null, i.hedef_soru ? `${i.hedef_soru} soru` : null]
          .filter(Boolean)
          .join(" · ")
        return (
          <li key={i.id} className="flex items-center gap-3 py-2.5">
            <Checkbox
              checked={i.is_completed}
              onCheckedChange={(v) => toggle(i.id, v === true)}
              aria-label={`${title} tamamlandı`}
              className="h-5 w-5"
            />
            <div className="w-12 shrink-0 text-xs text-zinc-500 tabular-nums">{i.start_time ?? "—"}</div>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm", i.is_completed ? "text-zinc-400 line-through" : "text-zinc-900")}>{title}</div>
              {sub && <div className="truncate text-xs text-zinc-500">{sub}</div>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
