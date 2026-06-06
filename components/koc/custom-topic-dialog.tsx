"use client"

import { useState, useTransition } from "react"
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
import { CurriculumSwitch, useCurriculumTopics } from "@/components/konular/curriculum-picker"
import type { CurriculumData, CurriculumKey } from "@/lib/curriculum/topics"

type Props = {
  studentId: string
  curriculumData: CurriculumData
}

export function CustomTopicDialog({ studentId, curriculumData }: Props) {
  const [open, setOpen] = useState(false)
  const { curriculum, setCurriculum, subjects, maarifEmpty } = useCurriculumTopics(curriculumData)
  const [subjectId, setSubjectId] = useState<string>(curriculumData.normal.subjects[0]?.id ?? "")
  const [name, setName] = useState("")
  const [pending, start] = useTransition()

  function handleCurriculumChange(next: CurriculumKey) {
    setCurriculum(next)
    const nextSubjects =
      next === "maarif" ? curriculumData.maarif.subjects : curriculumData.normal.subjects
    setSubjectId(nextSubjects[0]?.id ?? "")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) {
      toast.error("Ders seç.")
      return
    }
    if (name.trim().length < 2) {
      toast.error("Konu adı en az 2 karakter olmalı.")
      return
    }
    start(async () => {
      const res = await addCustomTopic(studentId, { subjectId, name: name.trim() })
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
          <CurriculumSwitch value={curriculum} onChange={handleCurriculumChange} />

          <div className="space-y-1.5">
            <Label>Ders</Label>
            {curriculum === "maarif" && maarifEmpty ? (
              <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-md px-3 py-2">
                Henüz Maarif konusu eklenmedi.
              </p>
            ) : (
              <Select value={subjectId} onValueChange={setSubjectId}>
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
