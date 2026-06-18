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
import { createSessionAction } from "@/app/ogrenci/soru-cozum/actions"

type Subject = { id: string; name: string; exam_type: string | null }

export function SessionForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter()
  const [subjectId, setSubjectId] = useState("")
  const [correct, setCorrect] = useState("")
  const [wrong, setWrong] = useState("")
  const [empty, setEmpty] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const today = isoDate(new Date())

  const total = useMemo(
    () => (Number(correct) || 0) + (Number(wrong) || 0) + (Number(empty) || 0),
    [correct, wrong, empty]
  )

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.exam_type !== b.exam_type) return a.exam_type === "tyt" ? -1 : 1
    return a.name.localeCompare(b.name, "tr")
  })

  return (
    <form
      action={(fd) => {
        setError(null)
        if (!subjectId) {
          setError("Ders seçmelisin.")
          return
        }
        fd.set("subject_id", subjectId)
        start(async () => {
          const res = await createSessionAction(fd)
          if (res?.error) {
            setError(res.error)
            toast.error(res.error)
          }
        })
      }}
      className="space-y-5"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Ders *</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Ders seç..." />
            </SelectTrigger>
            <SelectContent>
              {sortedSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.exam_type ? `${s.exam_type.toUpperCase()} · ` : ""}{s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Tarih *</Label>
          <Input id="date" name="date" type="date" required defaultValue={today} max={today} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="correct">Doğru *</Label>
          <Input
            id="correct"
            name="correct"
            type="number"
            min="0"
            required
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            className="text-center text-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wrong">Yanlış *</Label>
          <Input
            id="wrong"
            name="wrong"
            type="number"
            min="0"
            required
            value={wrong}
            onChange={(e) => setWrong(e.target.value)}
            className="text-center text-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="empty">Boş *</Label>
          <Input
            id="empty"
            name="empty"
            type="number"
            min="0"
            required
            value={empty}
            onChange={(e) => setEmpty(e.target.value)}
            className="text-center text-lg"
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
        <span className="text-sm text-zinc-600">Toplam soru</span>
        <span className="text-xl font-bold text-zinc-900 tabular-nums">{total}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="duration_minutes">Süre (dakika, opsiyonel)</Label>
        <Input id="duration_minutes" name="duration_minutes" type="number" min="0" placeholder="ör. 45" />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          İptal
        </Button>
      </div>
    </form>
  )
}
