"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPaymentAction } from "@/app/koc/payments/actions"
import { isoDate, formatMonth } from "@/lib/format"
import { monthOptions, currentPeriodMonthISO } from "@/lib/payments"
import { toast } from "sonner"

type Pkg = {
  id: string
  name: string
  monthly_price: number
}

export function PaymentFormDialog({
  studentId,
  packages,
  trigger,
  defaultPackageId,
  defaultPeriodMonth,
}: {
  studentId: string
  packages: Pkg[]
  trigger: React.ReactNode
  defaultPackageId?: string
  defaultPeriodMonth?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [packageId, setPackageId] = useState(defaultPackageId ?? packages[0]?.id ?? "")
  const [periodMonth, setPeriodMonth] = useState(defaultPeriodMonth ?? currentPeriodMonthISO())

  const months = monthOptions(12, 3)
  const today = isoDate(new Date())
  const selectedPkg = packages.find((p) => p.id === packageId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            setError(null)
            fd.set("package_id", packageId)
            fd.set("period_month", periodMonth)
            start(async () => {
              const res = await createPaymentAction(studentId, fd)
              if (res?.error) {
                setError(res.error)
                toast.error(res.error)
              } else {
                toast.success("Ödeme kaydedildi")
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
            <Label>Paket *</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Paket seç" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Tutar (₺) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={selectedPkg?.monthly_price ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Ödeme Tarihi *</Label>
              <Input id="payment_date" name="payment_date" type="date" required defaultValue={today} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Hangi Ayın Ödemesi *</Label>
            <Select value={periodMonth} onValueChange={setPeriodMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((d) => {
                  const iso = isoDate(d)
                  return (
                    <SelectItem key={iso} value={iso} className="capitalize">
                      {formatMonth(d)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method">Yöntem</Label>
            <Select name="method" defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder="Seç..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nakit">Nakit</SelectItem>
                <SelectItem value="havale">Havale/EFT</SelectItem>
                <SelectItem value="kart">Kredi Kartı</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Not</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              İptal
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
