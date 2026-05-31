"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Pencil, Target, X, Check } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { updateTopicProgress } from "@/app/koc/ogrenciler/[id]/konular/actions"
import {
  progressTone,
  successRate,
  type TopicCard,
} from "@/components/konular/types"

type Props = {
  card: TopicCard
}

export function TopicProgressDialog({ card }: Props) {
  const [open, setOpen] = useState(false)
  const [solved, setSolved] = useState(String(card.solvedCount))
  const [wrong, setWrong] = useState(String(card.wrongCount))
  const [notes, setNotes] = useState(card.errorNotes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setSolved(String(card.solvedCount))
    setWrong(String(card.wrongCount))
    setNotes(card.errorNotes ?? "")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const s = parseInt(solved, 10) || 0
    const w = parseInt(wrong, 10) || 0
    if (w > s) {
      setError("Yanlış sayısı çözülenden fazla olamaz.")
      return
    }
    startTransition(async () => {
      const res = await updateTopicProgress(card.id, {
        solved_count: s,
        wrong_count: w,
        error_notes: notes,
      })
      if (res.success) {
        toast.success("Konu özeti güncellendi.")
        setOpen(false)
      } else {
        setError(res.error ?? "Güncellenemedi.")
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  const previewSolved = parseInt(solved, 10) || 0
  const previewWrong = parseInt(wrong, 10) || 0
  const previewRate = successRate(previewSolved, previewWrong)
  const tone = progressTone(previewRate)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-600 hover:text-[#1B6B8A] hover:bg-zinc-50 transition-colors"
          aria-label="Soru takibini düzenle"
        >
          <Pencil className="h-3 w-3" /> Düzenle
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#F97316]" />
            Soru Takibi
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{card.topicName}</span> — {card.subjectName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="solved" className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Çözülen Soru
              </Label>
              <Input
                id="solved"
                type="number"
                inputMode="numeric"
                min={0}
                max={99999}
                value={solved}
                onChange={(e) => setSolved(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wrong" className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                Yanlış
              </Label>
              <Input
                id="wrong"
                type="number"
                inputMode="numeric"
                min={0}
                max={99999}
                value={wrong}
                onChange={(e) => setWrong(e.target.value)}
                required
              />
            </div>
          </div>

          {previewSolved > 0 && (
            <div
              className={cn(
                "rounded-lg px-3 py-2.5 flex items-center justify-between text-xs",
                tone.bg,
                tone.text,
              )}
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                {previewWrong <= previewSolved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Başarı: %{previewRate}
              </span>
              <span className="tabular-nums text-[11px]">
                {previewSolved - previewWrong} doğru / {previewSolved} toplam
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Zorlandığın yerler (opsiyonel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="ör. üslü sayılarda hız sorunu, paragrafta zaman..."
            />
            <p className="text-[10px] text-zinc-400 text-right">
              {notes.length} / 1000
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

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
              type="submit"
              variant="accent"
              disabled={pending}
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
