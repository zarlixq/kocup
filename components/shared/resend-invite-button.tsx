"use client"

import { useState, useTransition } from "react"
import { Mail } from "lucide-react"
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

export type ResendActionResult =
  | { success: true }
  | { success: false; error: string }

type Props = {
  userName: string
  email: string
  action: () => Promise<ResendActionResult>
  size?: "default" | "sm"
  variant?: "default" | "outline" | "ghost"
  label?: string
  className?: string
}

export function ResendInviteButton({
  userName,
  email,
  action,
  size = "sm",
  variant = "outline",
  label = "Daveti yeniden gönder",
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const res = await action()
      if (res.success) {
        toast.success("Davet linki tekrar gönderildi.")
        setOpen(false)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={pending}
        className={className}
      >
        <Mail className="h-4 w-4" />
        {label}
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Daveti yeniden gönder?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{userName}</span> (<span className="text-zinc-600">{email}</span>) adresine
              yeni bir şifre belirleme bağlantısı içeren e-posta gönderilecek.
              Daha önce gönderilen bağlantı geçersiz olabilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending}
              className="bg-[#1B6B8A] hover:bg-[#155571]"
            >
              {pending ? "Gönderiliyor..." : "Evet, gönder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
