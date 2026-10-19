"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import { assignCoach, previewCoachChange, type CoachChangePreview } from "@/app/mudur/ogrenciler/actions"

const UNASSIGN_VALUE = "__unassign__"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  currentCoachId: string | null
  coaches: { id: string; full_name: string }[]
}

export function AssignCoachDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  currentCoachId,
  coaches,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState<string>(currentCoachId ?? "")
  const [preview, setPreview] = useState<CoachChangePreview | null>(null)
  const [previewing, startPreview] = useTransition()

  // Mevcut koçtan farklı bir seçim → devir etkisini önceden göster.
  function handleSelect(next: string) {
    setValue(next)
    setPreview(null)
    if (!currentCoachId || next === currentCoachId) return
    startPreview(async () => {
      const res = await previewCoachChange(studentId)
      if (res.success && res.data) setPreview(res.data)
      else toast.error(res.error ?? "Etki hesaplanamadı.")
    })
  }

  const changing = !!currentCoachId && !!value && value !== currentCoachId

  function handleSubmit() {
    if (!value) {
      toast.error("Bir seçim yapın.")
      return
    }
    const newCoachId = value === UNASSIGN_VALUE ? null : value
    startTransition(async () => {
      const result = await assignCoach(studentId, newCoachId)
      if (result.success) {
        toast.success(newCoachId ? "Koç atandı." : "Koç kaldırıldı.")
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koç Ata</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{studentName}</span> için koç seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Koç</Label>
          <Select value={value} onValueChange={handleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Koç seçin..." />
            </SelectTrigger>
            <SelectContent>
              {coaches.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-500">Koç bulunmuyor.</div>
              ) : (
                <>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                  <SelectItem value={UNASSIGN_VALUE} className="text-red-600">
                    Koçu kaldır
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {changing && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {previewing || !preview ? (
              <span>Değişikliğin etkisi hesaplanıyor...</span>
            ) : (
              <ul className="space-y-0.5">
                <li>
                  <span className="font-semibold">{preview.appointments} gelecek randevu iptal edilecek.</span>
                </li>
                <li>
                  {preview.goals} aktif hedef ve {preview.items} gelecek program kalemi öğrenciye devredilecek.
                </li>
                <li className="text-xs text-amber-800">
                  Eski koç bu öğrencinin verilerini artık göremeyecek. Geçmiş kayıtlar olduğu gibi kalır.
                </li>
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Vazgeç
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (changing && (previewing || !preview))}
            className="bg-[#1B6B8A] hover:bg-[#155a75]"
          >
            {isPending ? "Kaydediliyor..." : changing ? "Onayla ve değiştir" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
