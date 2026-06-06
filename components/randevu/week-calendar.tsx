"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/constants"

export type CalendarAppointment = {
  id: string
  title: string
  type: AppointmentType
  status: AppointmentStatus
  start_time: string
  end_time: string
  personName?: string | null
  /** Tekrarlı serinin parçası mı (rozet/ikon için) */
  isSeries?: boolean
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00 - 22:00
const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

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

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatRange(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
  return `${fmt(start)} — ${fmt(end)}`
}

export function WeekCalendar({
  appointments,
  onSelect,
}: {
  appointments: CalendarAppointment[]
  onSelect: (id: string) => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const weekEnd = addDays(weekStart, 6)

  const apptsByDayHour = useMemo(() => {
    // map: "YYYY-MM-DD-HH" => CalendarAppointment[]
    const m = new Map<string, CalendarAppointment[]>()
    for (const a of appointments) {
      const s = new Date(a.start_time)
      if (s < weekStart || s > addDays(weekStart, 7)) continue
      const key = `${s.toISOString().slice(0, 10)}-${s.getHours()}`
      const arr = m.get(key) ?? []
      arr.push(a)
      m.set(key, arr)
    }
    return m
  }, [appointments, weekStart])

  const today = new Date()

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      {/* Header / nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            title="Önceki hafta"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Bu Hafta
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            title="Sonraki hafta"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-zinc-700 font-medium">
          {formatRange(weekStart, weekEnd)}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px] grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
          {/* Header row */}
          <div className="border-b border-r border-zinc-200 bg-zinc-50" />
          {DAY_LABELS.map((label, i) => {
            const dayDate = addDays(weekStart, i)
            const isToday = sameDay(dayDate, today)
            return (
              <div
                key={i}
                className={`border-b border-r border-zinc-200 px-2 py-2 text-center bg-zinc-50 ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <div className="text-xs text-zinc-500">{label}</div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    isToday ? "text-[#1B6B8A]" : "text-zinc-900"
                  }`}
                >
                  {dayDate.getDate()}
                </div>
              </div>
            )
          })}

          {/* Hours rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-r border-zinc-200 px-2 py-1 text-[11px] text-zinc-400 text-right tabular-nums">
                {String(hour).padStart(2, "0")}:00
              </div>
              {Array.from({ length: 7 }, (_, di) => {
                const dayDate = addDays(weekStart, di)
                const key = `${dayDate.toISOString().slice(0, 10)}-${hour}`
                const items = apptsByDayHour.get(key) ?? []
                return (
                  <div
                    key={di}
                    className="border-b border-r border-zinc-200 min-h-14 p-1 space-y-1"
                  >
                    {items.map((a) => {
                      const c = APPOINTMENT_TYPE_COLOR[a.type]
                      const s = new Date(a.start_time)
                      const isCancelled = a.status === "iptal"
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onSelect(a.id)}
                          className={`w-full text-left rounded-md border ${c.border} ${c.bg} ${c.text} px-1.5 py-1 text-[11px] hover:shadow-sm transition-shadow ${
                            isCancelled ? "opacity-50 line-through" : ""
                          }`}
                          title={`${APPOINTMENT_TYPE_LABEL[a.type]} — ${a.title}`}
                        >
                          <div className="font-medium truncate">
                            {a.isSeries && (
                              <Repeat className="inline h-2.5 w-2.5 mr-0.5 -translate-y-px" />
                            )}
                            {s.toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {a.title}
                          </div>
                          {a.personName && (
                            <div className="truncate opacity-80">{a.personName}</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
