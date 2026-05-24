"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"
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
import { scheduleTanitim } from "@/app/mudur/basvurular/actions"

type Coach = { id: string; full_name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  applicantName: string
  coaches: Coach[]
  currentUser: { id: string; full_name: string }
}

const DURATIONS = [15, 30, 45, 60]

function defaultStartLocal() {
  const d = new Date()
  d.setHours(d.getHours() + 2)
  d.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduleTanitimDialog({
  open,
  onOpenChange,
  applicationId,
  applicantName,
  coaches,
  currentUser,
}: Props) {
  const [coachId, setCoachId] = useState<string>(currentUser.id)
  const [startTime, setStartTime] = useState<string>(defaultStartLocal)
  const [duration, setDuration] = useState<number>(30)
  const [meetingLink, setMeetingLink] = useState("")
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()

  // Müdür kendisini ilk seçenek olarak göster
  const coachOptions = [{ id: currentUser.id, full_name: `${currentUser.full_name} (siz)` }, ...coaches.filter((c) => c.id !== currentUser.id)]

  function handleSubmit() {
    if (!coachId) {
      toast.error("Tanıtım dersini kim yapacak seçin")
      return
    }

    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + duration * 60_000)

    startTransition(async () => {
      const res = await scheduleTanitim({
        applicationId,
        coachId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        meeting_link: meetingLink.trim() || "",
        notes: notes.trim() || undefined,
      })
      if (!res.success) {
        toast.error(res.error ?? "Bir hata oluştu")
        return
      }
      toast.success("📅 Tanıtım dersi planlandı")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#F97316]" />
            Tanıtım Dersi Ayarla
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{applicantName}</span> için tanıtım dersi planlayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tanıtım Dersini Kim Yapacak</Label>
            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coachOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start">Tarih ve Saat</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Süre</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    duration === d
                      ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {d} dk
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link">Toplantı Linki (opsiyonel)</Label>
            <Input
              id="link"
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Not (opsiyonel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Konuşulacak konular, hatırlatmalar..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tanıtımı Planla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
