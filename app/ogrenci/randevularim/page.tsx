import { createClient } from "@/lib/supabase/server"
import {
  OgrenciRandevularView,
  type StudentAppointmentRow,
} from "@/components/randevu/ogrenci-randevular-view"

export const metadata = { title: "Randevularım — KoçUp" }

export default async function OgrenciRandevularimPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nowIso = new Date().toISOString()

  const { data: rawAppts } = await supabase
    .from("appointments")
    .select(
      "id, title, type, status, start_time, end_time, meeting_link, notes, summary, student_id, application_id, parent_appointment_id, is_recurring, recurrence_rule, recurrence_end_date, coach_id",
    )
    .eq("student_id", user!.id)
    .order("start_time", { ascending: true })

  const appts = rawAppts ?? []

  const coachIds = Array.from(new Set(appts.map((a) => a.coach_id)))
  const { data: coaches } = coachIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", coachIds)
    : { data: [] as { id: string; full_name: string }[] }
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.full_name]))

  const rows: StudentAppointmentRow[] = appts.map((a) => {
    const coachName = coachById.get(a.coach_id) ?? null
    return {
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
      // Öğrenci panelinde "kişi" = koç
      studentName: coachName,
      applicationName: null,
      coachName,
    }
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Randevularım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Koçun ile yaklaşan ve geçmiş randevularını takvimde görebilirsin.
        </p>
      </header>

      <OgrenciRandevularView appointments={rows} nowIso={nowIso} />
    </div>
  )
}
