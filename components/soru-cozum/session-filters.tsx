"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchCombobox } from "@/components/soru-cozum/search-combobox"
import { RANGE_OPTIONS, type RangeKey } from "@/lib/soru-cozum/filters"

const ALL = "__all__"

export function SessionFilters({
  range,
  subjectId,
  topicId,
  from,
  to,
  today,
  subjects,
  topics,
}: {
  range: RangeKey
  subjectId: string | null
  topicId: string | null
  from: string | null
  to: string | null
  today: string
  subjects: { id: string; name: string }[]
  topics: { id: string; name: string; subject_id: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, start] = useTransition()

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") params.delete(k)
      else params.set(k, v)
    }
    const qs = params.toString()
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const topicOptions = topics
    .filter((t) => !subjectId || t.subject_id === subjectId)
    .map((t) => ({ value: t.id, label: t.name }))
  const hasFilter = subjectId != null || topicId != null || range !== "30"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => update({ aralik: o.key === "30" ? null : o.key, bas: null, bit: null })}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              range === o.key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {o.label}
          </button>
        ))}
        {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />}
      </div>

      {range === "ozel" && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <Input
            type="date"
            aria-label="Başlangıç tarihi"
            value={from ?? ""}
            max={to ?? today}
            onChange={(e) => update({ bas: e.target.value || null })}
          />
          <Input
            type="date"
            aria-label="Bitiş tarihi"
            value={to ?? ""}
            min={from ?? undefined}
            max={today}
            onChange={(e) => update({ bit: e.target.value || null })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)_auto] sm:items-center">
        <Select
          value={subjectId ?? ALL}
          onValueChange={(v) => update({ ders: v === ALL ? null : v, konu: null })}
        >
          <SelectTrigger className="h-11 bg-white" aria-label="Ders filtresi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm dersler</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchCombobox
          options={topicOptions}
          value={topicId}
          onChange={(v) => update({ konu: v })}
          clearable
          disabled={topicOptions.length === 0}
          placeholder={topicOptions.length === 0 ? "Konu kaydı yok" : "Tüm konular"}
          searchPlaceholder="Konu ara..."
        />
        {hasFilter && (
          <button
            type="button"
            onClick={() => update({ aralik: null, bas: null, bit: null, ders: null, konu: null })}
            className="inline-flex items-center gap-1 justify-self-start text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            <X className="h-3.5 w-3.5" /> Filtreleri temizle
          </button>
        )}
      </div>
    </div>
  )
}
