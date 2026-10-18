import { createClient } from "@/lib/supabase/server"
import {
  WeeklySummaryDashboard,
  type TakipAssignment,
  type TakipSession,
} from "@/components/takip/weekly-summary-dashboard"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: sessions }, assignments] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", id).maybeSingle(),
    supabase
      .from("study_sessions")
      .select("student_id, date, total_questions, correct, duration_minutes")
      .eq("student_id", id)
      .gte("date", fromIso),
    loadAssignmentsWithProgress(supabase, { studentId: id, coachScopeId: user!.id }),
  ])

  const tSessions: TakipSession[] = (sessions ?? []).map((s) => ({
    student_id: s.student_id,
    date: s.date,
    total_questions: s.total_questions ?? 0,
    correct: s.correct ?? 0,
    duration_minutes: s.duration_minutes,
  }))

  const tAssignments: TakipAssignment[] = assignments.map((a) => ({
    id: a.id,
    student_id: a.student_id,
    topic_name: a.topic_name,
    subject_name: a.subject_name,
    hedef_soru: a.hedef_soru,
    hedef_dogruluk: a.hedef_dogruluk,
    son_tarih: a.son_tarih,
    cozulen_soru: a.cozulen_soru,
    dogru_sayisi: a.dogru_sayisi,
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
