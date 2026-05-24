import Link from "next/link"
import { Hash, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { DeleteSessionButton } from "@/components/ogrenci/delete-session-button"

export const metadata = { title: "Soru Çözüm — KoçUp" }

export default async function SoruCozumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, date, total_questions, correct, wrong, empty, duration_minutes, subjects(name)")
    .eq("student_id", user!.id)
    .order("date", { ascending: false })
    .limit(100)

  const totalQuestions = (sessions ?? []).reduce((s, r) => s + r.total_questions, 0)
  const totalCorrect = (sessions ?? []).reduce((s, r) => s + r.correct, 0)
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Soru Çözüm</h1>
          <p className="text-sm text-zinc-500 mt-1">Günlük çalışma kayıtların.</p>
        </div>
        <Link href="/ogrenci/soru-cozum/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Yeni Kayıt
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Toplam Soru</div>
          <div className="text-xl font-bold text-zinc-900 tabular-nums">{totalQuestions.toLocaleString("tr-TR")}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Toplam Doğru</div>
          <div className="text-xl font-bold text-green-600 tabular-nums">{totalCorrect.toLocaleString("tr-TR")}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Başarı</div>
          <div className="text-xl font-bold text-[#1B6B8A] tabular-nums">%{successRate}</div>
        </div>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <Hash className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz kayıt yok</h3>
          <p className="text-sm text-zinc-500 mb-5">İlk soru çözüm kaydını ekle.</p>
          <Link href="/ogrenci/soru-cozum/yeni">
            <Button variant="accent">
              <Plus className="h-4 w-4" /> Yeni Kayıt
            </Button>
          </Link>
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
                <TableHead className="text-right">Süre</TableHead>
                <TableHead></TableHead>
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
                  <TableCell>
                    <DeleteSessionButton sessionId={s.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
