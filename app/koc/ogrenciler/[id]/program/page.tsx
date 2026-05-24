import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Calendar } from "lucide-react"

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

  const { data: schedule } = await supabase
    .from("schedule")
    .select("id, term, day_of_week, start_time, end_time, custom_title, notes, subjects(name)")
    .eq("student_id", id)
    .order("day_of_week")
    .order("start_time")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Haftalık Ders Programı</h2>
        <Button variant="accent" size="sm" disabled>
          <Plus className="h-4 w-4" /> Yeni Ders
        </Button>
      </div>

      {!schedule || schedule.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz program oluşturulmamış</h3>
          <p className="text-sm text-zinc-500">Program ekleme özelliği yakında.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gün</TableHead>
                <TableHead>Saat</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Dönem</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{dayLabel[row.day_of_week] ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.subjects?.name ?? row.custom_title ?? "—"}
                  </TableCell>
                  <TableCell>{row.term === 1 ? "1. Dönem" : "2. Dönem"}</TableCell>
                  <TableCell className="text-zinc-600 max-w-[240px] truncate">{row.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
