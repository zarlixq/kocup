import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText } from "lucide-react"
import { formatDate } from "@/lib/format"

const examTypeLabel: Record<string, string> = {
  tyt: "TYT",
  ayt: "AYT",
  tyt_ayt: "TYT + AYT",
}

export default async function MudurStudentDenemelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, exam_results(net)")
    .eq("student_id", id)
    .order("date", { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Deneme Sonuçları</h2>

      {!exams || exams.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <FileText className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Henüz deneme kaydı yok.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Deneme Adı</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Toplam Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => {
                const totalNet = (e.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{examTypeLabel[e.exam_type] ?? e.exam_type}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{totalNet.toFixed(2)}</TableCell>
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
