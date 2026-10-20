"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Minus, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SearchCombobox } from "@/components/soru-cozum/search-combobox"
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_TONE,
  ERROR_TYPES,
  ERROR_TYPE_COLOR,
  ERROR_TYPE_HINT,
  ERROR_TYPE_LABEL,
  confidenceFor,
  type ErrorType,
} from "@/lib/yanlis-defteri/constants"
import {
  decrementAtom,
  decrementType,
  fromRows,
  incrementAtom,
  incrementType,
  sumCounts,
  toRpcItems,
  unknownTotal,
  type AtomCounts,
  type TypeCounts,
} from "@/lib/yanlis-defteri/panel-logic"
import type { SessionWrongContext } from "@/lib/yanlis-defteri/load"
import { saveSessionWrongs } from "@/app/ogrenci/yanlis-defteri/actions"
import { AtomPicker } from "@/components/yanlis-defteri/atom-picker"
import { forgetAtomCatalogs } from "@/components/yanlis-defteri/atom-catalog-store"

// Soru kaydı sonrası "Yanlışlarını ekle" paneli.
//   Kademe 1 (~5 sn): hata tipi başına sayaç, toplam ≤ yanlış sayısı.
//   Kademe 2: "bilmiyordum" (bilgi eksikliği / hiç fikrim yok) yanlışları için
//             bilgi atomu: konunun atomları chip olarak, arama ile dersin
//             (TYT+AYT) tüm konularından (AtomPicker).
export function WrongAnswersPanel({
  ctx,
  onDone,
  className,
}: {
  ctx: SessionWrongContext
  /** Kaydet ya da Geç sonrası. saved=false → Geç. */
  onDone: (saved: boolean) => void
  className?: string
}) {
  const initial = useMemo(() => fromRows(ctx.rows), [ctx.rows])
  const [types, setTypes] = useState<TypeCounts>(initial.types)
  const [atoms, setAtoms] = useState<AtomCounts>(initial.atoms)
  const [topicId, setTopicId] = useState<string | null>(ctx.session.topic_id)
  const [saving, startSave] = useTransition()

  const max = ctx.session.wrong
  const marked = sumCounts(types)
  const unknown = unknownTotal(types)
  const assigned = sumCounts(atoms)
  const confidence = confidenceFor(ctx.topicQuestions)

  function pickTopic(id: string | null) {
    setTopicId(id)
    setAtoms({})
  }

  function save() {
    if (!topicId) return toast.error("Önce konu seç.")
    startSave(async () => {
      const res = await saveSessionWrongs(ctx.session.id, toRpcItems(types, atoms), ctx.session.topic_id ? null : topicId)
      if (!res.success) {
        toast.error(res.error ?? "Kaydedilemedi.")
        return
      }
      toast.success(marked > 0 ? "Yanlışların yanlış defterine eklendi." : "Yanlış kayıtları güncellendi.")
      forgetAtomCatalogs()
      onDone(true)
    })
  }

  if (max <= 0) {
    return (
      <div className={cn("rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800", className)}>
        Bu kayıtta yanlışın yok — eklenecek bir şey kalmadı.
      </div>
    )
  }

  return (
    <div className={cn("space-y-5 text-left", className)}>
      {!ctx.session.topic_id && (
        <div className="space-y-1.5">
          <Label htmlFor="wrong-topic">Bu kayıt konusuz — yanlışları hangi konuya yazalım?</Label>
          <SearchCombobox
            id="wrong-topic"
            options={ctx.topicChoices.map((t) => ({ value: t.id, label: t.name }))}
            value={topicId}
            onChange={pickTopic}
            placeholder="Konu seç..."
            searchPlaceholder="Konu ara..."
          />
        </div>
      )}

      {/* ── Kademe 1 ── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            {max} yanlışın var, neden?
          </h3>
          <span className="text-xs tabular-nums text-zinc-500">
            {marked}/{max} işaretlendi
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ERROR_TYPES.map((t) => (
            <TypeButton
              key={t}
              type={t}
              count={types[t]}
              disabled={marked >= max}
              onAdd={() => setTypes(incrementType(types, t, max))}
              onRemove={() => {
                const r = decrementType(types, atoms, t)
                setTypes(r.types)
                setAtoms(r.atoms)
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Kademe 2 ── */}
      {unknown > 0 && (
        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Bilmediğin {unknown} yanlış hangi bilgide?</h3>
            <span className="text-xs tabular-nums text-zinc-500">
              {assigned}/{unknown}
            </span>
          </div>
          {!topicId ? (
            <p className="text-xs text-zinc-500">Önce konu seç.</p>
          ) : (
            <AtomPicker
              subjectId={ctx.session.subject_id}
              topicId={topicId}
              counts={atoms}
              onAdd={(id) => setAtoms(incrementAtom(types, atoms, id))}
              onRemove={(id) => setAtoms(decrementAtom(atoms, id))}
              canAdd={assigned < unknown}
              unsureCount={unknown - assigned}
              initialCatalog={ctx.catalog}
            />
          )}
        </section>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className={cn("inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px]", CONFIDENCE_TONE[confidence])}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {ctx.session.topic_id
            ? `Bu konuda ${ctx.topicQuestions} soru çözdün · açık haritası: ${CONFIDENCE_LABEL[confidence].toLocaleLowerCase("tr")}`
            : "Konu seçince açık haritana eklenir"}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onDone(false)} disabled={saving}>
            Geç
          </Button>
          <Button type="button" variant="accent" onClick={save} disabled={saving || !topicId}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TypeButton({
  type,
  count,
  disabled,
  onAdd,
  onRemove,
}: {
  type: ErrorType
  count: number
  disabled: boolean
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-xl border transition-colors",
        count > 0 ? "border-zinc-300 bg-white shadow-sm" : "border-zinc-200 bg-white",
      )}
    >
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Renk lejantla aynı: tip ↔ grafik eşleşmesi. Yazı nötr mürekkepte. */}
        <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ERROR_TYPE_COLOR[type] }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-zinc-900">{ERROR_TYPE_LABEL[type]}</span>
          <span className="block truncate text-[11px] text-zinc-500">{ERROR_TYPE_HINT[type]}</span>
        </span>
        <span
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums",
            count > 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400",
          )}
        >
          {count}
        </span>
      </button>
      {count > 0 && (
        <button
          type="button"
          onClick={onRemove}
          className="border-l border-zinc-200 px-2.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          aria-label={`${ERROR_TYPE_LABEL[type]} sayısını azalt`}
        >
          <Minus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
