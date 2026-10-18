"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MoreVertical, NotebookPen, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WrongAnswersPanel } from "@/components/yanlis-defteri/wrong-answers-panel"
import type { SessionWrongContext } from "@/lib/yanlis-defteri/load"
import { deleteSessionAction } from "@/app/ogrenci/soru-cozum/actions"
import { getSessionWrongContext } from "@/app/ogrenci/yanlis-defteri/actions"

export function SessionRowActions({
  sessionId,
  label,
  wrong,
  recordedWrongs,
}: {
  sessionId: string
  label: string
  /** Kayıttaki yanlış sayısı. */
  wrong: number
  /** Yanlış defterine girilmiş satır sayısı. */
  recordedWrongs: number
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [wrongCtx, setWrongCtx] = useState<SessionWrongContext | null>(null)
  const [pending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      const res = await deleteSessionAction(sessionId)
      if (res.success) {
        toast.success("Kayıt silindi.")
        setDeleteOpen(false)
      } else {
        toast.error(res.error ?? "Kayıt silinemedi.")
      }
    })
  }

  function openWrongs() {
    start(async () => {
      const res = await getSessionWrongContext(sessionId)
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Yüklenemedi.")
        return
      }
      setWrongCtx(res.data)
    })
  }

  return (
    <>
      {/* modal=false: menüden dialog açılınca body pointer-events kilidi kalmasın. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" aria-label="Kayıt işlemleri">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {wrong > 0 && (
            <DropdownMenuItem onSelect={openWrongs} disabled={pending}>
              <NotebookPen className="h-4 w-4" /> {recordedWrongs > 0 ? "Yanlışları düzenle" : "Yanlışları gir"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/ogrenci/soru-cozum/${sessionId}/duzenle`}>
              <Pencil className="h-4 w-4" /> Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={wrongCtx != null} onOpenChange={(o) => !o && setWrongCtx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yanlış defteri</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          {wrongCtx && <WrongAnswersPanel ctx={wrongCtx} onDone={() => setWrongCtx(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !pending && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-zinc-700">{label}</span> kaydı kalıcı olarak silinecek.
              {recordedWrongs > 0 && (
                <>
                  {" "}
                  Bu kayda bağlı <span className="font-medium text-zinc-700">{recordedWrongs} yanlış</span> da yanlış
                  defterinden silinir.
                </>
              )}{" "}
              Bu işlem geri alınamaz.
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
