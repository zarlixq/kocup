import { createClient } from "@/lib/supabase/server"
import {
  WeeklySummaryDashboard,
  type TakipAssignment,
  type TakipSession,
} from "@/components/takip/weekly-summary-dashboard"

export const metadata = { title: "Takip — KoçUp" }

export default async function KocTakipPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Aktif öğrenciler
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("coach_id", user!.id)
    .eq("is_active", true)

  const studentIds = (students ?? []).map((s) => s.id)

  if (studentIds.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-zinc-900">Takip</h1>
          <p className="text-sm text-zinc-500 mt-1">Öğrencilerinin haftalık ilerleme özeti.</p>
        </header>
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Henüz aktif öğrencin yok.
        </div>
      </div>
    )
  }

  // Son ~12 hafta sınır
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const fromIso = twelveWeeksAgo.toISOString().slice(0, 10)

  const [{ data: sessions }, { data: assignments }, { data: profiles }, { data: progressAgg }] =
    await Promise.all([
      supabase
        .from("study_sessions")
        .select("student_id, date, total_questions, correct, duration_minutes")
        .in("student_id", studentIds)
        .gte("date", fromIso),
      supabase
        .from("topic_assignments")
        .select(
          "id, student_id, hedef_soru, son_tarih, status, topics(name, subjects(name))",
        )
        .eq("coach_id", user!.id),
      supabase.from("profiles").select("id, full_name").in("id", studentIds),
      supabase
        .from("study_sessions")
        .select("assignment_id, total_questions")
        .in("student_id", studentIds),
    ])

  const cozulenByAsg = new Map<string, number>()
  for (const p of progressAgg ?? []) {
    if (!p.assignment_id) continue
    cozulenByAsg.set(
      p.assignment_id,
      (cozulenByAsg.get(p.assignment_id) ?? 0) + (p.total_questions ?? 0),
    )
  }

  const tSessions: TakipSession[] = (sessions ?? []).map((s) => ({
    student_id: s.student_id,
    date: s.date,
    total_questions: s.total_questions ?? 0,
    correct: s.correct ?? 0,
    duration_minutes: s.duration_minutes,
  }))

  const tAssignments: TakipAssignment[] = (assignments ?? []).map((a) => ({
    id: a.id,
    student_id: a.student_id,
    topic_name: a.topics?.name ?? "—",
    subject_name: a.topics?.subjects?.name ?? "—",
    hedef_soru: a.hedef_soru,
    son_tarih: a.son_tarih,
    cozulen_soru: cozulenByAsg.get(a.id) ?? 0,
    status: a.status,
  }))

  const studentOptions = (profiles ?? [])
    .map((p) => ({ id: p.id, full_name: p.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Takip</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Öğrenci bazında haftalık/aylık ilerleme özeti.
        </p>
      </header>

      <WeeklySummaryDashboard
        students={studentOptions}
        sessions={tSessions}
        assignments={tAssignments}
      />
    </div>
  )
}
