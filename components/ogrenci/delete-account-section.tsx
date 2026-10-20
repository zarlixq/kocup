"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteMyAccountAction } from "@/app/ogrenci/ayarlar/actions"

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6">
      <h2 className="text-base font-semibold text-red-700">Hesabımı sil</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Hesabın ve tüm verilerin (soru kayıtları, denemeler, program, UpPlan, yanlış defteri, yüklediğin dosyalar)
        kalıcı olarak silinir. Bu işlem geri alınamaz.
      </p>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          setError(null)
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-50">
            Hesabımı sil
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesabını kalıcı olarak sil</DialogTitle>
            <DialogDescription>
              Tüm verilerin silinecek ve geri getirilemeyecek. Devam etmek için şifreni gir ve kutuya <strong>SİL</strong> yaz.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => {
              setError(null)
              start(async () => {
                const res = await deleteMyAccountAction(fd)
                if (res?.error) {
                  setError(res.error)
                  toast.error(res.error)
                }
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="del-password">Şifren</Label>
              <Input id="del-password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-confirm">Onay</Label>
              <Input id="del-confirm" name="confirm" required placeholder="SİL" autoComplete="off" />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={pending} className="bg-red-600 hover:bg-red-700">
                {pending ? "Siliniyor..." : "Hesabımı kalıcı olarak sil"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
