"use client"

import { useRef, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updatePasswordAction } from "@/app/koc/ayarlar/actions"
import { toast } from "sonner"

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={formRef}
      action={(fd) => {
        setError(null)
        start(async () => {
          const res = await updatePasswordAction(fd)
          if (res?.error) {
            setError(res.error)
            toast.error(res.error)
          } else {
            toast.success("Şifre güncellendi")
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
        <Label htmlFor="password">Yeni Şifre</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        <p className="text-xs text-zinc-500">En az 6 karakter</p>
      </div>
      <Button type="submit" variant="default" disabled={pending}>
        {pending ? "Güncelleniyor..." : "Şifreyi Değiştir"}
      </Button>
    </form>
  )
}
