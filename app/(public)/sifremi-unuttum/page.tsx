"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand/logo"
import { requestPasswordReset } from "./actions"

const COOLDOWN_SECONDS = 60

export default function SifremiUnuttumPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (state?.success) {
      setCooldown(COOLDOWN_SECONDS)
    }
  }, [state])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          {state?.success ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900">E-posta gönderildi</h1>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Eğer{" "}
                <span className="font-medium text-zinc-900">{state.email}</span>{" "}
                adresine bağlı bir hesabınız varsa, şifre sıfırlama bağlantısı içeren
                bir e-posta aldınız. Bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz.
              </p>
              <p className="text-xs text-zinc-500 pt-1">
                E-postayı göremediyseniz spam klasörünü kontrol edin.
              </p>

              <form action={action} className="pt-3 space-y-3">
                <input type="hidden" name="email" value={state.email} />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={pending || cooldown > 0}
                >
                  {cooldown > 0
                    ? `Tekrar gönder (${cooldown}s)`
                    : pending
                    ? "Gönderiliyor..."
                    : "Tekrar gönder"}
                </Button>
              </form>

              <div className="pt-3 flex flex-col gap-2 text-sm">
                <Link
                  href="/giris/ogrenci"
                  className="text-[#1B6B8A] font-medium hover:underline inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Girişe dön
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                  <Mail className="h-5 w-5 text-[#F97316]" />
                </div>
                <h1 className="text-xl font-bold text-zinc-900 mb-1">Şifremi Unuttum</h1>
                <p className="text-sm text-zinc-500">
                  E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
                </p>
              </div>

              <form action={action} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="ornek@mail.com"
                    required
                    autoComplete="email"
                  />
                </div>

                {state?.success === false && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {state.error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#1B6B8A] hover:bg-[#155a75]"
                  disabled={pending}
                >
                  {pending ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t border-zinc-100 text-center text-sm">
                <Link
                  href="/giris/ogrenci"
                  className="text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Girişe dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
