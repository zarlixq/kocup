"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signUpAction } from "@/app/admin/giris/actions"

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = await signUpAction(fd)
          if (res?.error) setError(res.error)
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
        <Input id="full_name" name="full_name" type="text" required placeholder="Ayşe Yılmaz" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="ornek@kocup.com" autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        <p className="text-xs text-zinc-500">En az 6 karakter</p>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
      </Button>
    </form>
  )
}
