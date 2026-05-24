import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Hash } from "lucide-react"
import { formatDate } from "@/lib/format"

export default async function MudurStudentSoruCozumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, date, total_questions, correct, wrong, empty, duration_minutes, subjects(name)")
    .eq("student_id", id)
    .order("date", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Soru Çözüm Geçmişi</h2>

      {!sessions || sessions.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <Hash className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Henüz soru çözüm kaydı yok.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead className="text-right">Doğru</TableHead>
                <TableHead className="text-right">Yanlış</TableHead>
                <TableHead className="text-right">Boş</TableHead>
                <TableHead className="text-right">Süre (dk)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.date)}</TableCell>
                  <TableCell className="font-medium">{s.subjects?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.total_questions}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">{s.correct}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">{s.wrong}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-500">{s.empty}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.duration_minutes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
