import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { BookOpen, Map as MapIcon, Target } from "lucide-react"
import {
  AssignmentsCardGrid,
  type StudentAssignmentRow,
} from "@/components/konu-analizi/assignments-card-grid"
import { CleanList } from "@/components/konular/clean-list"
import type { Status, TopicCard } from "@/components/konular/types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { loadSessionFormData } from "@/lib/soru-cozum/form-data"
import { getStudentContext } from "@/lib/ogrenci/context"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { loadRoadmapView } from "@/lib/upplan/roadmap-view"
import { RoadmapSection } from "@/components/upplan/roadmap/roadmap-section"
import { loadMasteryInfo } from "@/lib/upplan/roadmap-service"
import { goalCoaching, type GoalCoaching } from "@/lib/upplan/goal-stage"
import { loadTopicVideos } from "@/lib/resources/videos"

export const metadata = { title: "Konularım — KoçUp" }

export default async function KonularimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: topics }, assignments, ctx, formData, upplanProfile, roadmap, mastery, topicVideos] = await Promise.all([
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
    loadUpplanProfile(supabase, userId),
    loadRoadmapView(supabase, userId),
    loadMasteryInfo(supabase, userId),
    loadTopicVideos(supabase, userId),
  ])

  // Her açık hedef: aşama (öğren/soru/tekrar), "Şimdi ne yapmalısın?", ustalık.
  const coaching: Record<string, GoalCoaching> = {}
  for (const a of assignments) {
    if (a.status !== "aktif") continue
    const groups = topicVideos[a.topic_id] ?? []
    const firstUnwatched = groups.find((g) => g.videos.some((v) => v.watch_status !== "izlendi")) ?? groups[0]
    coaching[a.id] = goalCoaching(a, {
      effective: mastery.get(a.topic_id)?.effective ?? null,
      video: firstUnwatched ? { teacher: firstUnwatched.teacher_name, count: firstUnwatched.videos.length } : null,
    })
  }

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

  const trackedCards: TopicCard[] = (topics ?? []).map((t) => {
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
  // Konu Durumum hedefleri de sayar (UpPlan/koç/kendi): takip listesinde olmayan
  // açık ve tamamlanmış hedefler, durumları hedeften türetilerek (salt okunur).
  const trackedTopicIds = new Set((topics ?? []).map((t) => t.topic_id).filter(Boolean))
  const goalCards: TopicCard[] = []
  const seenGoalTopics = new Set<string>()
  for (const a of assignments) {
    if ((a.status !== "aktif" && a.status !== "tamamlandi") || trackedTopicIds.has(a.topic_id) || seenGoalTopics.has(a.topic_id)) continue
    seenGoalTopics.add(a.topic_id)
    goalCards.push({
      id: `goal-${a.id}`,
      status: a.status === "tamamlandi" ? "tamam" : a.block_type === "tekrar" ? "tekrar" : a.cozulen_soru > 0 ? "devam" : "basla",
      topicName: a.topic_name,
      subjectName: a.subject_name,
      isCustom: false,
      solvedCount: a.cozulen_soru,
      wrongCount: Math.max(a.cozulen_soru - a.dogru_sayisi, 0),
      errorNotes: null,
      fromGoal: true,
    })
  }
  const cards = [...trackedCards, ...goalCards]

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
          <MapIcon className="h-5 w-5 text-[#1B6B8A]" />
          <h2 className="text-lg font-semibold text-zinc-900">Yol Haritam</h2>
        </div>
        {upplanProfile?.completed_at ? (
          <RoadmapSection view={roadmap} coached={ctx.coachId != null} />
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-600">
            Yol haritası için önce{" "}
            <Link href="/ogrenci/upplan/kurulum" className="font-medium text-[#1B6B8A] hover:underline">
              UpPlan kurulumunu
            </Link>{" "}
            tamamla.
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#F97316]" />
          <h2 className="text-lg font-semibold text-zinc-900">Hedeflerim</h2>
        </div>
        <AssignmentsCardGrid
          rows={assignmentRows}
          hasCoach={ctx.coachId != null}
          coaching={coaching}
          topicVideos={topicVideos}
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
