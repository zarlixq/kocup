"use client"

import { useMemo, useState } from "react"
import { WeekCalendar, type CalendarAppointment } from "@/components/randevu/week-calendar"
import { MonthCalendar } from "@/components/randevu/month-calendar"
import {
  ViewModeToggle,
  type AppointmentViewMode,
} from "@/components/randevu/view-mode-toggle"
import {
  AppointmentsListView,
  type ListAppointment,
} from "@/components/randevu/appointments-list-view"
import {
  AppointmentDetailDialog,
  type DetailAppointment,
} from "@/components/randevu/appointment-detail-dialog"
import { RECURRENCE_LABEL } from "@/lib/appointments/constants"

export type StudentAppointmentRow = DetailAppointment & {
  coachName?: string | null
}

function seriesInfo(a: {
  is_recurring: boolean
  parent_appointment_id: string | null
  recurrence_rule: string | null
}) {
  const isSeries = a.is_recurring || a.parent_appointment_id !== null
  const recurrenceLabel = a.recurrence_rule ? RECURRENCE_LABEL[a.recurrence_rule] ?? "Seri" : null
  return { isSeries, recurrenceLabel }
}

export function OgrenciRandevularView({
  appointments,
  nowIso,
}: {
  appointments: StudentAppointmentRow[]
  /** "Şimdi" sunucudan gelir (render içinde Date.now çağrılmasın diye). */
  nowIso: string
}) {
  const [view, setView] = useState<AppointmentViewMode>("week")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Liste görünümü için: yaklaşanlar üstte, geçmiş aşağıda.
  const sorted = useMemo(() => {
    const upcoming: StudentAppointmentRow[] = []
    const past: StudentAppointmentRow[] = []
    for (const a of appointments) {
      if (a.start_time >= nowIso) upcoming.push(a)
      else past.push(a)
    }
    upcoming.sort((a, b) => a.start_time.localeCompare(b.start_time))
    past.sort((a, b) => b.start_time.localeCompare(a.start_time))
    return [...upcoming, ...past]
  }, [appointments, nowIso])

  const calendarItems: CalendarAppointment[] = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    start_time: a.start_time,
    end_time: a.end_time,
    personName: a.coachName ?? null,
    isSeries: seriesInfo(a).isSeries,
  }))

  const listItems: ListAppointment[] = sorted.map((a) => {
    const { isSeries, recurrenceLabel } = seriesInfo(a)
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      start_time: a.start_time,
      end_time: a.end_time,
      meeting_link: a.meeting_link,
      personName: a.coachName ?? null,
      isSeries,
      recurrenceLabel,
    }
  })

  const selected = selectedId
    ? appointments.find((a) => a.id === selectedId) ?? null
    : null

  return (
    <div className="space-y-4">
      <ViewModeToggle value={view} onChange={setView} />

      {view === "list" ? (
        <AppointmentsListView appointments={listItems} onSelect={setSelectedId} />
      ) : view === "month" ? (
        <MonthCalendar appointments={calendarItems} onSelect={setSelectedId} />
      ) : (
        <WeekCalendar appointments={calendarItems} onSelect={setSelectedId} />
      )}

      {selected && (
        <AppointmentDetailDialog
          open
          onOpenChange={(o) => !o && setSelectedId(null)}
          appointment={selected}
          students={[]}
          canManage={false}
        />
      )}
    </div>
  )
}
