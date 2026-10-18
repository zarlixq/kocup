import { createClient } from "@/lib/supabase/server"
import {
  WeeklyProgramBoard,
  type ProgramItem,
} from "@/components/program/weekly-program-board"
import { CarryForwardPanel } from "@/components/program/carry-forward-panel"
import type { SubjectOption } from "@/components/program/program-item-dialog"
import { mapProgramItem, PROGRAM_ITEM_COLUMNS, type RawProgramItem } from "@/lib/program/map-item"
import { filterProgramSubjects } from "@/lib/program/subjects"
import { getWeekStart, isValidWeekStartParam, addWeeks } from "@/lib/week"

type SearchParams = { hafta?: string }

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

  const [{ data: programs }, { data: subjects }, { data: student }, { data: topics }] = await Promise.all([
    supabase
      .from("weekly_programs")
      .select(`week_start, weekly_program_items(${PROGRAM_ITEM_COLUMNS})`)
      .eq("student_id", id)
      .in("week_start", [weekStart, prevWeek]),
    supabase
      .from("subjects")
      .select("id, name, exam_type, grade, order")
      .order("exam_type", { ascending: true, nullsFirst: true })
      .order("order"),
    supabase.from("students").select("grade").eq("id", id).maybeSingle(),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
  ])

  const currentRows =
    (programs ?? []).find((p) => p.week_start === weekStart)?.weekly_program_items ?? []
  const prevRows =
    (programs ?? []).find((p) => p.week_start === prevWeek)?.weekly_program_items ?? []

  const items = (currentRows as RawProgramItem[]).map(mapProgramItem)

  // Bu haftaya zaten taşınmış kaynak id'leri (tekrar önerme).
  const carriedSet = new Set(
    (currentRows as RawProgramItem[])
      .map((r) => r.carried_from_item_id)
      .filter((v): v is string => v != null),
  )
  const carryCandidates = (prevRows as RawProgramItem[])
    .filter((r) => !r.is_completed && !carriedSet.has(r.id))
    .map(mapProgramItem)

  const filteredSubjects: SubjectOption[] = filterProgramSubjects(subjects ?? [], student?.grade)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Haftalık Program</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Her güne ders/konu ekle; öğrenci yaptıkça işaretler. Öğrencinin kendi eklediği kalemler
          &quot;Öğrenci ekledi&quot; etiketiyle görünür; bunları silebilir ama düzenleyemezsin.
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
        topics={topics ?? []}
      />
    </div>
  )
}
