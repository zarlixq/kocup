import { createClient } from "@/lib/supabase/server"
import { Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Program — KoçUp" }

const DAYS: { num: number; label: string }[] = [
  { num: 1, label: "Pazartesi" },
  { num: 2, label: "Salı" },
  { num: 3, label: "Çarşamba" },
  { num: 4, label: "Perşembe" },
  { num: 5, label: "Cuma" },
  { num: 6, label: "Cumartesi" },
  { num: 7, label: "Pazar" },
]

export default async function ProgramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: schedule } = await supabase
    .from("schedule")
    .select("id, term, day_of_week, start_time, end_time, custom_title, notes, subjects(name)")
    .eq("student_id", user!.id)
    .order("day_of_week")
    .order("start_time")

  const byDay: Record<number, NonNullable<typeof schedule>> = {}
  for (const row of schedule ?? []) {
    if (!byDay[row.day_of_week]) byDay[row.day_of_week] = []
    byDay[row.day_of_week].push(row)
  }

  const totalLessons = (schedule ?? []).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Haftalık Program</h1>
        <p className="text-sm text-zinc-500 mt-1">Koçunun hazırladığı haftalık ders programı.</p>
      </div>

      {totalLessons === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <Calendar className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz program oluşturulmamış</h3>
          <p className="text-sm text-zinc-500">Koçun program eklediğinde burada görünecek.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((d) => {
            const rows = byDay[d.num] ?? []
            return (
              <div key={d.num} className="bg-white border border-zinc-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
                  <h3 className="font-semibold text-zinc-900">{d.label}</h3>
                  {rows.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {rows.length}
                    </Badge>
                  )}
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-3 text-center">Ders yok</p>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className="bg-zinc-50 rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-900 truncate">
                            {r.subjects?.name ?? r.custom_title ?? "—"}
                          </span>
                          <span className="text-xs text-[#1B6B8A] tabular-nums shrink-0">
                            {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                          </span>
                        </div>
                        {r.notes && (
                          <p className="text-xs text-zinc-500 mt-1 truncate">{r.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
