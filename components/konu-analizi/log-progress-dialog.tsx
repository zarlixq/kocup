"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, BarChart3 } from "lucide-react"
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
import { logProgress } from "@/app/ogrenci/konularim/actions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: {
    id: string
    topic_name: string
    subject_name: string
  }
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function LogProgressDialog({ open, onOpenChange, assignment }: Props) {
  const [tarih, setTarih] = useState<string>(todayIso)
  const [dogru, setDogru] = useState<string>("")
  const [yanlis, setYanlis] = useState<string>("")
  const [bos, setBos] = useState<string>("")
  const [sure, setSure] = useState<string>("")
  const [pending, startTransition] = useTransition()

  const dNum = Number(dogru) || 0
  const yNum = Number(yanlis) || 0
  const bNum = Number(bos) || 0
  const total = dNum + yNum + bNum
  const net = useMemo(() => Math.max(0, dNum - yNum / 4), [dNum, yNum])

  function handleSubmit() {
    if (total === 0) return toast.error("En az bir soru girişi yapın")

    startTransition(async () => {
      const res = await logProgress({
        assignment_id: assignment.id,
        tarih,
        dogru: dNum,
        yanlis: yNum,
        bos: bNum,
        sure_dk: sure.trim() ? Math.max(0, Number(sure)) : null,
      })
      if (!res.success) {
        toast.error(res.error ?? "Kaydedilemedi")
        return
      }
      toast.success("📊 Çalışma kaydedildi")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#1B6B8A]" />
            Çalışma Kaydet
          </DialogTitle>
          <DialogDescription>
            {assignment.subject_name} — {assignment.topic_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-tarih">Tarih</Label>
            <Input
              id="log-tarih"
              type="date"
              value={tarih}
              max={todayIso()}
              onChange={(e) => setTarih(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Doğru</Label>
              <Input type="number" min="0" value={dogru} onChange={(e) => setDogru(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Yanlış</Label>
              <Input type="number" min="0" value={yanlis} onChange={(e) => setYanlis(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Boş</Label>
              <Input type="number" min="0" value={bos} onChange={(e) => setBos(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-sure">Süre (dakika, opsiyonel)</Label>
            <Input
              id="log-sure"
              type="number"
              min="0"
              value={sure}
              onChange={(e) => setSure(e.target.value)}
              placeholder="ör. 45"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center">
              <div className="text-xs text-zinc-500">Toplam Soru</div>
              <div className="text-lg font-bold text-zinc-900 tabular-nums">{total}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <div className="text-xs text-orange-700">Net</div>
              <div className="text-lg font-bold text-[#F97316] tabular-nums">
                {net.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
