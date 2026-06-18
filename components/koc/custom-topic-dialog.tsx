"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addCustomTopic } from "@/app/koc/ogrenciler/[id]/konular/actions"
import {
  CurriculumSwitch,
  GradeLevelSwitch,
  useCurriculumTopics,
} from "@/components/konular/curriculum-picker"
import type { CurriculumData, CurriculumKey, GradeLevel } from "@/lib/curriculum/topics"

type Props = {
  studentId: string
  curriculumData: CurriculumData
}

export function CustomTopicDialog({ studentId, curriculumData }: Props) {
  const [open, setOpen] = useState(false)
  const { curriculum, setCurriculum, level, setLevel, subjects, maarifEmpty } =
    useCurriculumTopics(curriculumData, { levelFilter: true })
  const [subjectId, setSubjectId] = useState<string>("")
  const [name, setName] = useState("")
  const [pending, start] = useTransition()

  // Seçili düzen+seviyedeki ders listesi `subjects`. Seçili ders bu listede
  // yoksa ilk derse düş — manuel reset gerekmez.
  const effectiveSubjectId = useMemo(
    () => (subjects.some((s) => s.id === subjectId) ? subjectId : subjects[0]?.id ?? ""),
    [subjects, subjectId]
  )

  function handleCurriculumChange(next: CurriculumKey) {
    setCurriculum(next)
  }

  function handleLevelChange(next: GradeLevel) {
    setLevel(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveSubjectId) {
      toast.error("Ders seç.")
      return
    }
    if (name.trim().length < 2) {
      toast.error("Konu adı en az 2 karakter olmalı.")
      return
    }
    start(async () => {
      const res = await addCustomTopic(studentId, { subjectId: effectiveSubjectId, name: name.trim() })
      if (res.success) {
        toast.success("Özel konu eklendi.")
        setName("")
        setOpen(false)
      } else {
        toast.error(res.error ?? "Eklenemedi.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" /> Özel Konu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Özel Konu Ekle</DialogTitle>
          <DialogDescription>
            Müfredatta olmayan, öğrenciye özel bir konu ekle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CurriculumSwitch value={curriculum} onChange={handleCurriculumChange} />
            <GradeLevelSwitch value={level} onChange={handleLevelChange} />
          </div>

          <div className="space-y-1.5">
            <Label>Ders</Label>
            {curriculum === "maarif" && maarifEmpty ? (
              <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md px-3 py-2">
                Henüz Maarif konusu eklenmedi.
              </p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md px-3 py-2">
                Bu seviyede ders bulunamadı.
              </p>
            ) : (
              <Select value={effectiveSubjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ders seç" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-topic-name">Konu Adı</Label>
            <Input
              id="custom-topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ör. Karışım Problemleri"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
