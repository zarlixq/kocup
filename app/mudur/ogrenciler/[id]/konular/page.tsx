import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookOpen } from "lucide-react"

const statusLabel: Record<string, string> = {
  basla: "Başla",
  devam: "Devam",
  tamam: "Tamam",
  tekrar: "Tekrar",
}

export default async function MudurStudentKonularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from("student_topics")
    .select("id, status, notes, custom_name, topics(name, subjects(name))")
    .eq("student_id", id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Konu Takibi</h2>

      {!topics || topics.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <BookOpen className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Henüz konu atanmamış.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Konu</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.topics?.name ?? t.custom_name ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600">{t.topics?.subjects?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "tamam" ? "paid" : t.status === "devam" ? "partial" : "outline"}>
                      {statusLabel[t.status] ?? t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-600 max-w-[280px] truncate">{t.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
