"use client"

import { useState, useTransition } from "react"
import { NotebookPen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WrongAnswersPanel } from "@/components/yanlis-defteri/wrong-answers-panel"
import type { SessionWrongContext } from "@/lib/yanlis-defteri/load"
import { getSessionWrongContext } from "@/app/ogrenci/yanlis-defteri/actions"

// Geçmiş bir soru kaydına sonradan yanlış eklemek için: tıklanınca bağlamı
// server action ile yükler (useEffect yok), paneli dialog'da açar.
export function OpenWrongPanelButton({ sessionId, label }: { sessionId: string; label: string }) {
  const [ctx, setCtx] = useState<SessionWrongContext | null>(null)
  const [pending, start] = useTransition()

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await getSessionWrongContext(sessionId)
            if (!res.success || !res.data) return void toast.error(res.error ?? "Yüklenemedi.")
            setCtx(res.data)
          })
        }
      >
        <NotebookPen className="h-3.5 w-3.5" /> Yanlışları gir
      </Button>
      <Dialog open={ctx != null} onOpenChange={(o) => !o && setCtx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yanlış defteri</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          {ctx && <WrongAnswersPanel ctx={ctx} onDone={() => setCtx(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
