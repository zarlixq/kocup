import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// İki müfredat düzeni: Normal (mevcut) ve Maarif.
export type CurriculumKey = "normal" | "maarif"

// İki seviye: Lise ve Ortaokul. Düzenden bağımsız ikinci eksen.
export type GradeLevel = "lise" | "ortaokul"

export type CurriculumSubject = {
  id: string
  name: string
  exam_type: string | null
  grade: number | null
  order: number | null
}

export type CurriculumTopic = {
  id: string
  subject_id: string
  name: string
  order: number | null
}

export type CurriculumDataset = {
  subjects: CurriculumSubject[]
  topics: CurriculumTopic[]
}

export type CurriculumData = {
  normal: CurriculumDataset
  maarif: CurriculumDataset
}

export const EMPTY_CURRICULUM_DATA: CurriculumData = {
  normal: { subjects: [], topics: [] },
  maarif: { subjects: [], topics: [] },
}

function isMaarif(curriculum: string | null | undefined): boolean {
  return curriculum === "maarif"
}

/**
 * Bir dersin seviyesini (Lise/Ortaokul) türetir. Veri-agnostik:
 * - Önce `grade`'e bakar: 5-8 → Ortaokul, 9-12 → Lise.
 * - grade yoksa `exam_type` fallback'i: 'lgs' → Ortaokul, 'tyt'/'ayt' → Lise.
 * - İkisi de belirsizse `null` döner (seviye filtresinden muaf — her seviyede görünür).
 */
export function subjectLevel(
  subject: { grade: number | null; exam_type: string | null },
): GradeLevel | null {
  if (subject.grade != null) return subject.grade <= 8 ? "ortaokul" : "lise"
  const examType = subject.exam_type?.toLocaleLowerCase("tr")
  if (examType === "lgs") return "ortaokul"
  if (examType === "tyt" || examType === "ayt") return "lise"
  return null
}

/**
 * subjects + topics'i tek seferde çekip iki müfredata (normal | maarif) ayırır.
 *
 * `subjects.curriculum` kolonu DB tarafında eklenir (text, default 'normal').
 * null/eksik değerler defansif olarak 'normal' sayılır; bu sayede kolon
 * eklenmeden önce de (tüm satırlar normal kabul edilir) çökmeden çalışır.
 * Maarif listesi veri yoksa boş döner — UI boş durumu kendi gösterir.
 */
export async function fetchCurriculumTopics(
  supabase: SupabaseClient<Database>,
): Promise<CurriculumData> {
  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, exam_type, grade, order, curriculum")
      .order("exam_type")
      .order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
  ])

  const allSubjects = subjects ?? []
  const allTopics = topics ?? []

  const buildDataset = (key: CurriculumKey): CurriculumDataset => {
    const subs = allSubjects.filter((s) =>
      key === "maarif" ? isMaarif(s.curriculum) : !isMaarif(s.curriculum),
    )
    const subjectIds = new Set(subs.map((s) => s.id))
    const tps = allTopics.filter((t) => subjectIds.has(t.subject_id))
    return {
      subjects: subs.map((s) => ({
        id: s.id,
        name: s.name,
        exam_type: s.exam_type,
        grade: s.grade,
        order: s.order,
      })),
      topics: tps.map((t) => ({
        id: t.id,
        subject_id: t.subject_id,
        name: t.name,
        order: t.order,
      })),
    }
  }

  return { normal: buildDataset("normal"), maarif: buildDataset("maarif") }
}
