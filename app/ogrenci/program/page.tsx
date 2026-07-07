import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  WeeklyProgramBoard,
  type ProgramItem,
} from "@/components/program/weekly-program-board"
import { WeekSwitcher } from "@/components/program/week-switcher"
import { getWeekStart, isValidWeekStartParam } from "@/lib/week"

export const metadata = { title: "Program — KoçUp" }

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

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const weekStart = isValidWeekStartParam(sp.hafta) ? sp.hafta : getWeekStart()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: program } = await supabase
    .from("weekly_programs")
    .select(
      "id, weekly_program_items(id, day_of_week, subject_id, baslik, aciklama, is_completed, subjects(id, name, color))",
    )
    .eq("student_id", user!.id)
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
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Haftalık Program</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Koçunun hazırladığı program. Yaptığın kalemleri işaretle.
        </p>
      </div>

      {items.length === 0 ? (
        <>
          <WeekSwitcher baseHref="/ogrenci/program" weekStart={weekStart} />
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <Calendar className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 mb-1">
              Bu hafta programın boş
            </h3>
            <p className="text-sm text-zinc-500">
              Koçun kalem eklediğinde burada görünecek.
            </p>
          </div>
        </>
      ) : (
        <WeeklyProgramBoard
          weekStart={weekStart}
          items={items}
          mode="student"
          baseHref="/ogrenci/program"
        />
      )}
    </div>
  )
}
