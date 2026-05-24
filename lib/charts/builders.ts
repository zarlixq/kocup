import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import type { ExamTrendDatum } from "@/components/charts/exam-trend-chart"
import type { SubjectComparisonDatum } from "@/components/charts/subject-comparison-bar"

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────────────
// Ders bazlı başarı (radar) — %doğru oranı
// ─────────────────────────────────────────────────────────────────────────
export async function buildSubjectRadarData(
  supabase: Client,
  studentId: string,
): Promise<{ subject: string; score: number }[]> {
  const { data: rows } = await supabase
    .from("study_sessions")
    .select("subject_id, total_questions, correct, subjects(name, order, exam_type)")
    .eq("student_id", studentId)

  if (!rows || rows.length === 0) return []

  const agg = new Map<
    string,
    { name: string; total: number; correct: number; order: number }
  >()
  for (const r of rows) {
    const subject = r.subjects
    if (!subject) continue
    const key = r.subject_id
    const cur =
      agg.get(key) ?? { name: subject.name, total: 0, correct: 0, order: subject.order }
    cur.total += r.total_questions ?? 0
    cur.correct += r.correct ?? 0
    agg.set(key, cur)
  }

  return Array.from(agg.values())
    .sort((a, b) => a.order - b.order)
    .map((v) => ({
      subject: v.name,
      score: v.total > 0 ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
    }))
}

// ─────────────────────────────────────────────────────────────────────────
// Ders bazlı toplam vs doğru (horizontal bar)
// ─────────────────────────────────────────────────────────────────────────
export async function buildSubjectComparisonData(
  supabase: Client,
  studentId: string,
): Promise<SubjectComparisonDatum[]> {
  const { data: rows } = await supabase
    .from("study_sessions")
    .select("subject_id, total_questions, correct, subjects(name)")
    .eq("student_id", studentId)

  if (!rows || rows.length === 0) return []

  const agg = new Map<string, { name: string; total: number; correct: number }>()
  for (const r of rows) {
    const subject = r.subjects
    if (!subject) continue
    const cur =
      agg.get(r.subject_id) ?? { name: subject.name, total: 0, correct: 0 }
    cur.total += r.total_questions ?? 0
    cur.correct += r.correct ?? 0
    agg.set(r.subject_id, cur)
  }

  return Array.from(agg.values())
    .filter((v) => v.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((v) => ({ subject: v.name, total: v.total, correct: v.correct }))
}

// ─────────────────────────────────────────────────────────────────────────
// Deneme net seyri (line) — TYT + AYT ayrı
// ─────────────────────────────────────────────────────────────────────────
export async function buildExamTrendData(
  supabase: Client,
  studentId: string,
): Promise<ExamTrendDatum[]> {
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, exam_results(net, subjects(exam_type))")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (!exams || exams.length === 0) return []

  return exams.map((e) => {
    let tytNet = 0
    let aytNet = 0
    let hasTyt = false
    let hasAyt = false

    for (const r of e.exam_results ?? []) {
      const subjectExamType = r.subjects?.exam_type
      const net = Number(r.net ?? 0)
      if (subjectExamType === "tyt") {
        tytNet += net
        hasTyt = true
      } else if (subjectExamType === "ayt") {
        aytNet += net
        hasAyt = true
      }
    }

    return {
      date: e.date,
      name: e.name,
      tytNet: hasTyt ? Math.round(tytNet * 100) / 100 : null,
      aytNet: hasAyt ? Math.round(aytNet * 100) / 100 : null,
    }
  })
}
