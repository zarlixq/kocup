import { Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ExamsListView, type ExamListItem } from "@/components/denemeler/exams-list-view"

export const metadata = { title: "Denemeler — Müdür" }

export default async function MudurDenemelerPage() {
  const supabase = await createClient()

  // Müdür tüm denemeleri görür (RLS admin)
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, siralama, student_id, pdf_path, exam_results(net)")
    .order("date", { ascending: false })

  const studentIds = Array.from(new Set((exams ?? []).map((e) => e.student_id)))

  const { data: profiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as Array<{ id: string; full_name: string }> }

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
      detail_href: `/mudur/ogrenciler/${e.student_id}/denemeler`,
      pdf_path: e.pdf_path ?? null,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Tüm Denemeler</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Sistemdeki tüm deneme kayıtlarını görüntüle.
        </p>
      </header>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm">
        <Eye className="h-4 w-4 text-blue-700 shrink-0" />
        <div className="text-blue-900">
          <span className="font-medium">Sadece görüntüleme.</span>{" "}
          Deneme ekleme/düzenleme koç ve öğrenci paneli üzerinden yapılır.
        </div>
      </div>

      <ExamsListView exams={items} students={studentOptions} />
    </div>
  )
}
