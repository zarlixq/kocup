"use client"

import { Video } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/constants"

export type ListAppointment = {
  id: string
  title: string
  type: AppointmentType
  status: AppointmentStatus
  start_time: string
  end_time: string
  meeting_link: string | null
  personName?: string | null
  coachName?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AppointmentsListView({
  appointments,
  onSelect,
  showCoach = false,
}: {
  appointments: ListAppointment[]
  onSelect: (id: string) => void
  showCoach?: boolean
}) {
  if (appointments.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
        Bu filtreyle randevu bulunamadı.
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Saat</TableHead>
            <TableHead>Başlık</TableHead>
            <TableHead>Kişi</TableHead>
            {showCoach && <TableHead>Koç</TableHead>}
            <TableHead>Tip</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((a) => {
            const c = APPOINTMENT_TYPE_COLOR[a.type]
            return (
              <TableRow
                key={a.id}
                onClick={() => onSelect(a.id)}
                className="cursor-pointer hover:bg-zinc-50"
              >
                <TableCell className="whitespace-nowrap">{formatDate(a.start_time)}</TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {formatTime(a.start_time)} — {formatTime(a.end_time)}
                </TableCell>
                <TableCell className="font-medium text-zinc-900">{a.title}</TableCell>
                <TableCell className="text-zinc-600">{a.personName ?? "—"}</TableCell>
                {showCoach && (
                  <TableCell className="text-zinc-600">{a.coachName ?? "—"}</TableCell>
                )}
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {APPOINTMENT_TYPE_LABEL[a.type]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>
                    {APPOINTMENT_STATUS_LABEL[a.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.meeting_link && (
                    <a
                      href={a.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white border border-zinc-200 transition-colors"
                      title="Görüşmeye katıl"
                    >
                      <Video className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
