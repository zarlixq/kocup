"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteExamAction } from "@/app/ogrenci/denemelerim/actions"
import { toast } from "sonner"

export function DeleteExamButton({ examId }: { examId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu denemeyi silmek istediğine emin misin?")) return
        start(async () => {
          const res = await deleteExamAction(examId)
          if (res?.error) toast.error(res.error)
        })
      }}
    >
      <Trash2 className="h-4 w-4 text-red-600" /> Sil
    </Button>
  )
}
