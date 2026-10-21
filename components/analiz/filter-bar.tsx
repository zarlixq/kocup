"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { CalendarRange, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RANGE_OPTIONS, filterToParams, type AnalizFilter } from "@/lib/analytics/analiz/filter"
import { saveAnalizFilter } from "@/lib/analytics/analiz/actions"

const ALL = "__all__"

// Üst filtre: tarih aralığı + ders. URL'yi günceller (sunucu bölümleri yeniden
// hesaplar) ve seçimi kullanıcı tercihine kaydeder (Supabase, cihazlar arası).
export function AnalizFilterBar({
  filter,
  subjects,
  rangeLabel,
}: {
  filter: AnalizFilter
  subjects: { id: string; name: string }[]
  rangeLabel: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const [custom, setCustom] = useState({ from: filter.from ?? "", to: filter.to ?? "" })

  function apply(next: AnalizFilter) {
    start(async () => {
      router.replace(`${pathname}?${filterToParams(next).toString()}`, { scroll: false })
      await saveAnalizFilter(next)
    })
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1" role="group" aria-label="Tarih aralığı">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={filter.range === o.value}
              onClick={() => {
                if (o.value === "ozel") {
                  if (custom.from && custom.to) apply({ ...filter, range: "ozel", from: custom.from, to: custom.to })
                  else apply({ ...filter, range: "ozel", from: null, to: null })
                } else apply({ ...filter, range: o.value, from: null, to: null })
              }}
              className={cn(
                "h-9 rounded-lg px-3 text-sm font-medium transition-colors",
                filter.range === o.value ? "bg-[#1B6B8A] text-white" : "text-zinc-600 hover:bg-zinc-100",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="min-w-44 flex-1 sm:max-w-60">
          <Select
            value={filter.subjectId ?? ALL}
            onValueChange={(v) => apply({ ...filter, subjectId: v === ALL ? null : v })}
          >
            <SelectTrigger aria-label="Ders filtresi" className="h-11 bg-white">
              <SelectValue placeholder="Tüm dersler" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Tüm dersler</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarRange className="h-3.5 w-3.5" />}
          {rangeLabel}
        </span>
      </div>
      {filter.range === "ozel" && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (custom.from && custom.to) apply({ ...filter, range: "ozel", from: custom.from, to: custom.to })
          }}
        >
          <label className="space-y-1 text-xs text-zinc-600">
            Başlangıç
            <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-10" />
          </label>
          <label className="space-y-1 text-xs text-zinc-600">
            Bitiş
            <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-10" />
          </label>
          <button
            type="submit"
            disabled={!custom.from || !custom.to}
            className="h-10 rounded-lg bg-[#F97316] px-4 text-sm font-medium text-white hover:bg-[#ea6c10] disabled:opacity-50"
          >
            Uygula
          </button>
        </form>
      )}
    </div>
  )
}
