"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { updateTopicStatus, removeTopic } from "@/app/koc/ogrenciler/[id]/konular/actions"

type Status = "basla" | "devam" | "tamam" | "tekrar"

const statusOptions: { value: Status; label: string }[] = [
  { value: "basla", label: "Başla" },
  { value: "devam", label: "Devam" },
  { value: "tamam", label: "Tamam" },
  { value: "tekrar", label: "Tekrar" },
]

type Props = {
  studentId: string
  trackingId: string
  topicName: string
  isCustom: boolean
  status: Status
}

export function StudentTopicRow({ studentId, trackingId, topicName, isCustom, status }: Props) {
  const [currentStatus, setCurrentStatus] = useState<Status>(status)
  const [showDelete, setShowDelete] = useState(false)
  const [pending, start] = useTransition()

  function onStatusChange(v: string) {
    const next = v as Status
    const prev = currentStatus
    setCurrentStatus(next)
    start(async () => {
      const res = await updateTopicStatus(studentId, trackingId, next)
      if (!res.success) {
        setCurrentStatus(prev)
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  function handleDelete() {
    start(async () => {
      const res = await removeTopic(studentId, trackingId)
      if (res.success) {
        toast.success("Konu kaldırıldı.")
        setShowDelete(false)
      } else {
        toast.error(res.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 first:border-t-0">
        <span className="flex-1 text-sm text-zinc-900">
          {topicName}
          {isCustom && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              Özel
            </Badge>
          )}
        </span>
        <Select value={currentStatus} onValueChange={onStatusChange} disabled={pending}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowDelete(true)}
          aria-label="Konuyu sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konuyu kaldır?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{topicName}</span> öğrenciden kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Siliniyor..." : "Evet, kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
