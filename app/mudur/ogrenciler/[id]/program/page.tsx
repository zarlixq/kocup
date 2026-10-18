import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  WeeklyProgramBoard,
  type ProgramItem,
} from "@/components/program/weekly-program-board"
import { WeekSwitcher } from "@/components/program/week-switcher"
import { getWeekStart, isValidWeekStartParam } from "@/lib/week"
import { mapProgramItem, PROGRAM_ITEM_COLUMNS, type RawProgramItem } from "@/lib/program/map-item"

type SearchParams = { hafta?: string }

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
    .select(`id, weekly_program_items(${PROGRAM_ITEM_COLUMNS})`)
    .eq("student_id", id)
    .eq("week_start", weekStart)
    .maybeSingle()

  const items: ProgramItem[] = ((program?.weekly_program_items ?? []) as RawProgramItem[]).map(mapProgramItem)

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
