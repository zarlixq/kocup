import { Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  KocKonuAnaliziView,
  type AssignmentRow,
} from "@/components/konu-analizi/koc-konu-analizi-view"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"

export const metadata = { title: "Konu Analizi — Müdür" }

export default async function MudurKonuAnaliziPage() {
  const supabase = await createClient()

  const [
    assignments,
    { data: students },
    { data: subjects },
    { data: topics },
  ] = await Promise.all([
    loadAssignmentsWithProgress(supabase),
    supabase
      .from("students")
      .select("id, is_active")
      .eq("is_active", true),
    supabase.from("subjects").select("id, name, exam_type, order").order("exam_type").order("order"),
    supabase.from("topics").select("id, subject_id, name, order").order("order"),
  ])

  const studentIds = Array.from(
    new Set([
      ...(students ?? []).map((s) => s.id),
      ...assignments.map((a) => a.student_id),
    ]),
  )

  const { data: profiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as Array<{ id: string; full_name: string }> }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const rows: AssignmentRow[] = assignments.map((a) => ({
    ...a,
    student_name: nameById.get(a.student_id) ?? "—",
  }))

  const activeStudents = (students ?? [])
    .map((s) => ({ id: s.id, full_name: nameById.get(s.id) ?? "—" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Konu Analizi</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Sistemdeki tüm koç atamalarını ve öğrencilerin kendi hedeflerini görüntüle.
        </p>
      </header>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm">
        <Eye className="h-4 w-4 text-blue-700 shrink-0" />
        <div className="text-blue-900">
          <span className="font-medium">Sadece görüntüleme.</span>{" "}
          Atamalar koçun panelinden yönetilir.
        </div>
      </div>

      <KocKonuAnaliziView
        rows={rows}
        students={activeStudents}
        subjects={subjects ?? []}
        topics={topics ?? []}
        canManage={false}
        studentHrefBase="/mudur/ogrenciler"
      />
    </div>
  )
}
