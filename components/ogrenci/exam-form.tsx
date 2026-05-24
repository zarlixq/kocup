"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isoDate } from "@/lib/format"
import { createExamAction } from "@/app/ogrenci/denemelerim/actions"

type Subject = { id: string; name: string; exam_type: string }
type ExamType = "tyt" | "ayt" | "tyt_ayt"

type Row = { subject_id: string; correct: string; wrong: string; empty: string }

function net(correct: number, wrong: number) {
  return correct - wrong / 4
}

export function ExamForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter()
  const today = isoDate(new Date())
  const [name, setName] = useState("")
  const [examType, setExamType] = useState<ExamType>("tyt")
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const visibleSubjects = useMemo(() => {
    if (examType === "tyt") return subjects.filter((s) => s.exam_type === "tyt")
    if (examType === "ayt") return subjects.filter((s) => s.exam_type === "ayt")
    return subjects
  }, [subjects, examType])

  const [rows, setRows] = useState<Record<string, Row>>({})

  function setCell(subjectId: string, key: "correct" | "wrong" | "empty", value: string) {
    setRows((prev) => ({
      ...prev,
      [subjectId]: {
        subject_id: subjectId,
        correct: prev[subjectId]?.correct ?? "",
        wrong: prev[subjectId]?.wrong ?? "",
        empty: prev[subjectId]?.empty ?? "",
        [key]: value,
      },
    }))
  }

  const totalNet = useMemo(
    () =>
      Object.values(rows).reduce(
        (sum, r) => sum + net(Number(r.correct) || 0, Number(r.wrong) || 0),
        0
      ),
    [rows]
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Deneme adı zorunlu.")
      return
    }

    const results = Object.values(rows)
      .filter((r) => r.correct !== "" || r.wrong !== "" || r.empty !== "")
      .map((r) => ({
        subject_id: r.subject_id,
        correct: Math.max(0, Number(r.correct) || 0),
        wrong: Math.max(0, Number(r.wrong) || 0),
        empty: Math.max(0, Number(r.empty) || 0),
      }))

    if (results.length === 0) {
      setError("En az bir ders sonucu gir.")
      return
    }

    start(async () => {
      const res = await createExamAction({
        name: name.trim(),
        exam_type: examType,
        date,
        results,
      })
      if (res?.error) {
        setError(res.error)
        toast.error(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="name">Deneme Adı *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ör. 3D Yayınları TYT Deneme 12"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Tarih *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tip *</Label>
        <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
          <SelectTrigger className="w-full md:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tyt">TYT</SelectItem>
            <SelectItem value="ayt">AYT</SelectItem>
            <SelectItem value="tyt_ayt">TYT + AYT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Ders</th>
              <th className="text-center px-2 py-2 font-medium w-20">Doğru</th>
              <th className="text-center px-2 py-2 font-medium w-20">Yanlış</th>
              <th className="text-center px-2 py-2 font-medium w-20">Boş</th>
              <th className="text-right px-4 py-2 font-medium w-20">Net</th>
            </tr>
          </thead>
          <tbody>
            {visibleSubjects.map((s) => {
              const row = rows[s.id]
              const c = Number(row?.correct) || 0
              const w = Number(row?.wrong) || 0
              const n = net(c, w)
              return (
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-medium">
                    {s.name}
                    {s.exam_type === "ayt" && examType === "tyt_ayt" && (
                      <span className="text-xs text-zinc-400 ml-1">(AYT)</span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      value={row?.correct ?? ""}
                      onChange={(e) => setCell(s.id, "correct", e.target.value)}
                      className="h-8 text-center"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      value={row?.wrong ?? ""}
                      onChange={(e) => setCell(s.id, "wrong", e.target.value)}
                      className="h-8 text-center"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      value={row?.empty ?? ""}
                      onChange={(e) => setCell(s.id, "empty", e.target.value)}
                      className="h-8 text-center"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {c + w > 0 ? n.toFixed(2) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 border-t border-zinc-200">
              <td colSpan={4} className="px-4 py-2 text-right font-medium text-zinc-700">
                Toplam Net
              </td>
              <td className="px-4 py-2 text-right text-lg font-bold text-[#1B6B8A] tabular-nums">
                {totalNet.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Denemeyi Kaydet"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          İptal
        </Button>
      </div>
    </form>
  )
}
