import { Calendar, Video } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
} from "@/lib/appointments/constants"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Randevularım — KoçUp" }

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

export default async function OgrenciRandevularimPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nowIso = new Date().toISOString()

  const { data: rawAppts } = await supabase
    .from("appointments")
    .select(
      "id, title, type, status, start_time, end_time, meeting_link, coach_id",
    )
    .eq("student_id", user!.id)
    .order("start_time", { ascending: true })

  const appts = rawAppts ?? []

  const coachIds = Array.from(new Set(appts.map((a) => a.coach_id)))
  const { data: coaches } = coachIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", coachIds)
    : { data: [] as { id: string; full_name: string }[] }
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.full_name]))

  const upcoming = appts.filter((a) => a.start_time >= nowIso)
  const past = appts.filter((a) => a.start_time < nowIso).reverse()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Randevularım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Koçun ile yaklaşan ve geçmiş randevularını burada görebilirsin.
        </p>
      </header>

      <Section title="Yaklaşan Randevular" emoji="📅">
        {upcoming.length === 0 ? (
          <Empty text="Yaklaşan randevun yok." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((a) => {
              const c = APPOINTMENT_TYPE_COLOR[a.type]
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl border ${c.border} ${c.bg} p-4 space-y-2 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`text-sm font-semibold ${c.text} truncate`}>
                      {a.title}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/70 ${c.text} shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {APPOINTMENT_TYPE_LABEL[a.type]}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-700 tabular-nums">
                    {formatDate(a.start_time)} · {formatTime(a.start_time)} —{" "}
                    {formatTime(a.end_time)}
                  </div>
                  <div className="text-xs text-zinc-600">
                    Koç: {coachById.get(a.coach_id) ?? "—"}
                  </div>
                  {a.meeting_link && (
                    <a
                      href={a.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-1 text-sm font-medium text-white bg-[#1B6B8A] hover:bg-[#155571] px-3 py-2 rounded-lg transition-colors"
                    >
                      <Video className="h-4 w-4" /> Görüşmeye Katıl
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Geçmiş Randevular" emoji="🕒">
        {past.length === 0 ? (
          <Empty text="Geçmiş randevun yok." />
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Saat</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Koç</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((a) => {
                  const c = APPOINTMENT_TYPE_COLOR[a.type]
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(a.start_time)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatTime(a.start_time)} — {formatTime(a.end_time)}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900">{a.title}</TableCell>
                      <TableCell className="text-zinc-600">
                        {coachById.get(a.coach_id) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}
                        >
                          {APPOINTMENT_TYPE_LABEL[a.type]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>
                          {APPOINTMENT_STATUS_LABEL[a.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  emoji,
  children,
}: {
  title: string
  emoji: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-900 mb-3">
        {emoji} {title}
      </h2>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
      <Calendar className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  )
}
