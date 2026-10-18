"use client"

import { useState, useTransition } from "react"
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
import { deleteExamAction } from "@/app/ogrenci/denemelerim/actions"

export function DeleteExamButton({ examId, examName }: { examId: string; examName: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      // Başarıda action redirect eder; buraya yalnızca hata döner.
      const res = await deleteExamAction(examId)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-red-600" /> Sil
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Denemeyi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-zinc-700">{examName}</span> ve tüm ders sonuçları (varsa PDF&apos;i
              de) kalıcı olarak silinecek. Bu işlem geri alınamaz.
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
    </>
  )
}
