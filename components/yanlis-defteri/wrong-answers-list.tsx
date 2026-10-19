"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { MoreVertical, Pencil, StickyNote, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ERROR_TYPES,
  ERROR_TYPE_LABEL,
  UNKNOWN_TYPES,
  UNTYPED_LABEL,
  errorTypeColor,
  errorTypeLabel,
  isErrorType,
  type ErrorType,
} from "@/lib/yanlis-defteri/constants"
import { deleteWrongAnswer, updateWrongAnswer } from "@/app/ogrenci/yanlis-defteri/actions"

export type WrongListItem = {
  id: string
  date: string
  error_type: ErrorType | null
  /** Deneme kaynaklı yanlışta deneme adı (tipsiz olabilir). */
  exam_name: string | null
  note: string | null
  topic_id: string
  topic_name: string
  subject_name: string
  atom_id: string | null
  atom_name: string | null
}

export type WrongListGroup = { date: string; label: string; items: WrongListItem[] }

const NO_ATOM = "__none__"
const NO_TYPE = "__untyped__"

function isUnknown(t: ErrorType | null) {
  return t !== null && UNKNOWN_TYPES.includes(t)
}

export function WrongAnswersList({
  groups,
  atomsByTopic,
  readonly = false,
}: {
  groups: WrongListGroup[]
  atomsByTopic: Record<string, { id: string; name: string }[]>
  readonly?: boolean
}) {
  const [edit, setEdit] = useState<WrongListItem | null>(null)
  const [del, setDel] = useState<WrongListItem | null>(null)
  const [pending, start] = useTransition()

  function handleDelete() {
    if (!del) return
    start(async () => {
      const res = await deleteWrongAnswer(del.id)
      if (!res.success) return void toast.error(res.error ?? "Silinemedi.")
      toast.success("Yanlış kaydı silindi.")
      setDel(null)
    })
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.date}>
          <h3 className="mb-2 px-1 text-sm font-semibold text-zinc-900">{g.label}</h3>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {g.items.map((w) => (
              <li key={w.id} className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: errorTypeColor(w.error_type) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-zinc-900">{errorTypeLabel(w.error_type)}</span>
                    <span className="text-xs text-zinc-500">
                      {w.subject_name} · {w.topic_name}
                    </span>
                    {w.exam_name && <span className="text-xs text-[#1B6B8A]">Deneme: {w.exam_name}</span>}
                  </div>
                  {isUnknown(w.error_type) && (
                    <div className="mt-0.5 text-xs">
                      {w.atom_name ? (
                        <span className="text-orange-700">Bilgi: {w.atom_name}</span>
                      ) : (
                        <span className="text-zinc-400">Bilgi atomu seçilmedi</span>
                      )}
                    </div>
                  )}
                  {w.note && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-zinc-600">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" /> {w.note}
                    </div>
                  )}
                </div>
                {!readonly && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" aria-label="Yanlış işlemleri">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEdit(w)}>
                        <Pencil className="h-4 w-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDel(w)}>
                        <Trash2 className="h-4 w-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {edit && <EditWrongDialog item={edit} atoms={atomsByTopic[edit.topic_id] ?? []} onClose={() => setEdit(null)} />}

      <AlertDialog open={!!del} onOpenChange={(o) => !o && !pending && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yanlış kaydını sil?</AlertDialogTitle>
            <AlertDialogDescription>
              {del && `${errorTypeLabel(del.error_type)} · ${del.topic_name}`} kaydı yanlış defterinden silinecek.{" "}
              {del?.exam_name ? "Deneme sonucun değişmez." : "Soru çözüm kaydın değişmez."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              {pending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditWrongDialog({
  item,
  atoms,
  onClose,
}: {
  item: WrongListItem
  atoms: { id: string; name: string }[]
  onClose: () => void
}) {
  const [type, setType] = useState<ErrorType | null>(item.error_type)
  const [atomId, setAtomId] = useState<string>(item.atom_id ?? NO_ATOM)
  const [note, setNote] = useState(item.note ?? "")
  const [pending, start] = useTransition()
  const unknown = isUnknown(type)

  function save() {
    start(async () => {
      const res = await updateWrongAnswer(item.id, {
        error_type: type,
        // Atom yalnız "bilmiyordum" tiplerinde anlamlı.
        knowledge_atom_id: unknown && atomId !== NO_ATOM ? atomId : null,
        note: note.trim() || null,
      })
      if (!res.success) return void toast.error(res.error ?? "Güncellenemedi.")
      toast.success("Güncellendi.")
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yanlışı düzenle</DialogTitle>
          <DialogDescription>
            {item.subject_name} · {item.topic_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Hata tipi</Label>
            <Select value={type ?? NO_TYPE} onValueChange={(v) => setType(isErrorType(v) ? v : null)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Tipsiz yalnız deneme yanlışında mümkün (DB CHECK). */}
                {item.exam_name !== null && <SelectItem value={NO_TYPE}>{UNTYPED_LABEL}</SelectItem>}
                {ERROR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ERROR_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unknown && (
            <div className="space-y-1.5">
              <Label>Hangi bilgi?</Label>
              {atoms.length === 0 ? (
                <p className="text-xs text-zinc-500">Bu konunun bilgi atomları henüz eklenmedi.</p>
              ) : (
                <Select value={atomId} onValueChange={setAtomId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NO_ATOM}>Emin değilim</SelectItem>
                    {atoms.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="wrong-note">Not</Label>
            <Textarea
              id="wrong-note"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ör. Kökleri toplarken işaret hatası; soru 3D sf. 42 / 7"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={save} disabled={pending}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
