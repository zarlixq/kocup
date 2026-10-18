import { createClient } from "@/lib/supabase/server"
import { BookOpen, Target } from "lucide-react"
import {
  AssignmentsCardGrid,
  type StudentAssignmentRow,
} from "@/components/konu-analizi/assignments-card-grid"
import { CleanList } from "@/components/konular/clean-list"
import type { Status, TopicCard } from "@/components/konular/types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { loadSessionFormData } from "@/lib/soru-cozum/form-data"
import { getStudentContext } from "@/lib/ogrenci/context"

export const metadata = { title: "Konularım — KoçUp" }

export default async function KonularimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: topics }, assignments, ctx, formData] = await Promise.all([
    supabase
      .from("student_topics")
      .select(
        "id, status, topic_id, custom_name, custom_subject_id, solved_count, wrong_count, error_notes, topics(name, subjects(name)), subjects:custom_subject_id(name)",
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
    loadAssignmentsWithProgress(supabase, { studentId: userId }),
    getStudentContext(supabase, userId),
    loadSessionFormData(supabase, userId),
  ])

  const coachIds = Array.from(
    new Set(assignments.map((a) => a.coach_id).filter((v): v is string => v != null)),
  )
  const { data: coaches } = coachIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", coachIds)
    : { data: [] as Array<{ id: string; full_name: string }> }
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.full_name]))

  const assignmentRows: StudentAssignmentRow[] = assignments.map((a) => ({
    ...a,
    coach_name: a.coach_id ? coachById.get(a.coach_id) ?? null : null,
  }))

  const cards: TopicCard[] = (topics ?? []).map((t) => {
    const isCustom = !t.topic_id
    const topicName = isCustom ? t.custom_name ?? "—" : t.topics?.name ?? "—"
    const subjectName = isCustom
      ? t.subjects?.name ?? "—"
      : t.topics?.subjects?.name ?? "—"
    return {
      id: t.id,
      status: ((t.status as Status) ?? "basla") as Status,
      topicName,
      subjectName,
      isCustom,
      solvedCount: t.solved_count ?? 0,
      wrongCount: t.wrong_count ?? 0,
      errorNotes: t.error_notes,
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Konularım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {ctx.coachId
            ? "Koçunun atadığı konular, kendi hedeflerin ve genel konu durumun."
            : "Kendine konu hedefleri koy, ilerlemeni takip et."}
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#F97316]" />
          <h2 className="text-lg font-semibold text-zinc-900">Hedeflerim</h2>
        </div>
        <AssignmentsCardGrid
          rows={assignmentRows}
          hasCoach={ctx.coachId != null}
          goalForm={{
            grade: formData.grade,
            subjects: formData.subjects,
            topics: formData.topics,
            recentTopics: formData.recentTopics,
          }}
        />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-[#1B6B8A]" />
          <h2 className="text-lg font-semibold text-zinc-900">Konu Durumum</h2>
        </div>
        <CleanList
          studentId={userId}
          cards={cards}
          editable
          canDelete={false}
        />
      </section>
    </div>
  )
}
