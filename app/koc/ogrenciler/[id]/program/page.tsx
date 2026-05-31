import { createClient } from "@/lib/supabase/server"
import { Calendar } from "lucide-react"
import { WeeklyScheduleGrid, type ScheduleEntryWithSubject } from "@/components/schedule/weekly-grid"
import { ProgramTermSwitch } from "@/components/schedule/term-switch"

type SearchParams = { donem?: string }

export default async function StudentProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const term = sp.donem === "2" ? 2 : 1

  const supabase = await createClient()

  const [{ data: schedule }, { data: subjects }, { data: student }] = await Promise.all([
    supabase
      .from("schedule")
      .select(
        "id, term, day_of_week, start_time, end_time, subject_id, custom_title, notes, subjects(id, name, color)",
      )
      .eq("student_id", id)
      .eq("term", term)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("subjects")
      .select("id, name, exam_type, order")
      .order("exam_type", { ascending: true, nullsFirst: true })
      .order("order"),
    supabase.from("students").select("grade").eq("id", id).maybeSingle(),
  ])

  const entries: ScheduleEntryWithSubject[] = (schedule ?? []).map((r) => ({
    id: r.id,
    term: r.term,
    day_of_week: r.day_of_week,
    start_time: r.start_time,
    end_time: r.end_time,
    subject_id: r.subject_id,
    custom_title: r.custom_title,
    notes: r.notes,
    subject: r.subjects
      ? { id: r.subjects.id, name: r.subjects.name, color: r.subjects.color }
      : null,
  }))

  const studentGrade = student?.grade
  const filteredSubjects = (subjects ?? []).filter((s) => {
    if (!studentGrade) return true
    const isLgs = studentGrade === "7" || studentGrade === "8"
    if (s.exam_type === "lgs") return isLgs
    if (s.exam_type === "tyt" || s.exam_type === "ayt") return !isLgs
    return true
  })

  const totalThisTerm = entries.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Haftalık Ders Programı</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {totalThisTerm} ders bu dönemde
          </p>
        </div>
        <ProgramTermSwitch baseHref={`/koc/ogrenciler/${id}/program`} current={term} />
      </div>

      {totalThisTerm === 0 ? (
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">
              {term}. dönem programı boş
            </h3>
            <p className="text-sm text-zinc-500">
              Aşağıdan bir güne ders ekleyerek başla.
            </p>
          </div>
          <WeeklyScheduleGrid
            entries={[]}
            subjects={filteredSubjects}
            editable
            studentId={id}
            term={term}
          />
        </div>
      ) : (
        <WeeklyScheduleGrid
          entries={entries}
          subjects={filteredSubjects}
          editable
          studentId={id}
          term={term}
        />
      )}
    </div>
  )
}
