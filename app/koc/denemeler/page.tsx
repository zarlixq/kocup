import { createClient } from "@/lib/supabase/server"
import { ExamsListView, type ExamListItem } from "@/components/denemeler/exams-list-view"

export const metadata = { title: "Denemeler — KoçUp" }

export default async function KocDenemelerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bu koçun aktif öğrencileri
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("coach_id", user!.id)
  const studentIds = (students ?? []).map((s) => s.id)

  if (studentIds.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-zinc-900">Denemeler</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm öğrencilerinin deneme kayıtları.</p>
        </header>
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Henüz atanan öğrencin yok.
        </div>
      </div>
    )
  }

  const [{ data: exams }, { data: profiles }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, name, exam_type, date, siralama, student_id, exam_results(net)")
      .in("student_id", studentIds)
      .order("date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
  ])

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const studentOptions = (profiles ?? [])
    .map((p) => ({ id: p.id, full_name: p.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))

  const items: ExamListItem[] = (exams ?? []).map((e) => {
    const toplam = (e.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
    return {
      id: e.id,
      student_id: e.student_id,
      student_name: nameById.get(e.student_id) ?? "—",
      name: e.name,
      exam_type: e.exam_type,
      date: e.date,
      toplam_net: toplam,
      siralama: e.siralama ?? null,
      detail_href: `/koc/ogrenciler/${e.student_id}/denemeler`,
    }
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Denemeler</h1>
        <p className="text-sm text-zinc-500 mt-1">Tüm öğrencilerinin deneme kayıtları.</p>
      </header>

      <ExamsListView exams={items} students={studentOptions} />
    </div>
  )
}
