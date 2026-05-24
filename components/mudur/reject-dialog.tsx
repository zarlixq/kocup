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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { rejectApplication } from "@/app/mudur/basvurular/actions"

type RejectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicantName: string
}

export function RejectDialog({
  open,
  onOpenChange,
  applicationId,
  applicantName,
}: RejectDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  function handleSubmit() {
    if (reason.trim().length < 10) {
      toast.error("Red gerekçesi en az 10 karakter olmalı.")
      return
    }
    startTransition(async () => {
      const result = await rejectApplication(applicationId, reason)
      if (result.success) {
        toast.success("Başvuru reddedildi.")
        onOpenChange(false)
        setReason("")
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Başvuruyu Reddet</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{applicantName}</span> başvurusu reddedilecek. Red gerekçesini yazın (en az 10 karakter).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Red Gerekçesi</Label>
          <Textarea
            id="reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Başvurunun neden reddedildiğini açıklayın..."
          />
          <p className="text-xs text-zinc-400">{reason.trim().length} / 10 karakter</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Reddediliyor..." : "Reddet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
