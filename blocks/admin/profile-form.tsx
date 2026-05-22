"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateProfileAction } from "@/app/admin/ayarlar/actions"
import { toast } from "sonner"

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      action={(fd) => {
        setError(null)
        start(async () => {
          const res = await updateProfileAction(fd)
          if (res?.error) {
            setError(res.error)
            toast.error(res.error)
          } else toast.success("Profil güncellendi")
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled className="bg-zinc-50" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Ad Soyad</Label>
        <Input id="full_name" name="full_name" required defaultValue={fullName} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={phone} />
      </div>
      <Button type="submit" variant="default" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Profili Kaydet"}
      </Button>
    </form>
  )
}
