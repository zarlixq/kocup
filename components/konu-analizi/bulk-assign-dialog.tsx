"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Layers, Loader2, Search } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { SelectItem } from "@/components/ui/select"
import { bulkAssign } from "@/app/koc/konu-analizi/actions"
import { CurriculumSwitch, useCurriculumTopics } from "@/components/konular/curriculum-picker"
import { SubjectSelect } from "@/components/konular/subject-select"
import type { CurriculumData, CurriculumKey } from "@/lib/curriculum/topics"

type Student = { id: string; full_name: string }

function nextWeekIso() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  students,
  curriculumData,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  curriculumData: CurriculumData
}) {
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set())
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set())
  const [topicFilter, setTopicFilter] = useState<string>("")
  const [topicSubjectFilter, setTopicSubjectFilter] = useState<string>("all")
  const [hedefSoru, setHedefSoru] = useState<string>("100")
  const [hedefSure, setHedefSure] = useState<string>("")
  const [sonTarih, setSonTarih] = useState<string>(nextWeekIso)
  const [notes, setNotes] = useState<string>("")
  const [pending, startTransition] = useTransition()

  const { curriculum, setCurriculum, subjects, topics, maarifEmpty } =
    useCurriculumTopics(curriculumData)

  // Aktif müfredattaki konuları ders adıyla zenginleştir.
  const topicsWithSubject = useMemo(() => {
    const subjMap = new Map(subjects.map((s) => [s.id, s.name]))
    return topics.map((t) => ({ ...t, subject_name: subjMap.get(t.subject_id) ?? "—" }))
  }, [subjects, topics])

  // Müfredat değişince konu seçimi ve filtreleri sıfırla (öğrenci seçimi korunur).
  function handleCurriculumChange(next: CurriculumKey) {
    setCurriculum(next)
    setTopicIds(new Set())
    setTopicFilter("")
    setTopicSubjectFilter("all")
  }

  const visibleTopics = useMemo(() => {
    const q = topicFilter.toLowerCase()
    return topicsWithSubject.filter((t) => {
      if (topicSubjectFilter !== "all" && t.subject_id !== topicSubjectFilter) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.subject_name.toLowerCase().includes(q))
        return false
      return true
    })
  }, [topicsWithSubject, topicFilter, topicSubjectFilter])

  function toggleStudent(id: string) {
    setStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTopic(id: string) {
    setTopicIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllStudents() {
    setStudentIds(new Set(students.map((s) => s.id)))
  }

  function clearAllStudents() {
    setStudentIds(new Set())
  }

  function handleSubmit() {
    if (studentIds.size === 0) return toast.error("En az 1 öğrenci seçin")
    if (topicIds.size === 0) return toast.error("En az 1 konu seçin")
    const hedef = Number(hedefSoru)
    if (!Number.isInteger(hedef) || hedef <= 0) return toast.error("Geçerli hedef girin")

    startTransition(async () => {
      const res = await bulkAssign({
        student_ids: Array.from(studentIds),
        topic_ids: Array.from(topicIds),
        hedef_soru: hedef,
        hedef_sure_dk: hedefSure.trim() ? Math.max(1, Number(hedefSure)) : null,
        son_tarih: sonTarih,
        notes: notes.trim() || null,
      })
      if (!res.success) {
        toast.error(res.error ?? "Atanamadı")
        return
      }
      toast.success(`✅ ${res.data?.created ?? 0} atama oluşturuldu`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#F97316]" />
            Toplu Konu Atama
          </DialogTitle>
          <DialogDescription>
            Seçtiğin tüm öğrencilere seçtiğin tüm konuları aynı hedef ve tarih ile tek seferde ata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <CurriculumSwitch value={curriculum} onChange={handleCurriculumChange} />

          {/* Öğrenciler */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Öğrenciler ({studentIds.size}/{students.length})</Label>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={selectAllStudents}>
                  Tümü
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAllStudents}>
                  Temizle
                </Button>
              </div>
            </div>
            <div className="border border-zinc-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-zinc-100">
              {students.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500 text-center">
                  Aktif öğrencin yok.
                </div>
              ) : (
                students.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-50"
                  >
                    <Checkbox
                      checked={studentIds.has(s.id)}
                      onCheckedChange={() => toggleStudent(s.id)}
                    />
                    <span className="text-sm">{s.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Konular */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Konular ({topicIds.size} seçili)</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 mb-2">
              <SubjectSelect
                subjects={subjects}
                value={topicSubjectFilter}
                onValueChange={setTopicSubjectFilter}
                placeholder="Tüm dersler"
                leading={<SelectItem value="all">Tüm dersler</SelectItem>}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="Konu ara..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="border border-zinc-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-zinc-100">
              {visibleTopics.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500 text-center">
                  {maarifEmpty
                    ? "Henüz Maarif konusu eklenmedi."
                    : "Filtreyle eşleşen konu yok."}
                </div>
              ) : (
                visibleTopics.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-50"
                  >
                    <Checkbox
                      checked={topicIds.has(t.id)}
                      onCheckedChange={() => toggleTopic(t.id)}
                    />
                    <span className="text-sm flex-1">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {t.subject_name}
                    </Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Hedef ve tarih */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-hedef">Hedef Soru</Label>
              <Input
                id="bulk-hedef"
                type="number"
                min="1"
                value={hedefSoru}
                onChange={(e) => setHedefSoru(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-sure">Hedef Süre (dk)</Label>
              <Input
                id="bulk-sure"
                type="number"
                min="1"
                value={hedefSure}
                onChange={(e) => setHedefSure(e.target.value)}
                placeholder="opsiyonel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-tarih">Son Tarih</Label>
              <Input
                id="bulk-tarih"
                type="date"
                value={sonTarih}
                onChange={(e) => setSonTarih(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-not">Ortak Not (opsiyonel)</Label>
            <Textarea
              id="bulk-not"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <strong>{studentIds.size}</strong> öğrenci × <strong>{topicIds.size}</strong> konu ={" "}
            <strong>{studentIds.size * topicIds.size}</strong> atama oluşturulacak.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Toplu Ata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
