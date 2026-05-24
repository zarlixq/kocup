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
import { assignCoach } from "@/app/mudur/ogrenciler/actions"

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
          <Select value={value} onValueChange={setValue}>
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Vazgeç
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#1B6B8A] hover:bg-[#155a75]"
          >
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
