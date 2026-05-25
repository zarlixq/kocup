"use client"

import { useMemo, useState } from "react"
import { Plus, CheckCircle2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_TONE,
  ASSIGNMENT_STATUS_VARIANT,
  deriveAssignmentStatus,
  progressBarColor,
  progressPercent,
  type AssignmentStatus,
  type DerivedAssignmentStatus,
} from "@/lib/assignments/constants"
import { LogProgressDialog } from "@/components/konu-analizi/log-progress-dialog"
import { toast } from "sonner"
import { markAssignmentDone } from "@/app/ogrenci/konularim/actions"
import { useTransition } from "react"

export type StudentAssignmentRow = {
  id: string
  topic_name: string
  subject_name: string
  hedef_soru: number
  hedef_sure_dk: number | null
  son_tarih: string
  notes: string | null
  status: AssignmentStatus
  cozulen_soru: number
  dogru_sayisi: number
  toplam_sure_dk: number
  coach_name: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

type StatusFilter = "all" | DerivedAssignmentStatus

export function AssignmentsCardGrid({
  rows,
  compact = false,
}: {
  rows: StudentAssignmentRow[]
  compact?: boolean
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [logAsg, setLogAsg] = useState<StudentAssignmentRow | null>(null)
  const [pending, startTransition] = useTransition()

  const today = useMemo(() => new Date(), [])

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const derived = deriveAssignmentStatus(r.status, r.cozulen_soru, r.hedef_soru, r.son_tarih, today)
        const pct = progressPercent(r.cozulen_soru, r.hedef_soru)
        return { ...r, derived, pct }
      }),
    [rows, today],
  )

  const filtered = useMemo(
    () =>
      enriched.filter((r) => {
        if (statusFilter !== "all" && r.derived !== statusFilter) return false
        return true
      }),
    [enriched, statusFilter],
  )

  // Sıralama: gecikti > aktif > tamamlandi > iptal; aynı kategoride yakın deadline önce
  const sorted = useMemo(() => {
    const orderMap: Record<DerivedAssignmentStatus, number> = {
      gecikti: 0,
      aktif: 1,
      tamamlandi: 2,
      iptal: 3,
    }
    return [...filtered].sort((a, b) => {
      const d = orderMap[a.derived] - orderMap[b.derived]
      if (d !== 0) return d
      return a.son_tarih.localeCompare(b.son_tarih)
    })
  }, [filtered])

  function handleMarkDone(id: string) {
    startTransition(async () => {
      const res = await markAssignmentDone(id)
      if (!res.success) return toast.error(res.error ?? "İşaretlenemedi")
      toast.success("✅ Tamamlandı olarak işaretlendi")
    })
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {sorted.map((r) => (
          <AssignmentCard
            key={r.id}
            row={r}
            onLog={() => setLogAsg(r)}
            onMarkDone={() => handleMarkDone(r.id)}
            disabled={pending}
          />
        ))}
        {logAsg && (
          <LogProgressDialog
            open
            onOpenChange={(o) => !o && setLogAsg(null)}
            assignment={{
              id: logAsg.id,
              topic_name: logAsg.topic_name,
              subject_name: logAsg.subject_name,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hepsi</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
            <SelectItem value="gecikti">Gecikti</SelectItem>
            <SelectItem value="iptal">İptal</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">{sorted.length} atama</Badge>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          {enriched.length === 0
            ? "Henüz konu atanmamış 📚 — koçunun atama yapmasını bekle."
            : "Bu filtreyle eşleşen atama yok."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((r) => (
            <AssignmentCard
              key={r.id}
              row={r}
              onLog={() => setLogAsg(r)}
              onMarkDone={() => handleMarkDone(r.id)}
              disabled={pending}
            />
          ))}
        </div>
      )}

      {logAsg && (
        <LogProgressDialog
          open
          onOpenChange={(o) => !o && setLogAsg(null)}
          assignment={{
            id: logAsg.id,
            topic_name: logAsg.topic_name,
            subject_name: logAsg.subject_name,
          }}
        />
      )}
    </div>
  )
}

function AssignmentCard({
  row,
  onLog,
  onMarkDone,
  disabled,
}: {
  row: StudentAssignmentRow & { derived: DerivedAssignmentStatus; pct: number }
  onLog: () => void
  onMarkDone: () => void
  disabled: boolean
}) {
  const tone = ASSIGNMENT_STATUS_TONE[row.derived]
  const barColor = progressBarColor(row.derived, row.pct)
  const isActive = row.derived === "aktif" || row.derived === "gecikti"

  return (
    <div
      className={`border rounded-2xl p-4 space-y-3 ${tone.border} ${tone.bg} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">{row.subject_name}</div>
          <div className={`text-base font-semibold ${tone.text} truncate`}>{row.topic_name}</div>
        </div>
        <Badge variant={ASSIGNMENT_STATUS_VARIANT[row.derived]}>
          {ASSIGNMENT_STATUS_LABEL[row.derived]}
        </Badge>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-zinc-700 mb-1">
          <span className="tabular-nums">
            {row.cozulen_soru} / {row.hedef_soru} soru
          </span>
          <span className="tabular-nums">%{row.pct}</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-100">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${row.pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>Son tarih: <span className="font-medium">{formatDate(row.son_tarih)}</span></span>
        {row.toplam_sure_dk > 0 && (
          <span>Toplam: {row.toplam_sure_dk} dk</span>
        )}
      </div>

      {row.notes && (
        <div className="text-xs text-zinc-600 bg-white/60 rounded-lg p-2 border border-white">
          <span className="font-medium">Not:</span> {row.notes}
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="accent" onClick={onLog} className="flex-1">
            <Plus className="h-4 w-4" /> Çalışma Kaydet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkDone}
            disabled={disabled}
            title="Tamamlandı işaretle"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
