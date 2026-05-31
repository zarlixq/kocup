"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateOgrenciPasswordAction } from "@/app/ogrenci/ayarlar/actions"

export function OgrenciPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(fd) => {
        const newPassword = String(fd.get("newPassword") ?? "")
        const confirm = String(fd.get("confirm") ?? "")
        setError(null)
        if (newPassword !== confirm) {
          setError("Yeni şifreler eşleşmiyor.")
          toast.error("Yeni şifreler eşleşmiyor.")
          return
        }
        start(async () => {
          const res = await updateOgrenciPasswordAction(fd)
          if (res.error) {
            setError(res.error)
            toast.error(res.error)
          } else {
            toast.success("Şifren güncellendi.")
            formRef.current?.reset()
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
        <Label htmlFor="currentPassword">Mevcut Şifre</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Yeni Şifre</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-zinc-500">En az 8 karakter</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Yeni Şifre (tekrar)</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" variant="default" disabled={pending}>
        {pending ? "Güncelleniyor..." : "Şifreyi Değiştir"}
      </Button>
    </form>
  )
}
