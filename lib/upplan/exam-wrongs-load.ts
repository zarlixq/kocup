import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { isErrorType } from "@/lib/yanlis-defteri/constants"
import type { ExamWrongRow } from "@/lib/upplan/exam-wrongs-logic"

type Client = SupabaseClient<Database>

export type ExamWrongSubject = {
  id: string
  name: string
  wrong: number
  topics: { id: string; name: string }[]
}

export type ExamWrongContext = {
  examId: string
  subjects: ExamWrongSubject[]
  rows: ExamWrongRow[]
  /** Mevcut dağıtımdaki atomların adları (atom başka konudan olabilir). */
  atomNames: Record<string, string>
  distributed: number
  totalWrong: number
}

/** Deneme yanlış paneli bağlamı: yanlışı olan dersler + aktif konuları + mevcut dağıtım. */
export async function loadExamWrongContext(
  supabase: Client,
  studentId: string,
  examId: string,
): Promise<ExamWrongContext | null> {
  const { data: exam } = await supabase
    .from("exams")
    .select("id, exam_results(subject_id, wrong, subjects(name, order))")
    .eq("id", examId)
    .eq("student_id", studentId)
    .maybeSingle()
  if (!exam) return null

  const results = (exam.exam_results ?? [])
    .filter((r) => r.wrong > 0)
    .sort((a, b) => (a.subjects?.order ?? 0) - (b.subjects?.order ?? 0))

  const { data: rows } = await supabase
    .from("wrong_answers")
    .select("topic_id, error_type, knowledge_atom_id, knowledge_atoms(name)")
    .eq("exam_id", examId)

  const existing = rows ?? []
  const topics = await fetchActiveTopics(supabase, { includeIds: existing.map((r) => r.topic_id) })
  const bySubject = new Map<string, { id: string; name: string }[]>()
  for (const t of topics) {
    const list = bySubject.get(t.subject_id) ?? []
    list.push({ id: t.id, name: t.name })
    bySubject.set(t.subject_id, list)
  }

  const subjects = results.map((r) => ({
    id: r.subject_id,
    name: r.subjects?.name ?? "—",
    wrong: r.wrong,
    topics: bySubject.get(r.subject_id) ?? [],
  }))

  return {
    examId: exam.id,
    subjects,
    rows: existing.map((r) => ({
      topic_id: r.topic_id,
      error_type: isErrorType(r.error_type) ? r.error_type : null,
      knowledge_atom_id: r.knowledge_atom_id,
    })),
    atomNames: Object.fromEntries(
      existing.flatMap((r) => (r.knowledge_atom_id && r.knowledge_atoms ? [[r.knowledge_atom_id, r.knowledge_atoms.name]] : [])),
    ),
    distributed: existing.length,
    totalWrong: subjects.reduce((s, x) => s + x.wrong, 0),
  }
}
