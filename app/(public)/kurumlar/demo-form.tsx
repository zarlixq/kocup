"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { submitInstitutionInquiry } from "./actions"

const ILLER = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara",
  "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman",
  "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne",
  "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun",
  "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri",
  "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya",
  "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun",
  "Şanlıurfa", "Siirt", "Sinop", "Şırnak", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
]

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function DemoForm() {
  const [state, action, pending] = useActionState(submitInstitutionInquiry, undefined)

  if (state?.success) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-green-600" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Talebiniz alındı</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          Talebiniz alındı, aynı gün dönüş yapıyoruz.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="institution_name">Dershane Adı *</Label>
        <Input
          id="institution_name"
          name="institution_name"
          placeholder="Örnek Kurs Merkezi"
          autoComplete="organization"
          required
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">İl *</Label>
          <select id="city" name="city" required defaultValue="" className={SELECT_CLASS}>
            <option value="" disabled>
              İl seçin
            </option>
            {ILLER.map((il) => (
              <option key={il} value={il}>
                {il}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Yetkili Adı *</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Ad Soyad"
            autoComplete="name"
            required
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="05XX XXX XX XX"
            autoComplete="tel"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta (opsiyonel)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="ornek@mail.com"
            autoComplete="email"
            className="h-11"
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-[13px] leading-snug text-zinc-600 pt-1">
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
          kapsamında verilerimin işlenmesini kabul ediyorum.
        </span>
      </label>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-12 text-base font-bold bg-[#F97316] hover:bg-[#ea6c10] shadow-md shadow-orange-500/20"
      >
        {pending ? "Gönderiliyor..." : "Demo Talep Et"}
      </Button>
      <p className="text-center text-xs text-zinc-400">Aynı gün dönüş yapıyoruz.</p>
    </form>
  )
}
