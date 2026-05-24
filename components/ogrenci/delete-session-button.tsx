"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteSessionAction } from "@/app/ogrenci/soru-cozum/actions"
import { toast } from "sonner"

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu kaydı silmek istediğine emin misin?")) return
        start(async () => {
          const res = await deleteSessionAction(sessionId)
          if (res?.error) toast.error(res.error)
          else toast.success("Kayıt silindi.")
        })
      }}
    >
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  )
}
