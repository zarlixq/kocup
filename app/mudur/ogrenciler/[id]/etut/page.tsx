import { createClient } from "@/lib/supabase/server"
import { Calendar } from "lucide-react"
import { WeeklyEtutGrid, type EtutEntryWithSubject } from "@/components/etut/weekly-grid"
import { ProgramTermSwitch } from "@/components/schedule/term-switch"

type SearchParams = { donem?: string }

export default async function MudurStudentEtutPage({
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

  const { data: schedule } = await supabase
    .from("etut_schedule")
    .select(
      "id, term, day_of_week, start_time, end_time, subject_id, custom_title, notes, subjects(id, name, color)",
    )
    .eq("student_id", id)
    .eq("term", term)
    .order("day_of_week")
    .order("start_time")

  const entries: EtutEntryWithSubject[] = (schedule ?? []).map((r) => ({
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Haftalık Etüt Programı</h2>
        <ProgramTermSwitch baseHref={`/mudur/ogrenciler/${id}/etut`} current={term} />
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <Calendar className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">{term}. dönem etüt programı boş.</p>
        </div>
      ) : (
        <WeeklyEtutGrid
          entries={entries}
          subjects={[]}
          editable={false}
          term={term}
        />
      )}
    </div>
  )
}
