import { createClient } from "@/lib/supabase/server"
import { CurriculumView, type SubjectItem } from "@/components/mudur/curriculum-view"
import type { TopicItem } from "@/components/mudur/topic-list"

export const metadata = { title: "Müfredat — KoçUp" }

export default async function MufredatPage() {
  const supabase = await createClient()

  const [{ data: subjectRows }, { data: topicRows }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, exam_type, color, order")
      .order("order", { ascending: true }),
    supabase
      .from("topics")
      .select("id, subject_id, name, order")
      .order("order", { ascending: true }),
  ])

  const topicsBySubject: Record<string, TopicItem[]> = {}
  for (const t of topicRows ?? []) {
    if (!topicsBySubject[t.subject_id]) topicsBySubject[t.subject_id] = []
    topicsBySubject[t.subject_id].push({ id: t.id, name: t.name, order: t.order })
  }

  const subjects: SubjectItem[] = (subjectRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    exam_type: s.exam_type,
    color: s.color,
    order: s.order,
    topic_count: topicsBySubject[s.id]?.length ?? 0,
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Müfredat</h1>
        <p className="text-sm text-zinc-500 mt-1">
          YKS müfredatını düzenleyin — dersler ve konular.
        </p>
      </header>

      <CurriculumView subjects={subjects} topicsBySubject={topicsBySubject} />
    </div>
  )
}
