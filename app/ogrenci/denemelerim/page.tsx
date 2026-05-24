import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Denemelerim — KoçUp" }

const examTypeLabel: Record<string, string> = {
  tyt: "TYT",
  ayt: "AYT",
  tyt_ayt: "TYT+AYT",
}

export default async function DenemelerimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, date, exam_results(net)")
    .eq("student_id", user!.id)
    .order("date", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Denemelerim</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm deneme sonuçların.</p>
        </div>
        <Link href="/ogrenci/denemelerim/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Yeni Deneme
          </Button>
        </Link>
      </div>

      {!exams || exams.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <FileText className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz deneme yok</h3>
          <p className="text-sm text-zinc-500 mb-5">İlk deneme sonucunu kaydet.</p>
          <Link href="/ogrenci/denemelerim/yeni">
            <Button variant="accent">
              <Plus className="h-4 w-4" /> Yeni Deneme
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Deneme</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Ders Sayısı</TableHead>
                <TableHead className="text-right">Toplam Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => {
                const totalNet = (e.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                    <TableCell>
                      <Link href={`/ogrenci/denemelerim/${e.id}`} className="font-medium hover:text-[#1B6B8A]">
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{examTypeLabel[e.exam_type] ?? e.exam_type}</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-600">{(e.exam_results ?? []).length}</TableCell>
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
