"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SetterSelect, type SetterOption } from "@/components/mudur/satis-takibi/setter-select"
import { istanbulDateStr } from "@/lib/tz"
import {
  createDemoAppointment,
  rescheduleDemoAppointment,
} from "@/app/mudur/satis-takibi/actions"

export type ScheduleTarget =
  | { mode: "create"; leadId: string }
  | { mode: "reschedule"; appointmentId: string; defaultSetterId: string | null }

/**
 * Demo oluştur / yeniden randevu dialog'u. Hem detay panelinde hem satış CRM
 * takip listesinde paylaşılır (kopyalama yok). Reschedule modunda eski randevu
 * 'rescheduled' olur, yeni 'scheduled' oluşur (server action zinciri).
 */
export function DemoScheduleDialog({
  target,
  setters,
  onClose,
}: {
  target: ScheduleTarget
  setters: SetterOption[]
  onClose: () => void
}) {
  const isReschedule = target.mode === "reschedule"
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(istanbulDateStr())
  const [time, setTime] = useState("10:00")
  const [notes, setNotes] = useState("")
  const [setById, setSetById] = useState<string | null>(
    target.mode === "reschedule" ? target.defaultSetterId : null,
  )

  function submit() {
    startTransition(async () => {
      const input = { date, time, notes, set_by_id: setById }
      const res =
        target.mode === "reschedule"
          ? await rescheduleDemoAppointment(target.appointmentId, input)
          : await createDemoAppointment(target.leadId, input)
      if (res.success) {
        toast.success(isReschedule ? "Yeni randevu oluşturuldu." : "Demo randevusu oluşturuldu.")
        onClose()
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isReschedule ? "Yeni Randevu Belirle" : "Demo Randevusu Oluştur"}</DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Gelmeyen randevu geçmişte kalır, yeni randevu ona bağlanır."
              : "Demo için tarih ve saat belirleyin (Istanbul saati)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="demo-date">Tarih</Label>
              <Input id="demo-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-time">Saat</Label>
              <Input id="demo-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kim ayarladı? (opsiyonel)</Label>
            <SetterSelect setters={setters} value={setById} onChange={(id) => setSetById(id)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-notes">Not (opsiyonel)</Label>
            <Textarea
              id="demo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Örn. yönetici ile toplantı, adres..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button className="bg-[#1B6B8A] hover:bg-[#155a75]" onClick={submit} disabled={isPending}>
            {isPending ? "Kaydediliyor..." : isReschedule ? "Yeni Randevu Oluştur" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
