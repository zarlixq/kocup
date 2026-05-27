"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { inviteCoachToOrg } from "@/app/kurum/actions"

export function InviteCoachToOrgDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const values = {
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
    }

    startTransition(async () => {
      const res = await inviteCoachToOrg(values)
      if (res.success) {
        toast.success("Davet gönderildi.")
        form.reset()
        setOpen(false)
      } else {
        toast.error(res.error ?? "Davet gönderilemedi.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Koç Davet Et</DialogTitle>
          <DialogDescription>
            Koç davet edildiğinde email'ine bir şifre belirleme linki gönderilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Ad Soyad *</Label>
            <Input id="full_name" name="full_name" required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" placeholder="0 5__ ___ __ __" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Gönderiliyor..." : "Davet Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
