"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SifreBelirle() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem("password") as HTMLInputElement).value
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value

    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.")
      return
    }
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı.")
      return
    }

    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setPending(false)

    if (error) {
      toast.error("Şifre belirlenemedi. Bağlantın süresi dolmuş olabilir.")
      return
    }

    toast.success("Şifren belirlendi, yönlendiriliyorsun...")

    // Rol'e göre yönlendirme — profile'dan al
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .maybeSingle()

    const dest =
      profile?.role === "coach" ? "/koc" :
      profile?.role === "admin" ? "/mudur" :
      "/ogrenci"

    router.push(dest)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="KoçUp" width={120} height={40} className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Şifreni Belirle</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Hesabın için güçlü bir şifre oluştur.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Yeni Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="En az 8 karakter"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Şifre Tekrar</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                placeholder="Şifreyi tekrar girin"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
              {pending ? "Kaydediliyor..." : "Şifremi Belirle"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
