"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { BrandLogo } from "@/components/brand/logo"
import { submitBasvuru } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Google Ads conversion etiketi hesaba özeldir → HARDCODE ETME.
// Değer `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` env'inden okunur.
// Format: "AW-XXXXXXXXXX/YYYYYYYYYYYYYYYYYY" (Google Ads > Conversions > "Tag setup").
// TODO(env): Production env'e NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID ekle.
// Env tanımlı değilse mevcut (çalışan) değer fallback olarak kullanılır ki akış bozulmasın.
const ADS_CONVERSION_TARGET =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "AW-18185085898/89APCKGYsrIcEMrHqd9D"

type Segment = "lgs" | "yks"

// LGS/YKS'ye göre sınıf seçenekleri. Segment seçilmeden (null) eski tam liste.
const GRADE_OPTIONS: Record<Segment | "none", Array<[string, string]>> = {
  lgs: [
    ["5", "5. Sınıf"],
    ["6", "6. Sınıf"],
    ["7", "7. Sınıf"],
    ["8", "8. Sınıf"],
  ],
  yks: [
    ["9", "9. Sınıf"],
    ["10", "10. Sınıf"],
    ["11", "11. Sınıf"],
    ["12", "12. Sınıf"],
    ["Mezun", "Mezun"],
  ],
  none: [
    ["7", "7. Sınıf"],
    ["8", "8. Sınıf (LGS)"],
    ["9", "9. Sınıf"],
    ["10", "10. Sınıf"],
    ["11", "11. Sınıf"],
    ["12", "12. Sınıf"],
    ["Mezun", "Mezun"],
  ],
}

export default function BasvuruPage() {
  const [state, action, pending] = useActionState(submitBasvuru, undefined)
  const [segment, setSegment] = useState<Segment | null>(null)
  const isLgs = segment === "lgs"

  useEffect(() => {
    // Sadece başvuru BAŞARIYLA oluştuğunda ateşle (sayfa açılışında / hatada DEĞİL).
    if (!state?.success) return
    // window.gtag tanımsızsa güvenli no-op.
    if (typeof window === "undefined" || typeof window.gtag !== "function") return

    // Google Ads — conversion
    window.gtag("event", "conversion", {
      send_to: ADS_CONVERSION_TARGET,
      value: 1.0,
      currency: "TRY",
    })

    // GA4 — lead event
    window.gtag("event", "generate_lead", {
      value: 1.0,
      currency: "TRY",
    })
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
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            {isLgs ? "Başvurunuz Alındı!" : "Başvurun Alındı!"}
          </h1>
          <p className="text-zinc-500 mb-6">
            {isLgs
              ? "Başvurunuz değerlendirmeye alındı. En kısa sürede sizinle iletişime geçeceğiz."
              : "Başvurun değerlendirmeye alındı. En kısa sürede seninle iletişime geçeceğiz."}
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
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Başvuru Formu</h1>
          <p className="text-sm text-zinc-500 mb-6">
            {isLgs
              ? "Çocuğunuz için bilgileri doldurun, en uygun koçla buluşturalım."
              : "Bilgilerini doldur, seni en uygun koçla buluşturalım."}
          </p>

          {/* 1. adım: sınava göre segment seçimi (LGS/YKS) */}
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold text-zinc-700">Hangi sınava hazırlanıyorsun?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={segment === "lgs"}
                onClick={() => setSegment("lgs")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  segment === "lgs"
                    ? "border-[#1B6B8A] bg-[#1B6B8A]/5 ring-2 ring-[#1B6B8A]/30"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-900">LGS</span>
                <span className="block text-xs text-zinc-500">Ortaokul (5-8. sınıf)</span>
              </button>
              <button
                type="button"
                aria-pressed={segment === "yks"}
                onClick={() => setSegment("yks")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  segment === "yks"
                    ? "border-[#F97316] bg-[#F97316]/5 ring-2 ring-[#F97316]/30"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-900">YKS</span>
                <span className="block text-xs text-zinc-500">Lise (9-12 / Mezun)</span>
              </button>
            </div>
          </div>

          <form action={action} className="space-y-5">
            {/* Segment, FormData ile sunucuya taşınır (buton state'i native input değil). */}
            <input type="hidden" name="segment" value={segment ?? ""} />

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-zinc-700">
                {isLgs ? "Öğrenci Bilgileri (Çocuğunuz)" : "Öğrenci Bilgileri"}
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="full_name">{isLgs ? "Öğrencinin Adı Soyadı *" : "Ad Soyad *"}</Label>
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
                  key={segment ?? "none"}
                  id="grade"
                  name="grade"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>
                    Sınıf seçin
                  </option>
                  {GRADE_OPTIONS[segment ?? "none"].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* Üniversite hedefi YKS'ye özgü; LGS (ortaokul) segmentinde gizlenir. */}
            {!isLgs && (
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
            )}

            <fieldset
              className={`space-y-4 ${
                isLgs ? "rounded-xl border border-[#1B6B8A]/30 bg-[#1B6B8A]/5 p-4" : ""
              }`}
            >
              <legend className="text-sm font-semibold text-zinc-700">Veli Bilgileri</legend>

              {isLgs && (
                <p className="text-xs text-zinc-500">
                  Görüşmeyi veli ile planlıyoruz; lütfen size ulaşabileceğimiz veli bilgilerini girin.
                </p>
              )}

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

            <label className="flex items-start gap-2.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                name="kvkk"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-[#1B6B8A]"
              />
              <span>
                <Link href="/kvkk" target="_blank" className="text-[#1B6B8A] underline">
                  KVKK Aydınlatma Metni
                </Link>{" "}
                ve{" "}
                <Link href="/gizlilik" target="_blank" className="text-[#1B6B8A] underline">
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum; öğrenciye ait bilgilerin işlenmesini kabul ediyorum. Öğrenci 18
                yaşından küçükse veli/vasi olarak açık rıza veriyorum.
              </span>
            </label>

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