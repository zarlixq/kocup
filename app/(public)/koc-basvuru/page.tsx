"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Check } from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitKocBasvuru } from "./actions"

export default function KocBasvuruPage() {
  const [state, action, pending] = useActionState(submitKocBasvuru, undefined)

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          {state?.success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-green-600" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">Başvurun alındı</h1>
              <p className="text-sm text-zinc-500 mb-6">
                Başvurun bize ulaştı, en kısa sürede seninle iletişime geçeceğiz.
              </p>
              <Link href="/" className="text-[#1B6B8A] font-medium hover:underline">
                Ana sayfaya dön
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-900 mb-1">Koç Başvuru Formu</h1>
              <p className="text-sm text-zinc-500 mb-6">
                Bireysel koç olarak KoçUp panelini kullanmak için bilgilerini bırak, sana dönelim.
              </p>

              <form action={action} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="ad_soyad">Ad Soyad *</Label>
                  <Input id="ad_soyad" name="ad_soyad" placeholder="Ahmet Yılmaz" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="telefon">Telefon *</Label>
                    <Input id="telefon" name="telefon" type="tel" placeholder="05XX XXX XX XX" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-posta</Label>
                    <Input id="email" name="email" type="email" placeholder="ornek@mail.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brans">Branş</Label>
                    <Input id="brans" name="brans" placeholder="Matematik" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deneyim_yili">Deneyim (yıl)</Label>
                    <Input id="deneyim_yili" name="deneyim_yili" type="number" min="0" max="60" placeholder="örn. 5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cv_url">CV / LinkedIn Bağlantısı</Label>
                  <Input id="cv_url" name="cv_url" type="url" placeholder="https://..." />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mesaj">Mesaj</Label>
                  <Textarea
                    id="mesaj"
                    name="mesaj"
                    rows={4}
                    placeholder="Koçluk deneyimin ve beklentilerin hakkında kısaca bilgi ver..."
                  />
                </div>

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
                    </Link>{" "}
                    kapsamında verilerimin işlenmesini kabul ediyorum.
                  </span>
                </label>

                {state?.error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
                )}

                <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
                  {pending ? "Gönderiliyor..." : "Başvuruyu Gönder"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
