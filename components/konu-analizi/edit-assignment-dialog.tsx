"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Trash2 } from "lucide-react"
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
import {
  deleteAssignment,
  updateAssignment,
} from "@/app/koc/konu-analizi/actions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: {
    id: string
    topic_name: string
    subject_name: string
    student_name: string
    hedef_soru: number
    hedef_sure_dk: number | null
    son_tarih: string
    notes: string | null
    status: "aktif" | "tamamlandi" | "iptal"
  }
}

export function EditAssignmentDialog({ open, onOpenChange, assignment }: Props) {
  const [hedefSoru, setHedefSoru] = useState<string>(String(assignment.hedef_soru))
  const [hedefSure, setHedefSure] = useState<string>(
    assignment.hedef_sure_dk ? String(assignment.hedef_sure_dk) : "",
  )
  const [sonTarih, setSonTarih] = useState<string>(assignment.son_tarih)
  const [notes, setNotes] = useState<string>(assignment.notes ?? "")
  const [status, setStatus] = useState<"aktif" | "tamamlandi" | "iptal">(assignment.status)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const hedef = Number(hedefSoru)
    if (!Number.isInteger(hedef) || hedef <= 0) return toast.error("Geçerli hedef girin")

    startTransition(async () => {
      const res = await updateAssignment({
        id: assignment.id,
        hedef_soru: hedef,
        hedef_sure_dk: hedefSure.trim() ? Math.max(1, Number(hedefSure)) : null,
        son_tarih: sonTarih,
        notes: notes.trim() || null,
        status,
      })
      if (!res.success) return toast.error(res.error ?? "Güncellenemedi")
      toast.success("✏️ Güncellendi")
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!confirm("Bu atama ve ona bağlı çalışma kayıtları silinsin mi?")) return
    startTransition(async () => {
      const res = await deleteAssignment(assignment.id)
      if (!res.success) return toast.error(res.error ?? "Silinemedi")
      toast.success("🗑️ Atama silindi")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#1B6B8A]" />
            Atamayı Düzenle
          </DialogTitle>
          <DialogDescription>
            {assignment.student_name} · {assignment.subject_name} — {assignment.topic_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hedef Soru</Label>
              <Input
                type="number"
                min="1"
                value={hedefSoru}
                onChange={(e) => setHedefSoru(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hedef Süre (dk)</Label>
              <Input
                type="number"
                min="1"
                value={hedefSure}
                onChange={(e) => setHedefSure(e.target.value)}
                placeholder="opsiyonel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Son Tarih</Label>
            <Input
              type="date"
              value={sonTarih}
              onChange={(e) => setSonTarih(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Not</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={pending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" /> Sil
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
