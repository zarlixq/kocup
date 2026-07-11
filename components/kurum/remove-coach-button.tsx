"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"
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
import { removeCoachFromOrg } from "@/app/kurum/actions"

type Props = {
  coachId: string
  coachName: string
  studentCount: number
  activeStudentCount: number
}

export function RemoveCoachButton({ coachId, coachName, studentCount, activeStudentCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const blocked = activeStudentCount > 0

  function handleConfirm() {
    startTransition(async () => {
      const res = await removeCoachFromOrg(coachId)
      if (res.success) {
        toast.success("Koç kurumdan çıkarıldı.")
        router.push("/kurum/koclar")
        router.refresh()
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <UserMinus className="h-4 w-4" /> Kurumdan Çıkar
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Koçu kurumdan çıkar?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{coachName}</span> kurumunuzla bağlantısı kesilecek.
              Hesabı silinmez; sistemde bireysel koç olarak kalmaya devam eder.
              {blocked ? (
                <span className="block mt-2 text-red-700 font-medium">
                  Bu koçun {activeStudentCount} aktif öğrencisi var. Kurumdan çıkarmadan önce
                  öğrencileri başka bir koça devredin.
                </span>
              ) : (
                studentCount > 0 && (
                  <span className="block mt-2 text-amber-700 font-medium">
                    Bu koça atanmış {studentCount} pasif öğrenci kaydı kurum panelinde
                    görünmez olacak.
                  </span>
                )
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending || blocked}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Çıkarılıyor..." : "Evet, kurumdan çıkar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
