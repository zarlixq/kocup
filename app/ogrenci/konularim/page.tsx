import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TopicStatusSelect } from "@/components/ogrenci/topic-status-select"
import { BookOpen, Target } from "lucide-react"
import {
  AssignmentsCardGrid,
  type StudentAssignmentRow,
} from "@/components/konu-analizi/assignments-card-grid"

export const metadata = { title: "Konularım — KoçUp" }

const STATUS_ORDER: Record<string, number> = { devam: 0, tekrar: 1, basla: 2, tamam: 3 }

export default async function KonularimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: topics },
    { data: assignments },
    { data: progressAgg },
  ] = await Promise.all([
    supabase
      .from("student_topics")
      .select(
        "id, status, notes, custom_name, topics(name, subjects(name)), custom_subject_id, subjects:custom_subject_id(name)"
      )
      .eq("student_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("topic_assignments")
      .select(
        "id, hedef_soru, hedef_sure_dk, son_tarih, notes, status, coach_id, topics(name, subjects(name))",
      )
      .eq("student_id", user!.id),
    supabase
      .from("study_sessions")
      .select("assignment_id, total_questions, correct, duration_minutes")
      .eq("student_id", user!.id)
      .not("assignment_id", "is", null),
  ])

  // Koç adlarını çek
  const coachIds = Array.from(new Set((assignments ?? []).map((a) => a.coach_id)))
  const { data: coaches } = coachIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", coachIds)
    : { data: [] as Array<{ id: string; full_name: string }> }
  const coachById = new Map((coaches ?? []).map((c) => [c.id, c.full_name]))

  const progressByAsg = new Map<string, { cozulen: number; dogru: number; sure: number }>()
  for (const p of progressAgg ?? []) {
    if (!p.assignment_id) continue
    const cur = progressByAsg.get(p.assignment_id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    cur.cozulen += p.total_questions ?? 0
    cur.dogru += p.correct ?? 0
    cur.sure += p.duration_minutes ?? 0
    progressByAsg.set(p.assignment_id, cur)
  }

  const assignmentRows: StudentAssignmentRow[] = (assignments ?? []).map((a) => {
    const prog = progressByAsg.get(a.id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    return {
      id: a.id,
      topic_name: a.topics?.name ?? "—",
      subject_name: a.topics?.subjects?.name ?? "—",
      hedef_soru: a.hedef_soru,
      hedef_sure_dk: a.hedef_sure_dk,
      son_tarih: a.son_tarih,
      notes: a.notes,
      status: a.status,
      cozulen_soru: prog.cozulen,
      dogru_sayisi: prog.dogru,
      toplam_sure_dk: prog.sure,
      coach_name: coachById.get(a.coach_id) ?? null,
    }
  })

  // Eski student_topics (basit durum)
  const sorted = (topics ?? []).slice().sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
  const counts = { basla: 0, devam: 0, tamam: 0, tekrar: 0 }
  for (const t of topics ?? []) {
    if (t.status in counts) counts[t.status as keyof typeof counts]++
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Konularım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Hedefli atamaların ve genel konu durumun.
        </p>
      </div>

      {/* Hedefli atamalar (yeni) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#F97316]" />
          <h2 className="text-lg font-semibold text-zinc-900">Hedefli Atamalarım</h2>
        </div>
        <AssignmentsCardGrid rows={assignmentRows} />
      </section>

      {/* Basit konu durumu (mevcut korunur) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-[#1B6B8A]" />
          <h2 className="text-lg font-semibold text-zinc-900">Konu Durumum</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Pill label="Başla" count={counts.basla} variant="outline" />
          <Pill label="Devam" count={counts.devam} variant="partial" />
          <Pill label="Tamam" count={counts.tamam} variant="paid" />
          <Pill label="Tekrar" count={counts.tekrar} variant="pending" />
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <BookOpen className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Konu durumu boş</h3>
            <p className="text-sm text-zinc-500">Koçun konu işaretlemesi yapınca burada görünecek.</p>
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
      </section>
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
