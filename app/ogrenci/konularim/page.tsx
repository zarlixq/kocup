import { createClient } from "@/lib/supabase/server"
import { BookOpen, Target } from "lucide-react"
import {
  AssignmentsCardGrid,
  type StudentAssignmentRow,
} from "@/components/konu-analizi/assignments-card-grid"
import { CleanList } from "@/components/konular/clean-list"
import type { Status, TopicCard } from "@/components/konular/types"

export const metadata = { title: "Konularım — KoçUp" }

export default async function KonularimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [
    { data: topics },
    { data: assignments },
    { data: progressAgg },
  ] = await Promise.all([
    supabase
      .from("student_topics")
      .select(
        "id, status, topic_id, custom_name, custom_subject_id, solved_count, wrong_count, error_notes, topics(name, subjects(name)), subjects:custom_subject_id(name)",
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("topic_assignments")
      .select(
        "id, hedef_soru, hedef_sure_dk, son_tarih, notes, status, coach_id, topics(name, subjects(name))",
      )
      .eq("student_id", userId),
    supabase
      .from("study_sessions")
      .select("assignment_id, total_questions, correct, duration_minutes")
      .eq("student_id", userId)
      .not("assignment_id", "is", null),
  ])

  const coachIds = Array.from(new Set((assignments ?? []).map((a) => a.coach_id)))
  const { data: coaches } = coachIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", coachIds)
    : { data: [] as Array<{ id: string; full_name: string }> }
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.full_name]))

  const progressByAsg = new Map<string, { cozulen: number; dogru: number; sure: number }>()
  for (const p of progressAgg ?? []) {
    if (!p.assignment_id) continue
    const cur = progressByAsg.get(p.assignment_id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    cur.cozulen += p.total_questions ?? 0
    cur.dogru += p.correct ?? 0
    cur.sure += p.duration_minutes ?? 0
    progressByAsg.set(p.assignment_id, cur)
  }

  const assignmentRows: StudentAssignmentRow[] = (assignments ?? []).map((a) => {
    const prog = progressByAsg.get(a.id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    return {
      id: a.id,
      topic_name: a.topics?.name ?? "—",
      subject_name: a.topics?.subjects?.name ?? "—",
      hedef_soru: a.hedef_soru,
      hedef_sure_dk: a.hedef_sure_dk,
      son_tarih: a.son_tarih,
      notes: a.notes,
      status: a.status,
      cozulen_soru: prog.cozulen,
      dogru_sayisi: prog.dogru,
      toplam_sure_dk: prog.sure,
      coach_name: coachById.get(a.coach_id) ?? null,
    }
  })

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
          Hedefli atamaların ve genel konu durumun.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#F97316]" />
          <h2 className="text-lg font-semibold text-zinc-900">Hedefli Atamalarım</h2>
        </div>
        <AssignmentsCardGrid rows={assignmentRows} />
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
