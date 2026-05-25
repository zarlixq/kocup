import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  KocKonuAnaliziView,
  type AssignmentRow,
} from "@/components/konu-analizi/koc-konu-analizi-view"
import { StudentTopicAnalysis } from "@/components/konu-analizi/student-topic-analysis"

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
    { data: assignments },
    { data: subjects },
    { data: topics },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabase
      .from("topic_assignments")
      .select(
        "id, student_id, topic_id, hedef_soru, hedef_sure_dk, baslangic_tarihi, son_tarih, notes, status, topics(name, subject_id, subjects(id, name))",
      )
      .eq("student_id", id)
      .eq("coach_id", user!.id),
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

  const allAsgIds = (assignments ?? []).map((a) => a.id)
  const progressByAsg = new Map<string, { cozulen: number; dogru: number; sure: number }>()
  for (const s of sessions ?? []) {
    if (!s.assignment_id) continue
    if (!allAsgIds.includes(s.assignment_id)) continue
    const cur = progressByAsg.get(s.assignment_id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    cur.cozulen += s.total_questions ?? 0
    cur.dogru += s.correct ?? 0
    cur.sure += s.duration_minutes ?? 0
    progressByAsg.set(s.assignment_id, cur)
  }

  const rows: AssignmentRow[] = (assignments ?? []).map((a) => {
    const prog = progressByAsg.get(a.id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    return {
      id: a.id,
      student_id: a.student_id,
      student_name: profile.full_name,
      topic_id: a.topic_id,
      topic_name: a.topics?.name ?? "—",
      subject_id: a.topics?.subject_id ?? "",
      subject_name: a.topics?.subjects?.name ?? "—",
      hedef_soru: a.hedef_soru,
      hedef_sure_dk: a.hedef_sure_dk,
      baslangic_tarihi: a.baslangic_tarihi,
      son_tarih: a.son_tarih,
      notes: a.notes,
      status: a.status,
      cozulen_soru: prog.cozulen,
      dogru_sayisi: prog.dogru,
      toplam_sure_dk: prog.sure,
    }
  })

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
          defaultStudentId={id}
        />
      </div>
    </div>
  )
}
