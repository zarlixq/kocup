"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState } from "react"
import { loginOgrenci } from "@/app/(public)/giris/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OgrenciGirisPage() {
  const [state, action, pending] = useActionState(loginOgrenci, undefined)

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="KoçUp" width={120} height={40} className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Öğrenci Girişi</h1>
          <p className="text-sm text-zinc-500 mb-6">Öğrenci panelinize giriş yapın.</p>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="ornek@mail.com" required autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <span
                  className="text-xs text-zinc-400 cursor-not-allowed"
                  title="Yakında"
                  aria-disabled="true"
                >
                  Şifremi unuttum
                </span>
              </div>
              <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
            )}

            <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
              {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Henüz hesabın yok mu?{" "}
          <Link href="/basvuru" className="text-[#1B6B8A] font-medium hover:underline">
            Başvur
          </Link>
        </p>
      </div>
    </div>
  )
}
