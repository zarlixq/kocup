"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState, useEffect } from "react"
import { submitBasvuru } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export default function BasvuruPage() {
  const [state, action, pending] = useActionState(submitBasvuru, undefined)

  useEffect(() => {
    if (state?.success && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "conversion", {
        send_to: "AW-18185085898/89APCKGYsrIcEMrHqd9D",
        value: 1.0,
        currency: "TRY",
      })
    }
  }, [state?.success])

  if (state?.success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Başvurun Alındı!</h1>
          <p className="text-zinc-500 mb-6">
            Başvurun değerlendirmeye alındı. En kısa sürede seninle iletişime geçeceğiz.
          </p>
          <Link href="/" className="text-[#1B6B8A] font-medium hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="KoçUp" width={120} height={40} className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Başvuru Formu</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Bilgilerini doldur, seni en uygun koçla buluşturalım.
          </p>

          <form action={action} className="space-y-5">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-zinc-700">Öğrenci Bilgileri</legend>

              <div className="space-y-1.5">
                <Label htmlFor="full_name">Ad Soyad *</Label>
                <Input id="full_name" name="full_name" placeholder="Ahmet Yılmaz" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-posta *</Label>
                  <Input id="email" name="email" type="email" placeholder="ornek@mail.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="05XX XXX XX XX" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grade">Sınıf *</Label>
                <select
                  id="grade"
                  name="grade"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Sınıf seçin</option>
                  <option value="9">9. Sınıf</option>
                  <option value="10">10. Sınıf</option>
                  <option value="11">11. Sınıf</option>
                  <option value="12">12. Sınıf</option>
                  <option value="Mezun">Mezun</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-zinc-700">Hedef (İsteğe Bağlı)</legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="target_university">Hedef Üniversite</Label>
                  <Input id="target_university" name="target_university" placeholder="ODTÜ" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target_department">Hedef Bölüm</Label>
                  <Input id="target_department" name="target_department" placeholder="Tıp" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target_ranking">Hedef Sıra</Label>
                <Input id="target_ranking" name="target_ranking" type="number" min="1" placeholder="örn. 5000" />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-zinc-700">Veli Bilgileri</legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="parent_name">Veli Adı *</Label>
                  <Input id="parent_name" name="parent_name" placeholder="Fatma Yılmaz" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parent_phone">Veli Telefonu *</Label>
                  <Input id="parent_phone" name="parent_phone" type="tel" placeholder="05XX XXX XX XX" required />
                </div>
              </div>
            </fieldset>

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
            )}

            <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
              {pending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Zaten hesabın var mı?{" "}
          <Link href="/giris/ogrenci" className="text-[#1B6B8A] font-medium hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}