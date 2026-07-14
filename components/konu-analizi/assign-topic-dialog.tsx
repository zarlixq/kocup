"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { BookOpen, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAssignment } from "@/app/koc/konu-analizi/actions"
import { gradeToExamTypes } from "@/lib/exam-target"
import { CurriculumSwitch, useCurriculumTopics } from "@/components/konular/curriculum-picker"
import { SubjectSelect } from "@/components/konular/subject-select"
import type { CurriculumData, CurriculumKey } from "@/lib/curriculum/topics"

type Student = { id: string; full_name: string; grade?: string | null }

function nextWeekIso() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function AssignTopicDialog({
  open,
  onOpenChange,
  students,
  curriculumData,
  defaultStudentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  curriculumData: CurriculumData
  defaultStudentId?: string
}) {
  const [studentId, setStudentId] = useState<string>(defaultStudentId ?? "")
  const [subjectId, setSubjectId] = useState<string>("")
  const [topicId, setTopicId] = useState<string>("")
  const [hedefSoru, setHedefSoru] = useState<string>("100")
  const [hedefSure, setHedefSure] = useState<string>("")
  const [sonTarih, setSonTarih] = useState<string>(nextWeekIso)
  const [notes, setNotes] = useState<string>("")
  const [pending, startTransition] = useTransition()

  const { curriculum, setCurriculum, isMaarif, subjects, topics, maarifEmpty } =
    useCurriculumTopics(curriculumData)

  function handleCurriculumChange(next: CurriculumKey) {
    setCurriculum(next)
    setSubjectId("")
    setTopicId("")
  }

  // Seçili öğrencinin sınıfına göre uygun ders türleri (LGS / YKS)
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  )

  const allowedExamTypes = useMemo(
    () => new Set(gradeToExamTypes(selectedStudent?.grade)),
    [selectedStudent?.grade],
  )

  // Normal düzende exam_type filtresi (okul/null her zaman gösterilir).
  // Maarif düzeninde exam_type filtresi UYGULANMAZ — her sınıfa açık.
  const subjectOptions = useMemo(() => {
    if (isMaarif) return subjects
    return subjects.filter((s) => {
      if (!s.exam_type) return true
      if (s.exam_type === "okul") return true
      return allowedExamTypes.has(s.exam_type as "tyt" | "ayt" | "lgs")
    })
  }, [subjects, isMaarif, allowedExamTypes])

  const topicOptions = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId],
  )

  function handleSubmit() {
    if (!studentId) return toast.error("Öğrenci seçin")
    if (!topicId) return toast.error("Konu seçin")
    const hedef = Number(hedefSoru)
    if (!Number.isInteger(hedef) || hedef <= 0) return toast.error("Geçerli bir hedef girin")

    startTransition(async () => {
      const res = await createAssignment({
        student_id: studentId,
        topic_id: topicId,
        hedef_soru: hedef,
        hedef_sure_dk: hedefSure.trim() ? Math.max(1, Number(hedefSure)) : null,
        son_tarih: sonTarih,
        notes: notes.trim() || null,
      })
      if (!res.success) {
        toast.error(res.error ?? "Atanamadı")
        return
      }
      toast.success("✅ Konu atandı")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#1B6B8A]" />
            Yeni Konu Ata
          </DialogTitle>
          <DialogDescription>
            Öğrenciye hedef soru sayısı ve son tarih ile konu atayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CurriculumSwitch value={curriculum} onChange={handleCurriculumChange} />

          {isMaarif && maarifEmpty && (
            <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md px-3 py-2">
              Henüz Maarif konusu eklenmedi.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Öğrenci</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Seç" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ders</Label>
              <SubjectSelect
                subjects={subjectOptions}
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v)
                  setTopicId("")
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Konu</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={subjectId ? "Konu seç" : "Önce ders"} />
                </SelectTrigger>
                <SelectContent>
                  {topicOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-500">
                      Bu ders için konu yok
                    </div>
                  ) : (
                    topicOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hedef-soru">Hedef Soru</Label>
              <Input
                id="hedef-soru"
                type="number"
                min="1"
                value={hedefSoru}
                onChange={(e) => setHedefSoru(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hedef-sure">Hedef Süre (dk, opsiyonel)</Label>
              <Input
                id="hedef-sure"
                type="number"
                min="1"
                value={hedefSure}
                onChange={(e) => setHedefSure(e.target.value)}
                placeholder="ör. 120"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="son-tarih">Son Tarih</Label>
            <Input
              id="son-tarih"
              type="date"
              value={sonTarih}
              onChange={(e) => setSonTarih(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="not">Not (opsiyonel)</Label>
            <Textarea
              id="not"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Öğrenciye iletmek istediklerin..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Konu Ata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
