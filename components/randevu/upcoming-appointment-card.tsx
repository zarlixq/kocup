import Link from "next/link"
import { Calendar, ExternalLink, Video } from "lucide-react"
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type AppointmentType,
} from "@/lib/appointments/constants"

type UpcomingAppointment = {
  id: string
  title: string
  type: AppointmentType
  start_time: string
  end_time: string
  meeting_link: string | null
  otherPersonName?: string | null
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UpcomingAppointmentCard({
  appointment,
  href,
  emptyText = "Yaklaşan randevun yok",
  emptyHref,
  title = "Yaklaşan Randevu",
}: {
  appointment: UpcomingAppointment | null
  href?: string
  emptyText?: string
  emptyHref?: string
  title?: string
}) {
  if (!appointment) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-400" />
          {title}
        </h3>
        <div className="text-sm text-zinc-500">
          {emptyText}
          {emptyHref && (
            <Link href={emptyHref} className="ml-2 text-[#1B6B8A] hover:underline">
              Tüm randevular →
            </Link>
          )}
        </div>
      </div>
    )
  }

  const colors = APPOINTMENT_TYPE_COLOR[appointment.type]

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#1B6B8A]" />
        {title}
      </h3>
      <div
        className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${colors.text} truncate`}>
              {appointment.title}
            </div>
            {appointment.otherPersonName && (
              <div className="text-xs text-zinc-600 truncate">
                {appointment.otherPersonName}
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/70 ${colors.text} shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {APPOINTMENT_TYPE_LABEL[appointment.type]}
          </span>
        </div>
        <div className="text-xs text-zinc-700 tabular-nums">
          {formatDateTime(appointment.start_time)} — {formatTime(appointment.end_time)}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {appointment.meeting_link && (
            <a
              href={appointment.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1B6B8A] hover:bg-[#155571] px-3 py-1.5 rounded-lg transition-colors"
            >
              <Video className="h-3.5 w-3.5" /> Görüşmeye Katıl
            </a>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-[#1B6B8A]"
            >
              Detay <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
