"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AssignCoachDialog } from "@/components/mudur/assign-coach-dialog"
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
import { toggleStudentActive } from "@/app/mudur/ogrenciler/actions"

type Props = {
  studentId: string
  studentName: string
  isActive: boolean
  currentCoachId: string | null
  coaches: { id: string; full_name: string }[]
}

export function StudentDetailActions({
  studentId,
  studentName,
  isActive,
  currentCoachId,
  coaches,
}: Props) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const nextValue = !isActive
  const actionLabel = isActive ? "Pasifleştir" : "Aktifleştir"

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleStudentActive(studentId, nextValue)
      if (res.success) {
        toast.success(nextValue ? "Öğrenci aktifleştirildi." : "Öğrenci pasifleştirildi.")
        setConfirmOpen(false)
      } else {
        toast.error(res.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setAssignOpen(true)}
          className="border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
        >
          {currentCoachId ? "Koç Değiştir" : "Koç Ata"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className={isActive ? "text-zinc-700" : "text-green-700"}
        >
          {actionLabel}
        </Button>
      </div>

      <AssignCoachDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        studentId={studentId}
        studentName={studentName}
        currentCoachId={currentCoachId}
        coaches={coaches}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Öğrenciyi pasifleştir?" : "Öğrenciyi aktifleştir?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{studentName}</span>{" "}
              {isActive
                ? "pasif duruma alınacak. Verileri silinmez; istenildiğinde tekrar aktifleştirilebilir."
                : "yeniden aktif yapılacak."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={pending}
              className={
                isActive
                  ? "bg-zinc-700 hover:bg-zinc-800"
                  : "bg-[#1B6B8A] hover:bg-[#155571]"
              }
            >
              {pending ? "Kaydediliyor..." : actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
