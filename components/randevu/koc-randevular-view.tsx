"use client"

import { useMemo, useState } from "react"
import { Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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
import { AppointmentFormDialog } from "@/components/randevu/appointment-form-dialog"
import {
  AppointmentDetailDialog,
  type DetailAppointment,
} from "@/components/randevu/appointment-detail-dialog"
import {
  RECURRENCE_LABEL,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/constants"

function seriesInfo(a: {
  is_recurring: boolean
  parent_appointment_id: string | null
  recurrence_rule: string | null
}) {
  const isSeries = a.is_recurring || a.parent_appointment_id !== null
  const recurrenceLabel = a.recurrence_rule ? RECURRENCE_LABEL[a.recurrence_rule] ?? "Seri" : null
  return { isSeries, recurrenceLabel }
}

export type CoachAppointmentRow = DetailAppointment & {
  meeting_link: string | null
  notes: string | null
  summary: string | null
}

type Student = { id: string; full_name: string }

type Props = {
  appointments: CoachAppointmentRow[]
  students: Student[]
}

type StatusFilter = "all" | AppointmentStatus
type TypeFilter = "all" | AppointmentType

export function KocRandevularView({ appointments, students }: Props) {
  const [view, setView] = useState<AppointmentViewMode>("week")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [studentFilter, setStudentFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false
      if (typeFilter !== "all" && a.type !== typeFilter) return false
      if (studentFilter !== "all" && a.student_id !== studentFilter) return false
      if (fromDate && a.start_time < new Date(fromDate).toISOString()) return false
      if (toDate) {
        const toEnd = new Date(toDate)
        toEnd.setDate(toEnd.getDate() + 1)
        if (a.start_time >= toEnd.toISOString()) return false
      }
      return true
    })
  }, [appointments, statusFilter, typeFilter, studentFilter, fromDate, toDate])

  // Yaklaşan üstte, geçmiş aşağıda
  const sorted = useMemo(() => {
    const now = Date.now()
    const upcoming: CoachAppointmentRow[] = []
    const past: CoachAppointmentRow[] = []
    for (const a of filtered) {
      if (new Date(a.start_time).getTime() >= now) upcoming.push(a)
      else past.push(a)
    }
    upcoming.sort((a, b) => a.start_time.localeCompare(b.start_time))
    past.sort((a, b) => b.start_time.localeCompare(a.start_time))
    return [...upcoming, ...past]
  }, [filtered])

  const calendarItems: CalendarAppointment[] = filtered.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    start_time: a.start_time,
    end_time: a.end_time,
    personName: a.studentName ?? a.applicationName ?? null,
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
      personName: a.studentName ?? a.applicationName ?? null,
      isSeries,
      recurrenceLabel,
    }
  })

  const selected = selectedId ? appointments.find((a) => a.id === selectedId) ?? null : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ViewModeToggle value={view} onChange={setView} />
        <Button variant="accent" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Yeni Randevu
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <Filter className="h-3.5 w-3.5" /> Filtreler
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Durum</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                <SelectItem value="planlandi">Planlandı</SelectItem>
                <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
                <SelectItem value="gelmedi">Gelmedi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Tip</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                <SelectItem value="koc_gorusme">Koç Görüşme</SelectItem>
                <SelectItem value="veli_gorusme">Veli Görüşme</SelectItem>
                <SelectItem value="tanitim">Tanıtım</SelectItem>
                <SelectItem value="ozel">Özel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Öğrenci</label>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Başlangıç</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Bitiş</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {view === "list" ? (
        <AppointmentsListView appointments={listItems} onSelect={setSelectedId} />
      ) : view === "month" ? (
        <MonthCalendar appointments={calendarItems} onSelect={setSelectedId} />
      ) : (
        <WeekCalendar appointments={calendarItems} onSelect={setSelectedId} />
      )}

      {formOpen && (
        <AppointmentFormDialog
          open
          onOpenChange={setFormOpen}
          mode="create"
          students={students}
        />
      )}

      {selected && (
        <AppointmentDetailDialog
          open
          onOpenChange={(o) => !o && setSelectedId(null)}
          appointment={selected}
          students={students}
          canManage
        />
      )}
    </div>
  )
}
