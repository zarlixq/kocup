import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  KocKonuAnaliziView,
  type AssignmentRow,
} from "@/components/konu-analizi/koc-konu-analizi-view"
import { StudentTopicAnalysis } from "@/components/konu-analizi/student-topic-analysis"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"

export default async function MudurStudentKonuAnaliziPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: profile },
    assignments,
    { data: subjects },
    { data: topics },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    loadAssignmentsWithProgress(supabase, { studentId: id }),
    supabase.from("subjects").select("id, name, exam_type, order").order("exam_type").order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
    supabase
      .from("study_sessions")
      .select(
        "id, assignment_id, date, total_questions, correct, wrong, duration_minutes, subject_id, subjects(name, order)",
      )
      .eq("student_id", id),
  ])

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
          subjects={subjects ?? []}
          topics={topics ?? []}
          showStudent={false}
          canManage={false}
          studentHrefBase="/mudur/ogrenciler"
        />
      </div>
    </div>
  )
}
