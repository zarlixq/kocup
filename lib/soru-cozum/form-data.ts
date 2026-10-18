import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { subjectExamKey, type SegmentSubject } from "@/lib/soru-cozum/segment"

type Client = SupabaseClient<Database>

export type FormTopic = { id: string; subject_id: string; name: string; order: number | null }

export type FormResource = {
  id: string
  name: string
  publisher: string | null
  subject_id: string | null
  // Öğrencinin "Kaynaklarım" listesinde (bırakılmamış) mı?
  mine: boolean
}

export type RecentTopic = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  exam_key: string
}

export type SessionFormData = {
  grade: string | null
  subjects: SegmentSubject[]
  topics: FormTopic[]
  resources: FormResource[]
  recentTopics: RecentTopic[]
}

export const RECENT_TOPIC_LIMIT = 5

/**
 * Soru kaydı formu (yeni + düzenle) için tüm referans verisi.
 * Katalog (resources) RLS ile org-izoledir: global + kendi kurumunun kaynakları.
 */
export async function loadSessionFormData(supabase: Client, studentId: string): Promise<SessionFormData> {
  const [
    { data: student },
    { data: subjects },
    { data: topics },
    { data: catalog },
    { data: mine },
    { data: recent },
  ] = await Promise.all([
    supabase.from("students").select("grade").eq("id", studentId).maybeSingle(),
    supabase.from("subjects").select("id, name, exam_type, grade, curriculum, order").order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
    supabase.from("resources").select("id, name, publisher, subject_id").order("name"),
    supabase
      .from("student_resources")
      .select("resource_id")
      .eq("student_id", studentId)
      .neq("status", "birakildi"),
    supabase
      .from("study_sessions")
      .select("topic_id, created_at")
      .eq("student_id", studentId)
      .not("topic_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const allSubjects = subjects ?? []
  const allTopics = topics ?? []
  const subjectById = new Map(allSubjects.map((s) => [s.id, s]))
  const topicById = new Map(allTopics.map((t) => [t.id, t]))
  const mineSet = new Set((mine ?? []).map((r) => r.resource_id))

  const recentTopics: RecentTopic[] = []
  const seen = new Set<string>()
  for (const r of recent ?? []) {
    if (!r.topic_id || seen.has(r.topic_id)) continue
    const topic = topicById.get(r.topic_id)
    const subject = topic ? subjectById.get(topic.subject_id) : undefined
    if (!topic || !subject) continue
    seen.add(r.topic_id)
    recentTopics.push({
      topic_id: topic.id,
      topic_name: topic.name,
      subject_id: subject.id,
      subject_name: subject.name,
      exam_key: subjectExamKey(subject),
    })
    if (recentTopics.length >= RECENT_TOPIC_LIMIT) break
  }

  const resources: FormResource[] = (catalog ?? [])
    .map((r) => ({ ...r, mine: mineSet.has(r.id) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name, "tr"))

  return {
    grade: student?.grade ?? null,
    subjects: allSubjects,
    topics: allTopics,
    resources,
    recentTopics,
  }
}
