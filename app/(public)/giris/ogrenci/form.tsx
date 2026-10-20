"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginOgrenci } from "@/app/(public)/giris/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TurnstileWidget } from "@/components/security/turnstile-widget"

export function OgrenciGirisForm() {
  const [state, action, pending] = useActionState(loginOgrenci, undefined)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" placeholder="ornek@mail.com" required autoComplete="email" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Şifre</Label>
          <Link href="/sifremi-unuttum" className="text-xs text-[#1B6B8A] hover:underline">
            Şifremi unuttum
          </Link>
        </div>
        <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
      </div>

      <TurnstileWidget resetKey={state} />

      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <p>{state.error}</p>
          {state.unverifiedEmail && (
            <Link
              href={`/ucretsiz-basla/dogrula?email=${encodeURIComponent(state.unverifiedEmail)}`}
              className="mt-1 inline-block font-medium text-[#1B6B8A] underline"
            >
              Doğrulama e-postasını tekrar gönder
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>
    </form>
  )
}
