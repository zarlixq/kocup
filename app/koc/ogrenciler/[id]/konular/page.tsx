import { createClient } from "@/lib/supabase/server"
import { AssignTopicsDialog } from "@/components/koc/assign-topics-dialog"
import { CustomTopicDialog } from "@/components/koc/custom-topic-dialog"
import { KonularViewSwitch } from "@/components/konular/view-switch"
import { CleanList } from "@/components/konular/clean-list"
import { KanbanBoard } from "@/components/konular/kanban-board"
import type { Status, TopicCard } from "@/components/konular/types"

type SearchParams = { view?: string }

export default async function StudentKonularPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const view: "kanban" | "liste" = sp.view === "kanban" ? "kanban" : "liste"

  const supabase = await createClient()

  const [
    { data: subjects },
    { data: topics },
    { data: assignedRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name, exam_type").order("exam_type").order("order"),
    supabase.from("topics").select("id, name, subject_id, order").order("order"),
    supabase
      .from("student_topics")
      .select(
        "id, status, topic_id, custom_name, custom_subject_id, topics(name, subject_id, subjects(name)), subjects:custom_subject_id(name, id)",
      )
      .eq("student_id", id),
  ])

  const cards: TopicCard[] = (assignedRows ?? []).map((r) => {
    const isCustom = !r.topic_id
    const topicName = isCustom ? r.custom_name ?? "—" : r.topics?.name ?? "—"
    const subjectName = isCustom
      ? r.subjects?.name ?? "—"
      : r.topics?.subjects?.name ?? "—"
    return {
      id: r.id,
      status: ((r.status as Status) ?? "basla") as Status,
      topicName,
      subjectName,
      isCustom,
    }
  })

  const assignedTopicIds = (assignedRows ?? [])
    .filter((r) => r.topic_id)
    .map((r) => r.topic_id as string)

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Konu Yönetimi</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{cards.length} atanmış konu</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <KonularViewSwitch
            baseHref={`/koc/ogrenciler/${id}/konular`}
            view={view}
          />
          <div className="hidden sm:block w-px h-6 bg-zinc-200" />
          <CustomTopicDialog studentId={id} subjects={subjects ?? []} />
          <AssignTopicsDialog
            studentId={id}
            subjects={subjects ?? []}
            topics={topics ?? []}
            assignedTopicIds={assignedTopicIds}
          />
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard studentId={id} cards={cards} />
      ) : (
        <CleanList studentId={id} cards={cards} />
      )}
    </div>
  )
}
