"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
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
import {
  ScheduleFormDialog,
  type ScheduleEntry,
  type SubjectOption,
} from "@/components/koc/schedule-form-dialog"
import { deleteScheduleEntry } from "@/app/koc/ogrenciler/[id]/program/actions"

type Props = {
  studentId: string
  entry: ScheduleEntry & { id: string; displayTitle: string }
  subjects: SubjectOption[]
}

export function ScheduleRowActions({ studentId, entry, subjects }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteScheduleEntry(studentId, entry.id)
      if (res.success) {
        toast.success("Ders silindi.")
        setDeleteOpen(false)
      } else {
        toast.error(res.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditOpen(true)}
          aria-label="Düzenle"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setDeleteOpen(true)}
          aria-label="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ScheduleFormDialog
        studentId={studentId}
        subjects={subjects}
        initial={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !pending && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dersi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{entry.displayTitle}</span> programdan kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
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
