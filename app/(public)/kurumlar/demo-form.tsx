"use client"

import { useActionState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitInstitutionInquiry } from "./actions"

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function DemoForm() {
  const [state, action, pending] = useActionState(submitInstitutionInquiry, undefined)

  if (state?.success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-green-600" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Talebiniz alındı</h3>
        <p className="text-sm text-zinc-500">
          Talebiniz alındı, en kısa sürede size döneceğiz.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Ad Soyad *</Label>
          <Input id="full_name" name="full_name" placeholder="Ahmet Yılmaz" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="institution_name">Kurum Adı *</Label>
          <Input id="institution_name" name="institution_name" placeholder="Örnek Dershanesi" required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon *</Label>
          <Input id="phone" name="phone" type="tel" placeholder="05XX XXX XX XX" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" placeholder="ornek@mail.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="student_count">Öğrenci Sayısı</Label>
          <select id="student_count" name="student_count" className={SELECT_CLASS} defaultValue="">
            <option value="">Seçin (opsiyonel)</option>
            <option value="1-25">1-25</option>
            <option value="25-50">25-50</option>
            <option value="50-100">50-100</option>
            <option value="100+">100+</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="coach_count">Koç Sayısı</Label>
          <select id="coach_count" name="coach_count" className={SELECT_CLASS} defaultValue="">
            <option value="">Seçin (opsiyonel)</option>
            <option value="1-5">1-5</option>
            <option value="5-10">5-10</option>
            <option value="10+">10+</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Mesaj</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Kurumunuz ve ihtiyaçlarınız hakkında kısaca bilgi verin..."
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
          İletişim kurulması için verilerimin işlenmesini kabul ediyorum.
        </span>
      </label>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
        {pending ? "Gönderiliyor..." : "Talep Gönder"}
      </Button>
    </form>
  )
}
