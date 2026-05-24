import { createClient } from "@/lib/supabase/server"
import { Calendar, CheckCircle2, XCircle } from "lucide-react"
import { StatsCard } from "@/components/mudur/stats-card"
import {
  MudurRandevularView,
  type AdminAppointmentRow,
} from "@/components/randevu/mudur-randevular-view"

export const metadata = { title: "Randevular — Müdür Paneli" }

export default async function MudurRandevularPage() {
  const supabase = await createClient()

  const startOfWeek = new Date()
  startOfWeek.setHours(0, 0, 0, 0)
  const day = startOfWeek.getDay()
  const diff = day === 0 ? -6 : 1 - day
  startOfWeek.setDate(startOfWeek.getDate() + diff)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const [{ data: rawAppts }, { data: coaches }, { data: weekAppts }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, title, type, status, start_time, end_time, meeting_link, notes, summary, student_id, application_id, parent_appointment_id, is_recurring, recurrence_rule, recurrence_end_date, coach_id",
      )
      .order("start_time", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
    supabase
      .from("appointments")
      .select("status")
      .gte("start_time", startOfWeek.toISOString())
      .lt("start_time", endOfWeek.toISOString()),
  ])

  const appts = rawAppts ?? []
  const coachList = coaches ?? []

  const allStudentIds = Array.from(
    new Set(appts.map((a) => a.student_id).filter(Boolean) as string[]),
  )
  const allAppIds = Array.from(
    new Set(appts.map((a) => a.application_id).filter(Boolean) as string[]),
  )

  const [{ data: profiles }, { data: applications }] = await Promise.all([
    allStudentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", allStudentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    allAppIds.length
      ? supabase.from("applications").select("id, full_name").in("id", allAppIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const appById = new Map((applications ?? []).map((p) => [p.id, p.full_name]))
  const coachById = new Map(coachList.map((c) => [c.id, c.full_name]))

  const enriched: AdminAppointmentRow[] = appts.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    start_time: a.start_time,
    end_time: a.end_time,
    meeting_link: a.meeting_link,
    notes: a.notes,
    summary: a.summary,
    student_id: a.student_id,
    parent_appointment_id: a.parent_appointment_id,
    is_recurring: a.is_recurring,
    recurrence_rule: a.recurrence_rule,
    recurrence_end_date: a.recurrence_end_date,
    coach_id: a.coach_id,
    studentName: a.student_id ? profileById.get(a.student_id) ?? null : null,
    applicationName: a.application_id ? appById.get(a.application_id) ?? null : null,
    coachName: coachById.get(a.coach_id) ?? null,
  }))

  const weekTotal = (weekAppts ?? []).length
  const weekCompleted = (weekAppts ?? []).filter((a) => a.status === "tamamlandi").length
  const weekCancelled = (weekAppts ?? []).filter((a) => a.status === "iptal").length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Tüm Randevular</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Sistemdeki tüm randevuları görüntüle.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={Calendar} color="blue" title="Bu Hafta" value={weekTotal} subtitle="Toplam randevu" />
        <StatsCard
          icon={CheckCircle2}
          color="green"
          title="Tamamlanan"
          value={weekCompleted}
          subtitle="Bu hafta"
        />
        <StatsCard
          icon={XCircle}
          color="orange"
          title="İptal"
          value={weekCancelled}
          subtitle="Bu hafta"
        />
      </div>

      <MudurRandevularView appointments={enriched} coaches={coachList} />
    </div>
  )
}
