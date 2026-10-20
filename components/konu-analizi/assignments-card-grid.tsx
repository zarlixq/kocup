"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, CheckCircle2, Filter, MoreVertical, Pencil, Trash2, Target, Info, BookOpenCheck, ArrowRight } from "lucide-react"
import { toast } from "sonner"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_TONE,
  ASSIGNMENT_STATUS_VARIANT,
  accuracyOf,
  deriveAssignmentStatus,
  goalSummary,
  progressBarColor,
  progressPercent,
  type DerivedAssignmentStatus,
} from "@/lib/assignments/constants"
import type { AssignmentWithProgress } from "@/lib/assignments/load"
import { LogProgressDialog } from "@/components/konu-analizi/log-progress-dialog"
import { GoalDialog, type GoalFormData, type GoalInitial } from "@/components/konu-analizi/goal-dialog"
import { OwnerBadge } from "@/components/shared/owner-badge"
import { deleteMyGoal, markAssignmentDone } from "@/app/ogrenci/konularim/actions"
import { markTopicLearned } from "@/app/ogrenci/kaynaklarim/video-actions"
import { TopicVideos } from "@/components/kaynaklar/topic-videos"
import { STAGE_LABEL, STAGE_ORDER, type GoalCoaching } from "@/lib/upplan/goal-stage"
import { MASTERY_LABEL_TEXT, MASTERY_TONE } from "@/lib/upplan/mastery"
import type { TopicVideos as TopicVideosMap } from "@/lib/resources/videos"

export type StudentAssignmentRow = AssignmentWithProgress & { coach_name: string | null }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

type StatusFilter = "all" | DerivedAssignmentStatus
type Enriched = StudentAssignmentRow & { derived: DerivedAssignmentStatus; pct: number }

export function AssignmentsCardGrid({
  rows,
  goalForm,
  hasCoach,
  coaching,
  topicVideos,
}: {
  rows: StudentAssignmentRow[]
  /** Verilirse öğrenci kendine hedef ekleyip düzenleyebilir. */
  goalForm?: GoalFormData
  hasCoach: boolean
  /** Öğrenci Konularım: hedef id → aşama, sonraki adım, ustalık. */
  coaching?: Record<string, GoalCoaching>
  /** Konu → videolar (Kaynaklarım playlist eşleşmesi). */
  topicVideos?: TopicVideosMap
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [logAsg, setLogAsg] = useState<StudentAssignmentRow | null>(null)
  const [goalDialog, setGoalDialog] = useState<{ initial?: GoalInitial } | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<StudentAssignmentRow | null>(null)
  const [pending, startTransition] = useTransition()

  const today = useMemo(() => new Date(), [])

  const enriched: Enriched[] = useMemo(
    () =>
      rows.map((r) => {
        const targets = { hedefSoru: r.hedef_soru, hedefDogruluk: r.hedef_dogruluk, dogru: r.dogru_sayisi }
        const derived = deriveAssignmentStatus(r.status, r.cozulen_soru, targets, r.son_tarih, today)
        const pct = progressPercent(r.cozulen_soru, targets)
        return { ...r, derived, pct }
      }),
    [rows, today],
  )

  // Sıralama: gecikti > aktif > tamamlandi > iptal; aynı kategoride yakın deadline önce.
  // Öğrenci (coaching var): açık hedefler öğrenme → soru → tekrar, her grupta plan önceliği.
  const sorted = useMemo(() => {
    const orderMap: Record<DerivedAssignmentStatus, number> = { gecikti: 0, aktif: 1, tamamlandi: 2, iptal: 3 }
    const open = (d: DerivedAssignmentStatus) => (d === "aktif" || d === "gecikti" ? 0 : orderMap[d])
    return enriched
      .filter((r) => statusFilter === "all" || r.derived === statusFilter)
      .sort((a, b) => {
        if (coaching) {
          const ca = coaching[a.id]
          const cb = coaching[b.id]
          return (
            open(a.derived) - open(b.derived) ||
            (ca ? STAGE_ORDER[ca.stage] : 3) - (cb ? STAGE_ORDER[cb.stage] : 3) ||
            (a.plan_order ?? 1e9) - (b.plan_order ?? 1e9) ||
            a.son_tarih.localeCompare(b.son_tarih)
          )
        }
        return orderMap[a.derived] - orderMap[b.derived] || a.son_tarih.localeCompare(b.son_tarih)
      })
  }, [enriched, statusFilter, coaching])

  function handleMarkDone(id: string) {
    startTransition(async () => {
      const res = await markAssignmentDone(id)
      if (!res.success) {
        toast.error(res.error ?? "İşaretlenemedi")
        return
      }
      toast.success("Tamamlandı olarak işaretlendi")
    })
  }

  function handleDeleteGoal() {
    if (!deleteGoal) return
    startTransition(async () => {
      const res = await deleteMyGoal(deleteGoal.id)
      if (!res.success) {
        toast.error(res.error ?? "Silinemedi")
        return
      }
      toast.success("Hedef silindi")
      setDeleteGoal(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
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
        <Badge variant="outline">{sorted.length} hedef</Badge>
        {goalForm && (
          <Button variant="accent" size="sm" className="ml-auto" onClick={() => setGoalDialog({})}>
            <Plus className="h-4 w-4" /> Hedef ekle
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        enriched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-gradient-to-b from-orange-50/60 to-white px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100">
              <Target className="h-6 w-6 text-[#F97316]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">Henüz hedefin yok</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
              {hasCoach
                ? "Koçunun atadığı konular ve kendine koyduğun hedefler burada görünür."
                : "Bir konu seç, tarih ve soru/doğruluk hedefi koy; ilerlemen soru çözüm kayıtlarından otomatik hesaplanır."}
            </p>
            {goalForm && (
              <Button variant="accent" className="mt-4" onClick={() => setGoalDialog({})}>
                <Plus className="h-4 w-4" /> İlk hedefini koy
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-sm text-zinc-500">
            Bu filtreyle eşleşen hedef yok.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((r) => (
            <AssignmentCard
              key={r.id}
              row={r}
              coaching={coaching?.[r.id]}
              videos={topicVideos?.[r.topic_id]}
              hasCoach={hasCoach}
              onLog={() => setLogAsg(r)}
              onMarkDone={() => handleMarkDone(r.id)}
              onEdit={
                goalForm && r.created_by_role === "student"
                  ? () =>
                      setGoalDialog({
                        initial: {
                          id: r.id,
                          topic_id: r.topic_id,
                          son_tarih: r.son_tarih,
                          hedef_soru: r.hedef_soru,
                          hedef_dogruluk: r.hedef_dogruluk,
                          notes: r.notes,
                        },
                      })
                  : undefined
              }
              onDelete={r.created_by_role === "student" ? () => setDeleteGoal(r) : undefined}
              disabled={pending}
            />
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Soru Çözüm&apos;de hedefin konusunu seçerek girdiğin kayıtlar, hedef tarih aralığındaysa ilerlemene otomatik eklenir.
      </p>

      {logAsg && (
        <LogProgressDialog
          open
          onOpenChange={(o) => !o && setLogAsg(null)}
          assignment={{ id: logAsg.id, topic_name: logAsg.topic_name, subject_name: logAsg.subject_name }}
        />
      )}

      {goalForm && goalDialog && (
        <GoalDialog data={goalForm} initial={goalDialog.initial} onOpenChange={(o) => !o && setGoalDialog(null)} />
      )}

      <AlertDialog open={!!deleteGoal} onOpenChange={(o) => !o && !pending && setDeleteGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hedefi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-zinc-700">{deleteGoal?.topic_name}</span> hedefi silinecek. Soru çözüm
              kayıtların silinmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                handleDeleteGoal()
              }}
            >
              {pending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// DropdownMenu modal={false}: menüden dialog açılınca body pointer-events kilidi kalmasın.
function AssignmentCard({
  row,
  coaching,
  videos,
  hasCoach,
  onLog,
  onMarkDone,
  onEdit,
  onDelete,
  disabled,
}: {
  row: Enriched
  coaching?: GoalCoaching
  videos?: TopicVideosMap[string]
  hasCoach: boolean
  onLog: () => void
  onMarkDone: () => void
  onEdit?: () => void
  onDelete?: () => void
  disabled: boolean
}) {
  const tone = ASSIGNMENT_STATUS_TONE[row.derived]
  const barColor = progressBarColor(row.derived, row.pct)
  const isActive = row.derived === "aktif" || row.derived === "gecikti"
  const isOwn = row.created_by_role === "student"
  const isUpplan = row.created_by_role === "ai"
  const acc = accuracyOf(row.dogru_sayisi, row.cozulen_soru)
  const targets = { hedefSoru: row.hedef_soru, hedefDogruluk: row.hedef_dogruluk, dogru: row.dogru_sayisi }
  const [learnPending, startLearn] = useTransition()

  function markLearned() {
    startLearn(async () => {
      const res = await markTopicLearned(row.id)
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      toast.success("Öğrenme aşaması tamam; artık soru çözümü.")
    })
  }

  return (
    <div className={`border rounded-2xl p-4 space-y-3 ${tone.border} ${tone.bg} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">{row.subject_name}</span>
            {isUpplan ? (
              <OwnerBadge role="ai" label="UpPlan" />
            ) : isOwn ? (
              <OwnerBadge role="student" label="Kendi hedefin" />
            ) : (
              (hasCoach || row.coach_name) && (
                <OwnerBadge role="coach" label={row.coach_name ? `${row.coach_name} atadı` : "Koçun atadı"} />
              )
            )}
          </div>
          <div className={`text-base font-semibold ${tone.text} truncate`}>{row.topic_name}</div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={ASSIGNMENT_STATUS_VARIANT[row.derived]}>{ASSIGNMENT_STATUS_LABEL[row.derived]}</Badge>
          {(onEdit || onDelete) && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Hedef işlemleri">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="h-4 w-4" /> Düzenle
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 className="h-4 w-4" /> Sil
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {coaching && isActive && (
        <div className="space-y-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-inset ring-zinc-200">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-[#1B6B8A]/10 px-2 py-0.5 font-medium text-[#1B6B8A]">{STAGE_LABEL[coaching.stage]} aşaması</span>
            {coaching.mastery && (
              <span className={`rounded-full px-2 py-0.5 font-medium tabular-nums ${MASTERY_TONE[coaching.mastery.label].chip}`}>
                Ustalık {coaching.mastery.effective} · {MASTERY_LABEL_TEXT[coaching.mastery.label]}
              </span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-sm font-medium text-zinc-900">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
            <span>
              <span className="text-zinc-500">Şimdi ne yapmalısın? </span>
              {coaching.nextAction}
            </span>
          </div>
          {coaching.why && <p className="text-xs text-zinc-500">{coaching.why}</p>}
          {videos && videos.length > 0 && <TopicVideos topicName={row.topic_name} groups={videos} compact={coaching.stage !== "ogren"} />}
          {coaching.canMarkLearned && (
            <Button size="sm" variant="outline" className="h-8 bg-white" onClick={markLearned} disabled={learnPending}>
              <BookOpenCheck className="h-4 w-4" /> Konuyu öğrendim
            </Button>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-700 mb-1">
          <span className="tabular-nums truncate">{goalSummary(row.cozulen_soru, targets)}</span>
          <span className="tabular-nums shrink-0">%{row.pct}</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-100">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${row.pct}%` }} />
        </div>
        {row.hedef_dogruluk == null && acc != null && (
          <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">Doğruluk %{acc}</div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          Hedef tarih: <span className="font-medium">{formatDate(row.son_tarih)}</span>
        </span>
        {row.toplam_sure_dk > 0 && <span>Toplam: {row.toplam_sure_dk} dk</span>}
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
          <Button size="sm" variant="outline" onClick={onMarkDone} disabled={disabled} title="Tamamlandı işaretle">
            <CheckCircle2 className="h-4 w-4" /> <span className="sr-only sm:not-sr-only">Tamamlandı</span>
          </Button>
        </div>
      )}
    </div>
  )
}
