"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, Trash2, BookMarked } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABEL,
  RESOURCE_STATUSES,
  RESOURCE_STATUS_LABEL,
} from "@/lib/resources/constants"
import {
  addCatalogResource,
  addCustomResource,
  removeStudentResource,
  setStudentResourceStatus,
} from "@/lib/resources/actions"

export type CatalogItem = {
  id: string
  name: string
  publisher: string | null
  subject_name: string | null
  type: string
}

export type SubjectOption = { id: string; name: string }

export type StudentResourceItem = {
  id: string
  resource_id: string
  name: string
  publisher: string | null
  subject_name: string | null
  type: string
  total_questions: number | null
  status: string
  added_by: string
  solved: number
}

const CUSTOM_VALUE = "__custom__"

export function StudentResourcesManager({
  studentId,
  items,
  catalog,
  subjects,
}: {
  studentId: string
  items: StudentResourceItem[]
  catalog: CatalogItem[]
  subjects: SubjectOption[]
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StudentResourceItem | null>(null)
  const [pending, start] = useTransition()

  // Zaten ekli kaynakları katalogdan gizle
  const usedIds = useMemo(() => new Set(items.map((i) => i.resource_id)), [items])
  const availableCatalog = useMemo(
    () => catalog.filter((c) => !usedIds.has(c.id)),
    [catalog, usedIds],
  )

  function handleStatus(item: StudentResourceItem, status: string) {
    start(async () => {
      const res = await setStudentResourceStatus(studentId, item.id, status)
      if (!res.success) toast.error(res.error ?? "Durum güncellenemedi.")
      else toast.success("Durum güncellendi.")
    })
  }

  function handleRemove() {
    if (!removeTarget) return
    start(async () => {
      const res = await removeStudentResource(studentId, removeTarget.id)
      if (!res.success) toast.error(res.error ?? "Kaldırılamadı.")
      else {
        toast.success("Kaynak kaldırıldı.")
        setRemoveTarget(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Kaynaklar</h2>
        <Button variant="accent" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Kaynak Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <BookMarked className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz kaynak yok</h3>
          <p className="text-sm text-zinc-500">Kullanılan kitap/yayınları ekleyerek takip et.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kaynak</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead className="text-right">İlerleme</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const pct =
                  item.total_questions && item.total_questions > 0
                    ? Math.min(100, Math.round((item.solved / item.total_questions) * 100))
                    : null
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-zinc-900">{item.name}</div>
                      {item.publisher && (
                        <div className="text-xs text-zinc-500">{item.publisher}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-600">{item.subject_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{RESOURCE_TYPE_LABEL[item.type] ?? item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pct !== null ? (
                        <span title={`${item.solved}/${item.total_questions} soru`}>
                          %{pct}
                        </span>
                      ) : (
                        <span className="text-zinc-500">{item.solved} soru</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(v) => handleStatus(item, v)}
                        disabled={pending}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESOURCE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {RESOURCE_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoveTarget(item)}
                        aria-label="Kaldır"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddResourceDialog
        studentId={studentId}
        open={addOpen}
        onOpenChange={setAddOpen}
        catalog={availableCatalog}
        subjects={subjects}
      />

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && !pending && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaynağı kaldır?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{removeTarget?.name}</span> öğrencinin kaynak
              listesinden kaldırılacak. Soru çözüm kayıtları silinmez (kaynak bağı kalkar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Kaldırılıyor..." : "Evet, kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddResourceDialog({
  studentId,
  open,
  onOpenChange,
  catalog,
  subjects,
}: {
  studentId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  catalog: CatalogItem[]
  subjects: SubjectOption[]
}) {
  const [pending, start] = useTransition()
  const [selected, setSelected] = useState<string>("")
  // Custom alanları
  const [name, setName] = useState("")
  const [publisher, setPublisher] = useState("")
  const [subjectId, setSubjectId] = useState<string>("")
  const [type, setType] = useState<string>("soru_bankasi")
  const [totalQuestions, setTotalQuestions] = useState<string>("")

  const isCustom = selected === CUSTOM_VALUE

  function reset() {
    setSelected("")
    setName("")
    setPublisher("")
    setSubjectId("")
    setType("soru_bankasi")
    setTotalQuestions("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      toast.error("Bir kaynak seç veya yeni kaynak gir.")
      return
    }

    start(async () => {
      let res
      if (isCustom) {
        if (name.trim().length < 2) {
          toast.error("Kaynak adı en az 2 karakter olmalı.")
          return
        }
        res = await addCustomResource(studentId, {
          name: name.trim(),
          publisher: publisher.trim() || null,
          subject_id: subjectId || null,
          type,
          total_questions: totalQuestions.trim() ? Math.max(0, Number(totalQuestions)) : null,
        })
      } else {
        res = await addCatalogResource(studentId, selected)
      }

      if (res.success) {
        toast.success("Kaynak eklendi.")
        reset()
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "Eklenemedi.")
      }
    })
  }

  // Katalog ders bazında grupla
  const grouped = catalog.reduce<Record<string, CatalogItem[]>>((acc, c) => {
    const key = c.subject_name ?? "Diğer"
    ;(acc[key] ||= []).push(c)
    return acc
  }, {})

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kaynak Ekle</DialogTitle>
          <DialogDescription>
            Katalogdan bir kaynak seç ya da listede yoksa yeni kaynak gir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resource-select">Kaynak</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="resource-select">
                <SelectValue placeholder="Kaynak seç" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {Object.entries(grouped).map(([group, list]) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {list.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.publisher ? ` · ${c.publisher}` : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Diğer</SelectLabel>
                  <SelectItem value={CUSTOM_VALUE}>Listede yok — yeni kaynak gir…</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="space-y-3 border-t border-zinc-100 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-name">Kaynak Adı *</Label>
                <Input
                  id="custom-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ör. 3D Yayınları TYT Matematik"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-publisher">Yayın</Label>
                  <Input
                    id="custom-publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="ör. 3D"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-type">Tür</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="custom-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {RESOURCE_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-subject">Ders</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger id="custom-subject">
                      <SelectValue placeholder="Seç (ops.)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-total">Toplam Soru</Label>
                  <Input
                    id="custom-total"
                    type="number"
                    min="0"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(e.target.value)}
                    placeholder="ops."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
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
