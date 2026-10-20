"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Minus, NotebookPen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ERROR_TYPES,
  ERROR_TYPE_LABEL,
  UNTYPED_LABEL,
  isErrorType,
} from "@/lib/yanlis-defteri/constants"
import {
  atomAllowed,
  decrementTopic,
  fromExamRows,
  incrementTopic,
  setTopicAtom,
  setTopicType,
  subjectTotal,
  toExamRpcItems,
  topicCount,
  type SubjectWrongs,
} from "@/lib/upplan/exam-wrongs-logic"
import type { ExamWrongContext } from "@/lib/upplan/exam-wrongs-load"
import type { OverconfidentTopic } from "@/lib/upplan/today"
import { saveExamWrongsAction } from "@/app/ogrenci/denemelerim/actions"
import { AtomPicker } from "@/components/yanlis-defteri/atom-picker"
import { forgetAtomCatalogs, loadAtomCatalog } from "@/components/yanlis-defteri/atom-catalog-store"
import { advanceSetup } from "@/app/ogrenci/upplan/actions"

const NO_VALUE = "__none__"

// Deneme sonrası "X yanlışın var, hangi konulardan?" paneli.
// Her chip basışı o konuya 1 yanlış yazar (toplam ≤ dersin yanlışı);
// hata tipi ve bilgi atomu opsiyonel.
export function ExamWrongsPanel({
  ctx,
  defaultOpen,
  fromUpplan,
}: {
  ctx: ExamWrongContext
  defaultOpen: boolean
  fromUpplan: boolean
}) {
  const router = useRouter()
  const subjectOfTopic = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of ctx.subjects) for (const t of s.topics) m.set(t.id, s.id)
    return m
  }, [ctx.subjects])
  const initial = useMemo(() => fromExamRows(ctx.rows, (id) => subjectOfTopic.get(id)), [ctx.rows, subjectOfTopic])

  const [open, setOpen] = useState(defaultOpen && ctx.subjects.length > 0)
  const [state, setState] = useState<Record<string, SubjectWrongs>>(initial)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  // Bilgi seçicisi açık olan konu (tek seferde bir tane) ve seçilen atomların adları.
  const [atomOpen, setAtomOpen] = useState<string | null>(null)
  const [atomNames, setAtomNames] = useState<Record<string, string>>(ctx.atomNames)
  const [overconfident, setOverconfident] = useState<OverconfidentTopic[] | null>(null)
  const [saving, startSave] = useTransition()
  const [finishing, startFinish] = useTransition()

  const distributed = Object.values(state).reduce((n, s) => n + subjectTotal(s), 0)

  function update(subjectId: string, fn: (s: SubjectWrongs) => SubjectWrongs) {
    setState((prev) => ({ ...prev, [subjectId]: fn(prev[subjectId] ?? {}) }))
  }

  function toggleSkip(subjectId: string) {
    const wasSkipped = skipped.has(subjectId)
    setSkipped((prev) => {
      const next = new Set(prev)
      if (wasSkipped) next.delete(subjectId)
      else next.add(subjectId)
      return next
    })
    // Geçilen dersin dağıtımı temizlenir (kaydedilince o dersin deneme yanlışları silinir).
    if (!wasSkipped) setState((p) => ({ ...p, [subjectId]: {} }))
  }

  function toggleAtoms(subjectId: string, topicId: string) {
    loadAtomCatalog(subjectId)
    setAtomOpen((cur) => (cur === topicId ? null : topicId))
  }

  function save() {
    startSave(async () => {
      const res = await saveExamWrongsAction(ctx.examId, toExamRpcItems(state))
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      toast.success(distributed > 0 ? "Yanlışların yanlış defterine eklendi." : "Dağıtım güncellendi.")
      setOverconfident(res.data?.overconfident ?? [])
      forgetAtomCatalogs()
      setOpen(false)
      router.refresh()
    })
  }

  function finishSetup() {
    startFinish(async () => {
      const res = await advanceSetup("bitti")
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      router.push("/ogrenci/upplan")
    })
  }

  if (ctx.subjects.length === 0) {
    return fromUpplan ? <FinishSetupCard onFinish={finishSetup} pending={finishing} /> : null
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <NotebookPen className="h-4 w-4 text-[#1B6B8A]" /> Yanlışlarını konulara dağıt
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 tabular-nums">
            {ctx.totalWrong} yanlıştan {open ? distributed : ctx.distributed} tanesi konulara dağıtıldı. Ustalık haritan
            buna göre güncellenir.
          </p>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {ctx.distributed > 0 ? "Dağıtımı düzenle" : "Dağıt"}
          </Button>
        )}
      </div>

      {overconfident && overconfident.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Şu konularda kendini fazla iyi değerlendirmiş olabilirsin:{" "}
            <span className="font-medium">{overconfident.map((t) => t.topic_name).join(", ")}</span>. Konu taramanı
            güncellemek istersen{" "}
            <Link href="/ogrenci/upplan/kurulum?adim=tarama" className="font-medium underline">
              buradan
            </Link>
            .
          </div>
        </div>
      )}

      {open && (
        <div className="space-y-5">
          {ctx.subjects.map((s) => {
            const sw = state[s.id] ?? {}
            const total = subjectTotal(sw)
            const isSkipped = skipped.has(s.id)
            const chosen = s.topics.filter((t) => topicCount(sw[t.id]) > 0)
            return (
              <div key={s.id} className="space-y-2 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {s.name} — {s.wrong} yanlışın var{isSkipped ? "" : ", hangi konulardan?"}
                  </h3>
                  <div className="flex items-center gap-2">
                    {!isSkipped && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                          total >= s.wrong ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
                        )}
                      >
                        {total}/{s.wrong}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSkip(s.id)}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                    >
                      {isSkipped ? "Geri al" : "Bilmiyorum / geç"}
                    </button>
                  </div>
                </div>

                {!isSkipped && (
                  <>
                    {s.topics.length === 0 ? (
                      <p className="text-xs text-zinc-500">Bu dersin konu listesi yok.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {s.topics.map((t) => {
                          const n = topicCount(sw[t.id])
                          const full = total >= s.wrong
                          return (
                            <span key={t.id} className="inline-flex items-stretch">
                              <button
                                type="button"
                                disabled={full && n === 0}
                                onClick={() => update(s.id, (x) => incrementTopic(x, t.id, s.wrong))}
                                className={cn(
                                  "min-h-9 rounded-full border px-3 py-1 text-left text-xs transition-colors disabled:opacity-40",
                                  n > 0
                                    ? "rounded-r-none border-[#1B6B8A] bg-[#1B6B8A] text-white"
                                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
                                )}
                              >
                                {t.name}
                                {n > 0 && <span className="ml-1.5 font-semibold tabular-nums">×{n}</span>}
                              </button>
                              {n > 0 && (
                                <button
                                  type="button"
                                  aria-label={`${t.name} bir azalt`}
                                  onClick={() => update(s.id, (x) => decrementTopic(x, t.id))}
                                  className="rounded-r-full border border-l-0 border-[#1B6B8A] bg-[#15576f] px-2 text-white"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {chosen.length > 0 && (
                      <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">İstersen hata tipini ve bilgiyi de seç (opsiyonel).</p>
                        {chosen.map((t) => {
                          const g = sw[t.id].groups[0]
                          const open = atomOpen === t.id && atomAllowed(g.error_type)
                          return (
                            <div key={t.id} className="space-y-2">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem_11rem] sm:items-center">
                                <div className="truncate text-sm text-zinc-800">
                                  {t.name} <span className="tabular-nums text-zinc-500">×{topicCount(sw[t.id])}</span>
                                </div>
                                <Select
                                  value={g.error_type ?? NO_VALUE}
                                  onValueChange={(v) =>
                                    update(s.id, (x) => setTopicType(x, t.id, isErrorType(v) ? v : null))
                                  }
                                >
                                  <SelectTrigger className="h-9 bg-white text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_VALUE}>Hata tipi: {UNTYPED_LABEL}</SelectItem>
                                    {ERROR_TYPES.map((et) => (
                                      <SelectItem key={et} value={et}>
                                        {ERROR_TYPE_LABEL[et]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {atomAllowed(g.error_type) ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 justify-between bg-white text-xs"
                                    onClick={() => toggleAtoms(s.id, t.id)}
                                    aria-expanded={open}
                                  >
                                    <span className="truncate">
                                      {g.knowledge_atom_id
                                        ? `Bilgi: ${atomNames[g.knowledge_atom_id] ?? "seçili"}`
                                        : "Hangi bilgi?"}
                                    </span>
                                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
                                  </Button>
                                ) : (
                                  <span className="hidden sm:block" />
                                )}
                              </div>
                              {open && (
                                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-2.5">
                                  <AtomPicker
                                    single
                                    subjectId={s.id}
                                    topicId={t.id}
                                    counts={g.knowledge_atom_id ? { [g.knowledge_atom_id]: 1 } : {}}
                                    onAdd={(id, name) => {
                                      setAtomNames((p) => ({ ...p, [id]: name }))
                                      update(s.id, (x) => setTopicAtom(x, t.id, id))
                                    }}
                                    onRemove={() => update(s.id, (x) => setTopicAtom(x, t.id, null))}
                                    canAdd
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Sonra
            </Button>
            <Button variant="accent" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
            </Button>
          </div>
        </div>
      )}

      {fromUpplan && !open && <FinishSetupCard onFinish={finishSetup} pending={finishing} />}
    </section>
  )
}

function FinishSetupCard({ onFinish, pending }: { onFinish: () => void; pending: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-emerald-900">
        <CheckCircle2 className="h-4 w-4" /> Denemen kaydedildi. Ustalık haritan hazır.
      </div>
      <Button size="sm" onClick={onFinish} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Kurulumu tamamla
      </Button>
    </div>
  )
}
