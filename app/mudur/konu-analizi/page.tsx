import { Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  KocKonuAnaliziView,
  type AssignmentRow,
} from "@/components/konu-analizi/koc-konu-analizi-view"

export const metadata = { title: "Konu Analizi — Müdür" }

export default async function MudurKonuAnaliziPage() {
  const supabase = await createClient()

  const [
    { data: assignments },
    { data: students },
    { data: subjects },
    { data: topics },
  ] = await Promise.all([
    supabase
      .from("topic_assignments")
      .select(
        "id, student_id, topic_id, hedef_soru, hedef_sure_dk, baslangic_tarihi, son_tarih, notes, status, topics(name, subject_id, subjects(id, name))",
      ),
    supabase
      .from("students")
      .select("id, is_active")
      .eq("is_active", true),
    supabase.from("subjects").select("id, name, exam_type, order").order("exam_type").order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
  ])

  const allAsgIds = (assignments ?? []).map((a) => a.id)
  const studentIds = Array.from(
    new Set([
      ...(students ?? []).map((s) => s.id),
      ...(assignments ?? []).map((a) => a.student_id),
    ]),
  )

  const [{ data: progressAgg }, { data: profiles }] = await Promise.all([
    allAsgIds.length
      ? supabase
          .from("study_sessions")
          .select("assignment_id, total_questions, correct, duration_minutes")
          .in("assignment_id", allAsgIds)
      : Promise.resolve({ data: [] as Array<{ assignment_id: string | null; total_questions: number; correct: number; duration_minutes: number | null }> }),
    studentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", studentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
  ])

  const progressByAssignment = new Map<
    string,
    { cozulen: number; dogru: number; sure: number }
  >()
  for (const p of progressAgg ?? []) {
    if (!p.assignment_id) continue
    const cur = progressByAssignment.get(p.assignment_id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    cur.cozulen += p.total_questions ?? 0
    cur.dogru += p.correct ?? 0
    cur.sure += p.duration_minutes ?? 0
    progressByAssignment.set(p.assignment_id, cur)
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const rows: AssignmentRow[] = (assignments ?? []).map((a) => {
    const prog = progressByAssignment.get(a.id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    return {
      id: a.id,
      student_id: a.student_id,
      student_name: nameById.get(a.student_id) ?? "—",
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

  const activeStudents = (students ?? [])
    .map((s) => ({ id: s.id, full_name: nameById.get(s.id) ?? "—" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Konu Analizi</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Sistemdeki tüm koç → öğrenci konu atamalarını görüntüle.
        </p>
      </header>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm">
        <Eye className="h-4 w-4 text-blue-700 shrink-0" />
        <div className="text-blue-900">
          <span className="font-medium">Sadece görüntüleme.</span>{" "}
          Atamalar koçun panelinden yönetilir.
        </div>
      </div>

      <KocKonuAnaliziView
        rows={rows}
        students={activeStudents}
        subjects={subjects ?? []}
        topics={topics ?? []}
        canManage={false}
        studentHrefBase="/mudur/ogrenciler"
      />
    </div>
  )
}
