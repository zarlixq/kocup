import Link from "next/link"
import { Calendar, Video } from "lucide-react"
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type AppointmentType,
} from "@/lib/appointments/constants"

type TodayAppointment = {
  id: string
  title: string
  type: AppointmentType
  start_time: string
  end_time: string
  meeting_link: string | null
  otherPersonName?: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TodaysAppointmentsCard({
  appointments,
  detailHref,
  title = "Bugünkü Randevularım",
}: {
  appointments: TodayAppointment[]
  detailHref?: string
  title?: string
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#1B6B8A]" />
          {title}
          {appointments.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#1B6B8A] text-white text-[11px] font-semibold">
              {appointments.length}
            </span>
          )}
        </h3>
        {detailHref && (
          <Link href={detailHref} className="text-xs text-[#1B6B8A] hover:underline">
            Tümü →
          </Link>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4 text-center">
          Bugün randevun yok 🎉
        </div>
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => {
            const c = APPOINTMENT_TYPE_COLOR[a.type]
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${c.border} ${c.bg}`}
              >
                <div className="text-sm font-semibold tabular-nums text-zinc-900 shrink-0">
                  {formatTime(a.start_time)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${c.text} truncate`}>
                    {a.title}
                  </div>
                  {a.otherPersonName && (
                    <div className="text-xs text-zinc-600 truncate">
                      {a.otherPersonName} · {APPOINTMENT_TYPE_LABEL[a.type]}
                    </div>
                  )}
                </div>
                {a.meeting_link && (
                  <a
                    href={a.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white border border-zinc-200 transition-colors shrink-0"
                    title="Görüşmeye katıl"
                  >
                    <Video className="h-4 w-4" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
