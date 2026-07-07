import { createClient } from "@/lib/supabase/server"
import {
  WeeklyProgramBoard,
  type ProgramItem,
} from "@/components/program/weekly-program-board"
import { CarryForwardPanel } from "@/components/program/carry-forward-panel"
import type { SubjectOption } from "@/components/program/program-item-dialog"
import { getWeekStart, isValidWeekStartParam, addWeeks } from "@/lib/week"

type SearchParams = { hafta?: string }

type RawItem = {
  id: string
  day_of_week: number
  subject_id: string | null
  baslik: string | null
  aciklama: string | null
  is_completed: boolean
  carried_from_item_id: string | null
  subjects: { id: string; name: string; color: string | null } | null
}

function mapItem(r: RawItem): ProgramItem {
  return {
    id: r.id,
    day_of_week: r.day_of_week,
    subject_id: r.subject_id,
    baslik: r.baslik,
    aciklama: r.aciklama,
    is_completed: r.is_completed,
    subject: r.subjects
      ? { id: r.subjects.id, name: r.subjects.name, color: r.subjects.color }
      : null,
  }
}

export default async function CoachStudentProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const weekStart = isValidWeekStartParam(sp.hafta) ? sp.hafta : getWeekStart()
  const prevWeek = addWeeks(weekStart, -1)

  const supabase = await createClient()

  const [{ data: programs }, { data: subjects }, { data: student }] = await Promise.all([
    supabase
      .from("weekly_programs")
      .select(
        "week_start, weekly_program_items(id, day_of_week, subject_id, baslik, aciklama, is_completed, carried_from_item_id, subjects(id, name, color))",
      )
      .eq("student_id", id)
      .in("week_start", [weekStart, prevWeek]),
    supabase
      .from("subjects")
      .select("id, name, exam_type, grade, order")
      .order("exam_type", { ascending: true, nullsFirst: true })
      .order("order"),
    supabase.from("students").select("grade").eq("id", id).maybeSingle(),
  ])

  const currentRows =
    (programs ?? []).find((p) => p.week_start === weekStart)?.weekly_program_items ?? []
  const prevRows =
    (programs ?? []).find((p) => p.week_start === prevWeek)?.weekly_program_items ?? []

  const items = (currentRows as RawItem[]).map(mapItem)

  // Bu haftaya zaten taşınmış kaynak id'leri (tekrar önerme).
  const carriedSet = new Set(
    (currentRows as RawItem[])
      .map((r) => r.carried_from_item_id)
      .filter((v): v is string => v != null),
  )
  const carryCandidates = (prevRows as RawItem[])
    .filter((r) => !r.is_completed && !carriedSet.has(r.id))
    .map(mapItem)

  const studentGrade = student?.grade
  const filteredSubjects: SubjectOption[] = (subjects ?? []).filter((s) => {
    if (!studentGrade) return true
    const isLgs = studentGrade === "7" || studentGrade === "8"
    if (s.exam_type === "lgs") return isLgs
    if (s.exam_type === "tyt" || s.exam_type === "ayt") return !isLgs
    return true
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Haftalık Program</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Her güne ders/konu ekle; öğrenci yaptıkça işaretler.
        </p>
      </div>

      <CarryForwardPanel studentId={id} weekStart={weekStart} items={carryCandidates} />

      <WeeklyProgramBoard
        weekStart={weekStart}
        items={items}
        mode="coach"
        baseHref={`/koc/ogrenciler/${id}/program`}
        studentId={id}
        subjects={filteredSubjects}
      />
    </div>
  )
}
