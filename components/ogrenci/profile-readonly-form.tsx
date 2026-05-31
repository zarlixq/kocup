"use client"

import { useState, useTransition } from "react"
import { Info } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateOgrenciProfileAction } from "@/app/ogrenci/ayarlar/actions"

type Props = {
  fullName: string
  email: string
  phone: string
}

export function ProfileReadonlyForm({ fullName, email, phone }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        start(async () => {
          const res = await updateOgrenciProfileAction(fd)
          if (res.error) {
            setError(res.error)
            toast.error(res.error)
          } else {
            toast.success("Telefon güncellendi.")
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
        <Label htmlFor="full_name">Ad Soyad</Label>
        <Input id="full_name" value={fullName} disabled className="bg-zinc-50" />
        <p className="text-xs text-zinc-500 inline-flex items-center gap-1">
          <Info className="h-3 w-3" />
          Bilgilerini güncellemek için koçuna başvur.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" value={email} disabled className="bg-zinc-50" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={phone}
          placeholder="0 5__ ___ __ __"
          maxLength={20}
        />
      </div>

      <Button type="submit" variant="default" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Telefonu Kaydet"}
      </Button>
    </form>
  )
}
