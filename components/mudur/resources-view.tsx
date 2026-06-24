"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, BookMarked } from "lucide-react"
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
  SelectItem,
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
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL } from "@/lib/resources/constants"
import { createResource, updateResource, deleteResource } from "@/app/mudur/kaynaklar/actions"

export type ResourceRow = {
  id: string
  name: string
  publisher: string | null
  subject_id: string | null
  subject_name: string | null
  type: string
  total_questions: number | null
  is_custom: boolean
}

type SubjectOption = { id: string; name: string }

const NO_SUBJECT = "__none__"

export function ResourcesView({
  rows,
  subjects,
}: {
  rows: ResourceRow[]
  subjects: SubjectOption[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ResourceRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null)
  const [pending, start] = useTransition()

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }
  function openEdit(row: ResourceRow) {
    setEditTarget(row)
    setDialogOpen(true)
  }

  function handleDelete() {
    if (!deleteTarget) return
    start(async () => {
      const res = await deleteResource(deleteTarget.id)
      if (!res.success) toast.error(res.error ?? "Silinemedi.")
      else {
        toast.success("Kaynak silindi.")
        setDeleteTarget(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="accent" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Yeni Kaynak
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <BookMarked className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Katalog boş</h3>
          <p className="text-sm text-zinc-500">İlk kaynağı ekleyerek başla.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kaynak</TableHead>
                <TableHead>Ders</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead className="text-right">Toplam Soru</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-zinc-900 flex items-center gap-2">
                      {r.name}
                      {r.is_custom && (
                        <Badge variant="outline" className="text-[10px]">özel</Badge>
                      )}
                    </div>
                    {r.publisher && <div className="text-xs text-zinc-500">{r.publisher}</div>}
                  </TableCell>
                  <TableCell className="text-zinc-600">{r.subject_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{RESOURCE_TYPE_LABEL[r.type] ?? r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-600">
                    {r.total_questions ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Düzenle">
                        <Pencil className="h-4 w-4 text-zinc-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)} aria-label="Sil">
                        <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResourceDialog
        key={editTarget?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editTarget}
        subjects={subjects}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !pending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaynağı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> katalogdan silinecek.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ResourceDialog({
  open,
  onOpenChange,
  initial,
  subjects,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: ResourceRow | null
  subjects: SubjectOption[]
}) {
  const isEdit = Boolean(initial)
  const [pending, start] = useTransition()
  const [name, setName] = useState(initial?.name ?? "")
  const [publisher, setPublisher] = useState(initial?.publisher ?? "")
  const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? NO_SUBJECT)
  const [type, setType] = useState<string>(initial?.type ?? "soru_bankasi")
  const [totalQuestions, setTotalQuestions] = useState<string>(
    initial?.total_questions != null ? String(initial.total_questions) : "",
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error("Kaynak adı en az 2 karakter olmalı.")
      return
    }
    const payload = {
      name: name.trim(),
      publisher: publisher.trim() || null,
      subject_id: subjectId === NO_SUBJECT ? null : subjectId,
      type,
      total_questions: totalQuestions.trim() ? Math.max(0, Number(totalQuestions)) : null,
    }
    start(async () => {
      const res = isEdit && initial
        ? await updateResource(initial.id, payload)
        : await createResource(payload)
      if (res.success) {
        toast.success(isEdit ? "Kaynak güncellendi." : "Kaynak eklendi.")
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kaynağı Düzenle" : "Yeni Kaynak"}</DialogTitle>
          <DialogDescription>Katalog kaydı bilgilerini gir.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="res-name">Kaynak Adı *</Label>
            <Input
              id="res-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ör. 3D Yayınları TYT Matematik Soru Bankası"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-publisher">Yayın</Label>
              <Input
                id="res-publisher"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="ör. 3D"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-type">Tür</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="res-type">
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
              <Label htmlFor="res-subject">Ders</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="res-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NO_SUBJECT}>Ders yok</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-total">Toplam Soru</Label>
              <Input
                id="res-total"
                type="number"
                min="0"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(e.target.value)}
                placeholder="ops."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
