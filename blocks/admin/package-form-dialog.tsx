"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPackageAction, updatePackageAction } from "@/app/admin/packages/actions"
import { isoDate } from "@/lib/format"
import { toast } from "sonner"

type Pkg = {
  id: string
  name: string
  monthly_price: number
  start_date: string
  end_date: string | null
  payment_day: number | null
  status: string | null
  notes: string | null
}

export function PackageFormDialog({
  studentId,
  pkg,
  trigger,
}: {
  studentId: string
  pkg?: Pkg
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const isEdit = Boolean(pkg)

  const today = isoDate(new Date())

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Paketi Düzenle" : "Yeni Paket"}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            setError(null)
            start(async () => {
              const res = isEdit
                ? await updatePackageAction(pkg!.id, studentId, fd)
                : await createPackageAction(studentId, fd)
              if (res?.error) {
                setError(res.error)
                toast.error(res.error)
              } else {
                toast.success(isEdit ? "Paket güncellendi" : "Paket eklendi")
                setOpen(false)
              }
            })
          }}
          className="space-y-4"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Paket Adı *</Label>
            <Input id="name" name="name" required defaultValue={pkg?.name ?? ""} placeholder="ör. YKS Tam Paket" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="monthly_price">Aylık Ücret (₺) *</Label>
              <Input
                id="monthly_price"
                name="monthly_price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={pkg?.monthly_price ?? ""}
                placeholder="2500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_day">Ödeme Günü</Label>
              <Input
                id="payment_day"
                name="payment_day"
                type="number"
                min="1"
                max="31"
                defaultValue={pkg?.payment_day ?? 1}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Başlangıç *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={pkg?.start_date ?? today}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Bitiş (opsiyonel)</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={pkg?.end_date ?? ""} />
            </div>
          </div>
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <Select name="status" defaultValue={pkg?.status ?? "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="paused">Durduruldu</SelectItem>
                  <SelectItem value="ended">Sonlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={pkg?.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              İptal
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Paketi Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
