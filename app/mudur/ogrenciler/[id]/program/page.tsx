import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  WeeklyProgramBoard,
  type ProgramItem,
} from "@/components/program/weekly-program-board"
import { WeekSwitcher } from "@/components/program/week-switcher"
import { getWeekStart, isValidWeekStartParam } from "@/lib/week"

type SearchParams = { hafta?: string }

type RawItem = {
  id: string
  day_of_week: number
  subject_id: string | null
  baslik: string | null
  aciklama: string | null
  is_completed: boolean
  subjects: { id: string; name: string; color: string | null } | null
}

export default async function MudurStudentProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const weekStart = isValidWeekStartParam(sp.hafta) ? sp.hafta : getWeekStart()

  const supabase = await createClient()

  const { data: program } = await supabase
    .from("weekly_programs")
    .select(
      "id, weekly_program_items(id, day_of_week, subject_id, baslik, aciklama, is_completed, subjects(id, name, color))",
    )
    .eq("student_id", id)
    .eq("week_start", weekStart)
    .maybeSingle()

  const items: ProgramItem[] = ((program?.weekly_program_items ?? []) as RawItem[]).map(
    (r) => ({
      id: r.id,
      day_of_week: r.day_of_week,
      subject_id: r.subject_id,
      baslik: r.baslik,
      aciklama: r.aciklama,
      is_completed: r.is_completed,
      subject: r.subjects
        ? { id: r.subjects.id, name: r.subjects.name, color: r.subjects.color }
        : null,
    }),
  )

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Haftalık Program</h2>

      {items.length === 0 ? (
        <>
          <WeekSwitcher baseHref={`/mudur/ogrenciler/${id}/program`} weekStart={weekStart} />
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <Calendar className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Bu hafta programı boş.</p>
          </div>
        </>
      ) : (
        <WeeklyProgramBoard
          weekStart={weekStart}
          items={items}
          mode="readonly"
          baseHref={`/mudur/ogrenciler/${id}/program`}
        />
      )}
    </div>
  )
}
