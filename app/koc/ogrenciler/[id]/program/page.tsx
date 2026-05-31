import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar } from "lucide-react"
import { ScheduleFormDialog } from "@/components/koc/schedule-form-dialog"
import { ScheduleRowActions } from "@/components/koc/schedule-row-actions"

const dayLabel: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
}

export default async function StudentProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: schedule }, { data: subjects }, { data: student }] = await Promise.all([
    supabase
      .from("schedule")
      .select("id, term, day_of_week, start_time, end_time, subject_id, custom_title, notes, subjects(name)")
      .eq("student_id", id)
      .order("term")
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("subjects")
      .select("id, name, exam_type, order")
      .order("exam_type", { ascending: true, nullsFirst: true })
      .order("order"),
    supabase.from("students").select("grade").eq("id", id).maybeSingle(),
  ])

  const rows = schedule ?? []
  const subjectOptions = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    exam_type: s.exam_type,
  }))

  // 8. sınıf altı LGS, 9+ YKS — okul/etüt diğer kategorisinde
  const studentGrade = student?.grade
  const filteredSubjects = subjectOptions.filter((s) => {
    if (!studentGrade) return true
    const isLgs = studentGrade === "7" || studentGrade === "8"
    if (s.exam_type === "lgs") return isLgs
    if (s.exam_type === "tyt" || s.exam_type === "ayt") return !isLgs
    return true // okul, diğer
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Haftalık Ders Programı</h2>
        <ScheduleFormDialog
          studentId={id}
          subjects={filteredSubjects}
          trigger={
            <Button variant="accent" size="sm">
              <Plus className="h-4 w-4" /> Yeni Ders
            </Button>
          }
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz program oluşturulmadı</h3>
          <p className="text-sm text-zinc-500 mb-5">İlk dersi ekleyerek başla.</p>
          <ScheduleFormDialog
            studentId={id}
            subjects={filteredSubjects}
            trigger={
              <Button variant="accent">
                <Plus className="h-4 w-4" /> Yeni Ders Ekle
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dönem</TableHead>
                <TableHead>Gün</TableHead>
                <TableHead>Saat</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="text-right w-24">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const title = row.subjects?.name ?? row.custom_title ?? "—"
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline">{row.term === 1 ? "1. Dönem" : "2. Dönem"}</Badge>
                    </TableCell>
                    <TableCell>{dayLabel[row.day_of_week] ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell className="font-medium">{title}</TableCell>
                    <TableCell className="text-zinc-600 max-w-[240px] truncate">
                      {row.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ScheduleRowActions
                        studentId={id}
                        subjects={filteredSubjects}
                        entry={{
                          id: row.id,
                          term: row.term,
                          day_of_week: row.day_of_week,
                          start_time: row.start_time,
                          end_time: row.end_time,
                          subject_id: row.subject_id,
                          custom_title: row.custom_title,
                          notes: row.notes,
                          displayTitle: title,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
