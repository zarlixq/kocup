"use client"

import { useMemo, useState, useTransition } from "react"
import { Search, Plus } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { SubjectSelect } from "@/components/konular/subject-select"
import { assignTopicsToStudent } from "@/app/koc/ogrenciler/[id]/konular/actions"
import {
  CurriculumSwitch,
  GradeLevelSwitch,
  useCurriculumTopics,
} from "@/components/konular/curriculum-picker"
import type { CurriculumData, CurriculumKey, GradeLevel } from "@/lib/curriculum/topics"

type Props = {
  studentId: string
  curriculumData: CurriculumData
  assignedTopicIds: string[]
}

export function AssignTopicsDialog({ studentId, curriculumData, assignedTopicIds }: Props) {
  const [open, setOpen] = useState(false)
  const { curriculum, setCurriculum, level, setLevel, subjects, topics, maarifEmpty, levelEmpty } =
    useCurriculumTopics(curriculumData, { levelFilter: true })
  const [subjectId, setSubjectId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()

  // Seçili düzen+seviyedeki ders listesi `subjects`. Seçili ders bu listede
  // yoksa (düzen/seviye değişti) ilk derse düş — manuel reset gerekmez.
  const effectiveSubjectId = useMemo(
    () => (subjects.some((s) => s.id === subjectId) ? subjectId : subjects[0]?.id ?? ""),
    [subjects, subjectId]
  )

  // Düzen/seviye değişince aramayı sıfırla (seçili konular id bazlı korunur).
  function handleCurriculumChange(next: CurriculumKey) {
    setCurriculum(next)
    setSearch("")
  }

  function handleLevelChange(next: GradeLevel) {
    setLevel(next)
    setSearch("")
  }

  const assignedSet = useMemo(() => new Set(assignedTopicIds), [assignedTopicIds])

  const visibleTopics = useMemo(() => {
    if (!effectiveSubjectId) return []
    const q = search.trim().toLocaleLowerCase("tr")
    return topics
      .filter((t) => t.subject_id === effectiveSubjectId)
      .filter((t) => (q ? t.name.toLocaleLowerCase("tr").includes(q) : true))
  }, [topics, effectiveSubjectId, search])

  const visibleSelectableIds = useMemo(
    () => visibleTopics.filter((t) => !assignedSet.has(t.id)).map((t) => t.id),
    [visibleTopics, assignedSet]
  )
  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selected.has(id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleSelectableIds) next.delete(id)
      } else {
        for (const id of visibleSelectableIds) next.add(id)
      }
      return next
    })
  }

  function handleClose(o: boolean) {
    setOpen(o)
    if (!o) {
      setSelected(new Set())
      setSearch("")
    }
  }

  function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Lütfen en az bir konu seç.")
      return
    }
    start(async () => {
      const res = await assignTopicsToStudent(studentId, { topicIds: Array.from(selected) })
      if (res.success) {
        toast.success(`${selected.size} konu atandı.`)
        handleClose(false)
      } else {
        toast.error(res.error ?? "Atama başarısız.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="accent">
          <Plus className="h-4 w-4" /> Konu Ata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Konu Ata</DialogTitle>
          <DialogDescription>
            Düzeni ve dersi seç, atamak istediğin konuları işaretle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CurriculumSwitch value={curriculum} onChange={handleCurriculumChange} />
          <GradeLevelSwitch value={level} onChange={handleLevelChange} />
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
          <div className="md:w-56 shrink-0 space-y-2">
            <Label>Ders</Label>
            <SubjectSelect
              subjects={subjects}
              value={effectiveSubjectId}
              onValueChange={setSubjectId}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Konu ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllVisible}
                disabled={visibleSelectableIds.length === 0}
              >
                {allVisibleSelected ? "Hepsini Kaldır" : "Hepsini Seç"}
              </Button>
            </div>

            <div className="border border-zinc-200 rounded-lg overflow-y-auto flex-1 min-h-[300px]">
              {visibleTopics.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">
                  {maarifEmpty && curriculum === "maarif"
                    ? "Henüz Maarif konusu eklenmedi."
                    : levelEmpty
                      ? "Bu seviyede ders bulunamadı."
                      : effectiveSubjectId
                        ? "Bu derste konu bulunamadı."
                        : "Bir ders seç."}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {visibleTopics.map((t) => {
                    const already = assignedSet.has(t.id)
                    const checked = selected.has(t.id)
                    return (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                      >
                        <Checkbox
                          id={`topic-${t.id}`}
                          checked={checked}
                          onCheckedChange={() => !already && toggle(t.id)}
                          disabled={already}
                        />
                        <label
                          htmlFor={`topic-${t.id}`}
                          className={`flex-1 text-sm cursor-pointer ${
                            already ? "text-zinc-400" : "text-zinc-900"
                          }`}
                        >
                          {t.name}
                        </label>
                        {already && (
                          <Badge variant="outline" className="text-[10px]">
                            Zaten atanmış
                          </Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center gap-2">
          <span className="text-sm text-zinc-500 mr-auto">
            <Badge variant="outline">{selected.size}</Badge> konu seçildi
          </span>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button onClick={handleSubmit} disabled={pending || selected.size === 0} variant="accent">
            {pending ? "Atanıyor..." : "Seç"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
