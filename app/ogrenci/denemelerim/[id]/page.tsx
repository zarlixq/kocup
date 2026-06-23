import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { DeleteExamButton } from "@/components/ogrenci/delete-exam-button"
import { ExamPdfButton } from "@/components/denemeler/exam-pdf-button"

const examTypeLabel: Record<string, string> = {
  tyt: "TYT",
  ayt: "AYT",
  tyt_ayt: "TYT + AYT",
}

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exam } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, student_id, pdf_path, exam_results(id, correct, wrong, empty, net, subjects(name))")
    .eq("id", id)
    .eq("student_id", user!.id)
    .maybeSingle()

  if (!exam) notFound()

  const totalNet = (exam.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
  const totalCorrect = (exam.exam_results ?? []).reduce((s, r) => s + r.correct, 0)
  const totalWrong = (exam.exam_results ?? []).reduce((s, r) => s + r.wrong, 0)
  const totalEmpty = (exam.exam_results ?? []).reduce((s, r) => s + r.empty, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/ogrenci/denemelerim"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Denemelerim
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              {exam.name}
              <Badge variant="outline">{examTypeLabel[exam.exam_type] ?? exam.exam_type}</Badge>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{formatDate(exam.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            {exam.pdf_path && <ExamPdfButton examId={exam.id} />}
            <DeleteExamButton examId={exam.id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Toplam Net" value={totalNet.toFixed(2)} color="text-[#1B6B8A]" />
        <StatCard label="Doğru" value={String(totalCorrect)} color="text-green-600" />
        <StatCard label="Yanlış" value={String(totalWrong)} color="text-red-600" />
        <StatCard label="Boş" value={String(totalEmpty)} color="text-zinc-500" />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ders</TableHead>
              <TableHead className="text-right">Doğru</TableHead>
              <TableHead className="text-right">Yanlış</TableHead>
              <TableHead className="text-right">Boş</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(exam.exam_results ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.subjects?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-green-600">{r.correct}</TableCell>
                <TableCell className="text-right tabular-nums text-red-600">{r.wrong}</TableCell>
                <TableCell className="text-right tabular-nums text-zinc-500">{r.empty}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{Number(r.net ?? 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
