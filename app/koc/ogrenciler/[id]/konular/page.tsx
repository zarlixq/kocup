import { createClient } from "@/lib/supabase/server"
import { fetchCurriculumTopics } from "@/lib/curriculum/topics"
import { AssignTopicsDialog } from "@/components/koc/assign-topics-dialog"
import { CustomTopicDialog } from "@/components/koc/custom-topic-dialog"
import { CleanList } from "@/components/konular/clean-list"
import type { Status, TopicCard } from "@/components/konular/types"

export default async function StudentKonularPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const [
    curriculumData,
    { data: assignedRows },
  ] = await Promise.all([
    fetchCurriculumTopics(supabase),
    supabase
      .from("student_topics")
      .select(
        "id, status, topic_id, custom_name, custom_subject_id, solved_count, wrong_count, error_notes, topics(name, subject_id, subjects(name)), subjects:custom_subject_id(name, id)",
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
      solvedCount: r.solved_count ?? 0,
      wrongCount: r.wrong_count ?? 0,
      errorNotes: r.error_notes,
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
          <CustomTopicDialog studentId={id} curriculumData={curriculumData} />
          <AssignTopicsDialog
            studentId={id}
            curriculumData={curriculumData}
            assignedTopicIds={assignedTopicIds}
          />
        </div>
      </div>

      <CleanList studentId={id} cards={cards} editable />
    </div>
  )
}
