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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { approveApplication } from "@/app/mudur/basvurular/actions"

type Coach = { id: string; full_name: string }

type ApproveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicantName: string
  coaches: Coach[]
}

export function ApproveDialog({
  open,
  onOpenChange,
  applicationId,
  applicantName,
  coaches,
}: ApproveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [skipCoach, setSkipCoach] = useState(false)
  const [coachId, setCoachId] = useState<string>("")

  function handleSubmit() {
    if (!skipCoach && !coachId) {
      toast.error("Bir koç seçin veya 'şimdilik atama yapma' seçeneğini işaretleyin.")
      return
    }
    startTransition(async () => {
      const result = await approveApplication(applicationId, skipCoach ? null : coachId)
      if (result.success) {
        toast.success("Başvuru onaylandı, davet e-postası gönderildi.")
        onOpenChange(false)
        setCoachId("")
        setSkipCoach(false)
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Başvuruyu Onayla</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{applicantName}</span> için davet e-postası gönderilecek. İsterseniz şimdiden bir koç atayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="coach-select">Atanacak Koç</Label>
            <Select value={coachId} onValueChange={setCoachId} disabled={skipCoach}>
              <SelectTrigger id="coach-select">
                <SelectValue placeholder="Koç seçin..." />
              </SelectTrigger>
              <SelectContent>
                {coaches.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">Koç bulunmuyor.</div>
                ) : (
                  coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="skip-coach"
              checked={skipCoach}
              onCheckedChange={(v) => setSkipCoach(v === true)}
            />
            <Label htmlFor="skip-coach" className="text-sm font-normal cursor-pointer">
              Şimdilik koç atama yapma
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Vazgeç
          </Button>
          <Button
            className="bg-[#1B6B8A] hover:bg-[#155a75]"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Onaylanıyor..." : "Onayla & Davet Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
