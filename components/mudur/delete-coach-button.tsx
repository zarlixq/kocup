"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteCoach } from "@/app/mudur/koclar/actions"

export function DeleteCoachButton({
  coachId,
  coachName,
  studentCount,
}: {
  coachId: string
  coachName: string
  studentCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      const res = await deleteCoach(coachId)
      if (res.success) {
        toast.success("Koç silindi.")
        router.push("/mudur/koclar")
      } else {
        toast.error(res.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
        disabled={studentCount > 0}
        title={studentCount > 0 ? "Önce öğrencileri başka koça atayın" : undefined}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Sil
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Koçu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{coachName}</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
