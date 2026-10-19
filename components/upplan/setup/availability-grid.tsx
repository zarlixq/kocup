"use client"

import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { cn } from "@/lib/utils"
import { DAYS } from "@/lib/days"
import { GRID_START_HOUR, SLOT_MINUTES, SLOTS_PER_DAY } from "@/lib/upplan/config"
import type { Availability } from "@/lib/upplan/profile"

function slotLabel(slot: number) {
  const mins = GRID_START_HOUR * 60 + slot * SLOT_MINUTES
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
}

function hourToSlot(h: number) {
  return ((h - GRID_START_HOUR) * 60) / SLOT_MINUTES
}

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i)

// Haftalık müsaitlik: gün × 30 dk. Sürükleyerek boyama — ilk dokunulan hücrenin
// tersine boyar. Mobilde tek gün (sekme), md+ 7 gün. Hücreler touch-none; sayfa
// sol saat sütunundan kaydırılır.
export function AvailabilityGrid({
  value,
  onChange,
}: {
  value: Availability
  /** Sürüklerken render beklenmeden art arda boyanır → fonksiyonel güncelleme. */
  onChange: Dispatch<SetStateAction<Availability>>
}) {
  const [day, setDay] = useState(1)
  const paint = useRef<{ on: boolean } | null>(null)
  const sets = DAYS.map((d) => new Set(value[String(d.num)] ?? []))

  function apply(dayNum: number, slot: number, on: boolean) {
    onChange((base) => {
      const cur = new Set(base[String(dayNum)] ?? [])
      if (cur.has(slot) === on) return base
      if (on) cur.add(slot)
      else cur.delete(slot)
      const next = { ...base }
      if (cur.size) next[String(dayNum)] = Array.from(cur).sort((a, b) => a - b)
      else delete next[String(dayNum)]
      return next
    })
  }

  function cellFromPoint(x: number, y: number) {
    const el = document.elementFromPoint(x, y)
    const cell = el instanceof HTMLElement ? el.closest<HTMLElement>("[data-slot]") : null
    if (!cell) return null
    return { day: Number(cell.dataset.day), slot: Number(cell.dataset.slot) }
  }

  function preset(days: number[], fromHour: number, toHour: number) {
    onChange((base) => {
      const next = { ...base }
      for (const d of days) {
        const cur = new Set(next[String(d)] ?? [])
        for (let s = hourToSlot(fromHour); s < hourToSlot(toHour); s++) cur.add(s)
        next[String(d)] = Array.from(cur).sort((a, b) => a - b)
      }
      return next
    })
  }

  const totalHours = (Object.values(value).reduce((n, s) => n + s.length, 0) * SLOT_MINUTES) / 60

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Hızlı doldur:</span>
        <button type="button" className="rounded-full border border-zinc-200 px-2.5 py-1 hover:border-zinc-400" onClick={() => preset([1, 2, 3, 4, 5], 17, 22)}>
          Hafta içi 17:00–22:00
        </button>
        <button type="button" className="rounded-full border border-zinc-200 px-2.5 py-1 hover:border-zinc-400" onClick={() => preset([6, 7], 10, 18)}>
          Hafta sonu 10:00–18:00
        </button>
        <button type="button" className="rounded-full px-2.5 py-1 text-zinc-500 hover:text-zinc-900" onClick={() => onChange({})}>
          Temizle
        </button>
        <span className="ml-auto font-medium text-zinc-700 tabular-nums">Haftada {totalHours.toLocaleString("tr-TR")} saat</span>
      </div>

      {/* Mobil gün sekmeleri */}
      <div className="grid grid-cols-7 gap-1 md:hidden" role="tablist" aria-label="Gün">
        {DAYS.map((d, i) => (
          <button
            key={d.num}
            type="button"
            role="tab"
            aria-selected={day === d.num}
            onClick={() => setDay(d.num)}
            className={cn(
              "rounded-lg py-1.5 text-xs font-medium",
              day === d.num ? "bg-[#1B6B8A] text-white" : "bg-zinc-100 text-zinc-600",
            )}
          >
            {d.short}
            {sets[i].size > 0 && <span className="block text-[10px] opacity-80 tabular-nums">{(sets[i].size * SLOT_MINUTES) / 60}s</span>}
          </button>
        ))}
      </div>

      <div
        className="grid select-none grid-cols-[3rem_1fr] gap-x-1 md:grid-cols-[3rem_repeat(7,1fr)]"
        onPointerUp={() => (paint.current = null)}
        onPointerLeave={() => (paint.current = null)}
        onPointerCancel={() => (paint.current = null)}
      >
        <div />
        {DAYS.map((d) => (
          <div key={d.num} className={cn("pb-1 text-center text-xs font-medium text-zinc-600", day !== d.num && "hidden md:block")}>
            {d.short}
          </div>
        ))}
        {SLOTS.map((slot) => (
          <div key={slot} className="contents">
            <div className="pr-1 text-right text-[10px] leading-6 text-zinc-400 tabular-nums">{slot % 2 === 0 ? slotLabel(slot) : ""}</div>
            {DAYS.map((d, i) => {
              const on = sets[i].has(slot)
              return (
                <div
                  key={d.num}
                  data-day={d.num}
                  data-slot={slot}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${d.label} ${slotLabel(slot)}`}
                  tabIndex={-1}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    paint.current = { on: !on }
                    apply(d.num, slot, !on)
                  }}
                  onPointerMove={(e) => {
                    if (!paint.current) return
                    const c = cellFromPoint(e.clientX, e.clientY)
                    if (c) apply(c.day, c.slot, paint.current.on)
                  }}
                  className={cn(
                    "h-6 touch-none border-zinc-100 md:h-4",
                    slot % 2 === 0 ? "border-t" : "border-t border-dashed",
                    on ? "bg-[#1B6B8A]/80" : "bg-zinc-50 hover:bg-zinc-100",
                    day !== d.num && "hidden md:block",
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
