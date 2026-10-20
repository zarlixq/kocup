"use client"

import { useRef, useState, useTransition } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { submitFeedbackAction } from "@/app/ogrenci/feedback-actions"

// Öğrenci panelinde her sayfada görünen geri bildirim butonu.
export function FeedbackButton() {
  const pathname = usePathname()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 left-4 z-40 rounded-full bg-white shadow-md md:bottom-4 md:left-[17rem]"
        >
          <MessageSquarePlus className="h-4 w-4 text-[#F97316]" />
          Geri bildirim
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geri bildirim gönder</DialogTitle>
          <DialogDescription>Bir sorun mu yaşadın ya da bir önerin mi var? Kısaca anlat.</DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={(fd) => {
            fd.set("page_path", pathname)
            start(async () => {
              const res = await submitFeedbackAction(fd)
              if (!res.success) {
                toast.error(res.error ?? "Gönderilemedi.")
                return
              }
              if (res.error) toast.warning(res.error)
              else toast.success("Teşekkürler, geri bildirimin bize ulaştı.")
              formRef.current?.reset()
              setOpen(false)
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="fb-message">Ne oldu?</Label>
            <Textarea id="fb-message" name="message" required minLength={3} maxLength={2000} rows={5} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-shot">Ekran görüntüsü (isteğe bağlı)</Label>
            <input
              id="fb-shot"
              name="screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
            />
            <p className="text-xs text-zinc-500">PNG, JPG veya WEBP, en fazla 4 MB.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending} className="bg-[#1B6B8A] hover:bg-[#155a75]">
              {pending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
