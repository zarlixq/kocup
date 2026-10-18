import { CalendarPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { WeeklyProgramBoard, type ProgramItem } from "@/components/program/weekly-program-board"
import { StudentComplianceCard } from "@/components/analytics/student-compliance-card"
import { isValidWeekStartParam } from "@/lib/week"
import { istanbulWeekStartStr } from "@/lib/tz"
import { mapProgramItem, PROGRAM_ITEM_COLUMNS, type RawProgramItem } from "@/lib/program/map-item"
import { filterProgramSubjects } from "@/lib/program/subjects"
import { getStudentComplianceHistory } from "@/lib/analytics/compliance"
import { getStudentContext } from "@/lib/ogrenci/context"

export const metadata = { title: "Program — KoçUp" }

type SearchParams = { hafta?: string }

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const weekStart = isValidWeekStartParam(sp.hafta) ? sp.hafta : istanbulWeekStartStr()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: program }, { data: subjects }, { data: topics }, ctx, history] = await Promise.all([
    supabase
      .from("weekly_programs")
      .select(`id, weekly_program_items(${PROGRAM_ITEM_COLUMNS})`)
      .eq("student_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("id, name, exam_type, grade, order")
      .order("exam_type", { ascending: true, nullsFirst: true })
      .order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
    getStudentContext(supabase, userId),
    // Görüntülenen haftayla biten son 4 hafta (geçmiş haftalara bakarken de anlamlı).
    getStudentComplianceHistory(supabase, userId, 4, weekStart),
  ])

  const items: ProgramItem[] = ((program?.weekly_program_items ?? []) as RawProgramItem[]).map(mapProgramItem)
  const hasCoachItems = items.some((i) => i.created_by_role === "coach")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Haftalık Program</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {ctx.coachId
            ? "Koçunun ve senin eklediğin kalemler. Kendi kalemlerini düzenleyebilir, koçunun kalemlerini tamamlandı işaretleyebilirsin."
            : "Haftanı kendin planla: gün ve saat blokları ekle, yaptıkça işaretle."}
        </p>
      </div>

      <StudentComplianceCard history={history} href={`/ogrenci/program?hafta=${weekStart}`} emptyCta="Aşağıdan ilk kalemi ekle" />

      {items.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-3">
          <CalendarPlus className="mt-0.5 h-5 w-5 shrink-0 text-[#F97316]" />
          <div className="text-sm">
            <div className="font-medium text-zinc-900">Bu hafta programın boş</div>
            <div className="text-zinc-600">
              {ctx.coachId
                ? "Koçun kalem eklediğinde burada görünür; beklemeden kendi kalemlerini de ekleyebilirsin."
                : "Bir güne dokunup “Ekle” ile ders, konu, saat ve hedef soru sayısı gir."}
            </div>
          </div>
        </div>
      )}

      <WeeklyProgramBoard
        weekStart={weekStart}
        items={items}
        mode="student"
        baseHref="/ogrenci/program"
        subjects={filterProgramSubjects(subjects ?? [], ctx.grade)}
        topics={topics ?? []}
      />

      {hasCoachItems && (
        <p className="text-xs text-zinc-400">
          Kilit simgeli kalemleri koçun ekledi; bunları yalnızca tamamlandı olarak işaretleyebilirsin.
        </p>
      )}
    </div>
  )
}
