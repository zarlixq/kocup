"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Target, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  deriveAssignmentStatus,
  progressBarColor,
  progressPercent,
  ASSIGNMENT_STATUS_TONE,
  ASSIGNMENT_STATUS_LABEL,
  type AssignmentStatus,
} from "@/lib/assignments/constants"
import { LogProgressDialog } from "@/components/konu-analizi/log-progress-dialog"

type TaskItem = {
  id: string
  topic_name: string
  subject_name: string
  hedef_soru: number
  son_tarih: string
  status: AssignmentStatus
  cozulen_soru: number
}

function endOfWeek() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysUntilSunday)
  r.setHours(23, 59, 59, 999)
  return r
}

export function WeeklyTasksCard({ tasks }: { tasks: TaskItem[] }) {
  const [logId, setLogId] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const weekEnd = useMemo(() => endOfWeek(), [])

  // Filter: aktif + (son_tarih bu hafta sonuna kadar VEYA gecikti)
  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status !== "aktif") return false
        if (t.cozulen_soru >= t.hedef_soru) return false
        const son = new Date(t.son_tarih)
        son.setHours(23, 59, 59, 999)
        return son <= weekEnd
      })
      .sort((a, b) => a.son_tarih.localeCompare(b.son_tarih))
      .slice(0, 5)
  }, [tasks, weekEnd])

  const selected = logId ? tasks.find((t) => t.id === logId) ?? null : null

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#F97316]" /> Bu Hafta Görevlerin
          {filtered.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#F97316] text-white text-[11px] font-semibold">
              {filtered.length}
            </span>
          )}
        </h3>
        <Link
          href="/ogrenci/konularim"
          className="text-xs text-[#1B6B8A] hover:underline"
        >
          Tümü →
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-zinc-500 text-center py-4">
          Bu haftaya ait aktif atama yok 🎉
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const derived = deriveAssignmentStatus(t.status, t.cozulen_soru, t.hedef_soru, t.son_tarih, today)
            const pct = progressPercent(t.cozulen_soru, t.hedef_soru)
            const tone = ASSIGNMENT_STATUS_TONE[derived]
            const barColor = progressBarColor(derived, pct)
            return (
              <li
                key={t.id}
                className={`border rounded-xl p-3 ${tone.border} ${tone.bg}`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                      {t.subject_name}
                    </div>
                    <div className={`text-sm font-medium ${tone.text} truncate`}>
                      {t.topic_name}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full bg-white/70 ${tone.text} shrink-0`}>
                    {ASSIGNMENT_STATUS_LABEL[derived]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden border border-zinc-100">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] tabular-nums text-zinc-600 whitespace-nowrap">
                    {t.cozulen_soru}/{t.hedef_soru}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600">
                    Son tarih:{" "}
                    <span className="font-medium tabular-nums">
                      {new Date(t.son_tarih).toLocaleDateString("tr-TR")}
                    </span>
                  </span>
                  <Button size="sm" variant="accent" onClick={() => setLogId(t.id)} className="h-7 px-2">
                    <Plus className="h-3 w-3" /> Kayıt
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <LogProgressDialog
          open
          onOpenChange={(o) => !o && setLogId(null)}
          assignment={{
            id: selected.id,
            topic_name: selected.topic_name,
            subject_name: selected.subject_name,
          }}
        />
      )}
    </div>
  )
}
