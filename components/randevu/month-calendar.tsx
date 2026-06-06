"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/appointments/constants"
import type { CalendarAppointment } from "@/components/randevu/week-calendar"

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function MonthCalendar({
  appointments,
  onSelect,
}: {
  appointments: CalendarAppointment[]
  onSelect: (id: string) => void
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  const gridStart = useMemo(() => startOfWeek(monthAnchor), [monthAnchor])
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  )

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarAppointment[]>()
    for (const a of appointments) {
      const key = dayKey(new Date(a.start_time))
      const arr = m.get(key) ?? []
      arr.push(a)
      m.set(key, arr)
    }
    for (const arr of m.values()) {
      arr.sort((x, y) => x.start_time.localeCompare(y.start_time))
    }
    return m
  }, [appointments])

  const today = new Date()
  const monthLabel = monthAnchor.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      {/* Header / nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
            title="Önceki ay"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(startOfMonth(new Date()))}
          >
            Bu Ay
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
            title="Sonraki ay"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-zinc-700 font-medium capitalize">{monthLabel}</div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
        {DAY_LABELS.map((l) => (
          <div key={l} className="px-2 py-1.5 text-center text-xs text-zinc-500">
            {l}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === monthAnchor.getMonth()
          const isToday = sameDay(d, today)
          const items = byDay.get(dayKey(d)) ?? []
          const shown = items.slice(0, 3)
          const extra = items.length - shown.length
          return (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-zinc-200 p-1.5 ${
                inMonth ? "" : "bg-zinc-50/60"
              }`}
            >
              <div className="mb-1 text-xs font-medium tabular-nums">
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1B6B8A] text-white">
                    {d.getDate()}
                  </span>
                ) : (
                  <span className={inMonth ? "text-zinc-700" : "text-zinc-400"}>
                    {d.getDate()}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {shown.map((a) => {
                  const c = APPOINTMENT_TYPE_COLOR[a.type]
                  const cancelled = a.status === "iptal"
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      className={`w-full text-left rounded border ${c.border} ${c.bg} ${c.text} px-1 py-0.5 text-[10px] truncate hover:shadow-sm transition-shadow ${
                        cancelled ? "opacity-50 line-through" : ""
                      }`}
                      title={`${APPOINTMENT_TYPE_LABEL[a.type]} — ${a.title}`}
                    >
                      {a.isSeries && (
                        <Repeat className="inline h-2.5 w-2.5 mr-0.5 -translate-y-px" />
                      )}
                      {new Date(a.start_time).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {a.title}
                    </button>
                  )
                })}
                {extra > 0 && (
                  <div className="text-[10px] text-zinc-400 px-1">+{extra} daha</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
