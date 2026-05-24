import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, FileText } from "lucide-react"
import { formatDate } from "@/lib/format"

const examTypeLabel: Record<string, string> = {
  tyt: "TYT",
  ayt: "AYT",
  tyt_ayt: "TYT + AYT",
}

export default async function StudentDenemelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, exam_results(net, subjects(name))")
    .eq("student_id", id)
    .order("date", { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Deneme Sonuçları</h2>
        <Button variant="accent" size="sm" disabled>
          <Plus className="h-4 w-4" /> Yeni Deneme
        </Button>
      </div>

      {!exams || exams.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz deneme kaydı yok</h3>
          <p className="text-sm text-zinc-500">Deneme ekleme özelliği yakında.</p>
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
