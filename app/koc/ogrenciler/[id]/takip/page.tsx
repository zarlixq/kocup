import { createClient } from "@/lib/supabase/server"
import {
  WeeklySummaryDashboard,
  type TakipAssignment,
  type TakipSession,
} from "@/components/takip/weekly-summary-dashboard"

export default async function StudentTakipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Son ~12 hafta veri
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const fromIso = twelveWeeksAgo.toISOString().slice(0, 10)

  const [{ data: profile }, { data: sessions }, { data: assignments }, { data: progressAgg }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("id", id).maybeSingle(),
      supabase
        .from("study_sessions")
        .select("student_id, date, total_questions, correct, duration_minutes")
        .eq("student_id", id)
        .gte("date", fromIso),
      supabase
        .from("topic_assignments")
        .select(
          "id, student_id, hedef_soru, son_tarih, status, topics(name, subjects(name))",
        )
        .eq("student_id", id),
      supabase
        .from("study_sessions")
        .select("assignment_id, total_questions")
        .eq("student_id", id),
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

  const studentOption = profile ? [{ id: profile.id, full_name: profile.full_name }] : []

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Takip</h2>
      <WeeklySummaryDashboard
        students={studentOption}
        sessions={tSessions}
        assignments={tAssignments}
        hideStudentSelect
      />
    </div>
  )
}
