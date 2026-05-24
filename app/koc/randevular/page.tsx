import { createClient } from "@/lib/supabase/server"
import { KocRandevularView, type CoachAppointmentRow } from "@/components/randevu/koc-randevular-view"

export const metadata = { title: "Randevular — KoçUp" }

export default async function KocRandevularPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sadece kendi randevuları (RLS de kontrol ediyor)
  const { data: rawAppts } = await supabase
    .from("appointments")
    .select(
      "id, title, type, status, start_time, end_time, meeting_link, notes, summary, student_id, application_id, parent_appointment_id, is_recurring, recurrence_rule, recurrence_end_date",
    )
    .eq("coach_id", user!.id)
    .order("start_time", { ascending: true })

  const appts = rawAppts ?? []

  // Koçun aktif öğrencileri (form için)
  const { data: coachStudents } = await supabase
    .from("students")
    .select("id, is_active")
    .eq("coach_id", user!.id)
    .eq("is_active", true)

  const studentIds = (coachStudents ?? []).map((s) => s.id)

  // Tüm randevulardaki öğrenci ve başvuru id'lerini ek olarak topla (geçmiş öğrenci olabilir)
  const allStudentIds = Array.from(
    new Set([...studentIds, ...appts.map((a) => a.student_id).filter(Boolean) as string[]]),
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

  const enriched: CoachAppointmentRow[] = appts.map((a) => ({
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
    studentName: a.student_id ? profileById.get(a.student_id) ?? null : null,
    applicationName: a.application_id ? appById.get(a.application_id) ?? null : null,
  }))

  // Form için sadece aktif öğrenciler
  const studentOptions = (coachStudents ?? [])
    .map((s) => ({ id: s.id, full_name: profileById.get(s.id) ?? "—" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Randevular</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Öğrencilerinle olan görüşmelerini yönet.
        </p>
      </header>

      <KocRandevularView appointments={enriched} students={studentOptions} />
    </div>
  )
}
