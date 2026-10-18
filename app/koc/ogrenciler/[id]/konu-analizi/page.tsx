import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchCurriculumTopics } from "@/lib/curriculum/topics"
import {
  KocKonuAnaliziView,
  type AssignmentRow,
} from "@/components/konu-analizi/koc-konu-analizi-view"
import { StudentTopicAnalysis } from "@/components/konu-analizi/student-topic-analysis"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"

export default async function StudentKonuAnaliziPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bu öğrencinin koçu olduğumuzu doğrula
  const { data: student } = await supabase
    .from("students")
    .select("id, coach_id")
    .eq("id", id)
    .maybeSingle()
  if (!student) notFound()
  if (student.coach_id !== user!.id) notFound()

  const [
    { data: profile },
    assignments,
    curriculumData,
    { data: sessions },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    loadAssignmentsWithProgress(supabase, { studentId: id, coachScopeId: user!.id }),
    fetchCurriculumTopics(supabase),
    supabase
      .from("study_sessions")
      .select(
        "id, assignment_id, date, total_questions, correct, wrong, duration_minutes, subject_id, subjects(name, order)",
      )
      .eq("student_id", id),
  ])

  const filterSubjects = [
    ...curriculumData.normal.subjects,
    ...curriculumData.maarif.subjects,
  ]

  if (!profile) notFound()

  const rows: AssignmentRow[] = assignments.map((a) => ({ ...a, student_name: profile.full_name }))

  return (
    <div className="space-y-6">
      <StudentTopicAnalysis sessions={sessions ?? []} />
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Hedefli Atamalar</h2>
        <KocKonuAnaliziView
          rows={rows}
          students={[{ id, full_name: profile.full_name }]}
          subjects={filterSubjects}
          curriculumData={curriculumData}
          showStudent={false}
          defaultStudentId={id}
        />
      </div>
    </div>
  )
}
