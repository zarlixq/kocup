"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { updateCoachSource } from "@/app/mudur/koclar/actions"
import {
  COACH_SOURCE_DESCRIPTION,
  COACH_SOURCE_LABEL,
  isCoachSource,
  type CoachSource,
} from "@/lib/coach-source"

type Props = {
  coachId: string
  current: string | null
}

export function EditCoachSourceDialog({ coachId, current }: Props) {
  const initial: CoachSource = isCoachSource(current) ? current : "internal"
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<CoachSource>(initial)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await updateCoachSource(coachId, { coach_source: value })
      if (res.success) {
        toast.success("Koç kaynağı güncellendi.")
        setOpen(false)
      } else {
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Pencil className="h-3 w-3" /> Değiştir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Koç Kaynağını Güncelle</DialogTitle>
          <DialogDescription>
            Bu koç bizim ekibimizin parçası mı, bağımsız bir freelance koç mu?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="coach_source">Kaynak</Label>
          <Select value={value} onValueChange={(v) => setValue(v as CoachSource)}>
            <SelectTrigger id="coach_source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">{COACH_SOURCE_LABEL.internal} — Bizden</SelectItem>
              <SelectItem value="external">{COACH_SOURCE_LABEL.external} — Freelance</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">{COACH_SOURCE_DESCRIPTION[value]}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || value === initial}
            className="bg-[#1B6B8A] hover:bg-[#155571]"
          >
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
