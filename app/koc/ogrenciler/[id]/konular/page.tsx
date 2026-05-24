import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen } from "lucide-react"

const statusLabel: Record<string, string> = {
  basla: "Başla",
  devam: "Devam",
  tamam: "Tamam",
  tekrar: "Tekrar",
}

export default async function StudentKonularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from("student_topics")
    .select("id, status, notes, custom_name, topic_id, custom_subject_id, topics(name, subjects(name))")
    .eq("student_id", id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Konu Takibi</h2>
        <Button variant="accent" size="sm" disabled>
          <Plus className="h-4 w-4" /> Yeni Konu
        </Button>
      </div>

      {!topics || topics.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz konu atanmamış</h3>
          <p className="text-sm text-zinc-500">Müfredat ekleme özelliği yakında.</p>
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
