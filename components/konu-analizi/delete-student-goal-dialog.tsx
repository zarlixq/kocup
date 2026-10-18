"use client"

import { useTransition } from "react"
import { toast } from "sonner"
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
import { deleteAssignment } from "@/app/koc/konu-analizi/actions"

// Koç, öğrencinin kendine koyduğu hedefi düzenleyemez; uygun bulmazsa siler.
export function DeleteStudentGoalDialog({
  goal,
  onOpenChange,
}: {
  goal: { id: string; topic_name: string; student_name: string }
  onOpenChange: (open: boolean) => void
}) {
  const [pending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      const res = await deleteAssignment(goal.id)
      if (res.success) {
        toast.success("Hedef silindi.")
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <AlertDialog open onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Öğrenci hedefini sil?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-zinc-700">{goal.student_name}</span> öğrencisinin kendine koyduğu{" "}
            <span className="font-medium text-zinc-700">{goal.topic_name}</span> hedefi silinecek. Öğrencinin soru
            çözüm kayıtları silinmez.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
          >
            {pending ? "Siliniyor..." : "Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
