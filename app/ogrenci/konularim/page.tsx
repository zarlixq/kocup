import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TopicStatusSelect } from "@/components/ogrenci/topic-status-select"
import { BookOpen } from "lucide-react"

export const metadata = { title: "Konularım — KoçUp" }

const STATUS_ORDER: Record<string, number> = { devam: 0, tekrar: 1, basla: 2, tamam: 3 }

export default async function KonularimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: topics } = await supabase
    .from("student_topics")
    .select(
      "id, status, notes, custom_name, topics(name, subjects(name)), custom_subject_id, subjects:custom_subject_id(name)"
    )
    .eq("student_id", user!.id)
    .order("created_at", { ascending: false })

  // Sıralamayı statüye göre yap (devam > tekrar > basla > tamam)
  const sorted = (topics ?? []).slice().sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))

  // Stats
  const counts = { basla: 0, devam: 0, tamam: 0, tekrar: 0 }
  for (const t of topics ?? []) {
    if (t.status in counts) counts[t.status as keyof typeof counts]++
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Konularım</h1>
        <p className="text-sm text-zinc-500 mt-1">Koçunun atadığı konular. Çalışma durumunu güncelle.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Pill label="Başla" count={counts.basla} variant="outline" />
        <Pill label="Devam" count={counts.devam} variant="partial" />
        <Pill label="Tamam" count={counts.tamam} variant="paid" />
        <Pill label="Tekrar" count={counts.tekrar} variant="pending" />
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <BookOpen className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz konu atanmamış</h3>
          <p className="text-sm text-zinc-500">Koçun konu atadığında burada görünecek.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Konu</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="text-right">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t) => {
                const subject = t.topics?.subjects?.name ?? t.subjects?.name ?? "—"
                const name = t.topics?.name ?? t.custom_name ?? "—"
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-zinc-600">{subject}</TableCell>
                    <TableCell className="text-zinc-600 max-w-[280px] truncate">{t.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex">
                        <TopicStatusSelect topicId={t.id} status={t.status} />
                      </div>
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

function Pill({
  label,
  count,
  variant,
}: {
  label: string
  count: number
  variant: "paid" | "partial" | "pending" | "outline"
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
      <span className="text-sm text-zinc-600">{label}</span>
      <Badge variant={variant}>{count}</Badge>
    </div>
  )
}
