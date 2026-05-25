import { createClient } from "@/lib/supabase/server"
import { StudentTopicAnalysis } from "@/components/konu-analizi/student-topic-analysis"
import { ExamTrendChart } from "@/components/charts/exam-trend-chart"
import { buildExamTrendData } from "@/lib/charts/builders"

export const metadata = { title: "Analizim — KoçUp" }

export default async function OgrenciAnalizimPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const studentId = user!.id

  const [{ data: sessions }, examTrendData] = await Promise.all([
    supabase
      .from("study_sessions")
      .select(
        "id, date, total_questions, correct, wrong, duration_minutes, subject_id, subjects(name, order)",
      )
      .eq("student_id", studentId),
    buildExamTrendData(supabase, studentId),
  ])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Analizim</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tüm çalışmaların ve denemelerinin özet analizi.
        </p>
      </header>

      <StudentTopicAnalysis sessions={sessions ?? []} />

      <ExamTrendChart data={examTrendData} />
    </div>
  )
}
