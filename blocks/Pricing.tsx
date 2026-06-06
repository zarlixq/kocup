"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Plan = {
  badge: string
  name: string
  price: string
  desc: string
  features: string[]
  featured: boolean
}

const PLANS: Plan[] = [
  {
    badge: "Başlangıç",
    name: "Temel",
    price: "1.500",
    desc: "Koçluk dünyasına adım atmak isteyenler için.",
    features: [
      "Haftada 1 görüşme (45 dk)",
      "Kişisel çalışma programı",
      "WhatsApp destek",
      "Aylık ilerleme raporu",
    ],
    featured: false,
  },
  {
    badge: "En Popüler",
    name: "Pro",
    price: "2.700",
    desc: "Ciddi hedefleri olan öğrenciler için en çok tercih edilen paket.",
    features: [
      "Haftada 2 görüşme (45 dk)",
      "Kişisel çalışma programı",
      "7/24 WhatsApp destek",
      "Haftalık ilerleme raporu",
      "Veli bilgilendirme görüşmesi",
      "Deneme sınavı analizi",
    ],
    featured: true,
  },
  {
    badge: "Yoğun Dönem",
    name: "Sprint",
    price: "3.900",
    desc: "Sınava 3 ay kala yoğun hazırlık gerektirenler için.",
    features: [
      "Haftada 3 görüşme (45 dk)",
      "Günlük program takibi",
      "Anlık mesaj desteği",
      "Haftalık veli raporu",
      "Sınav simülasyonu",
      "Psikolojik destek seansı",
    ],
    featured: false,
  },
]

export default function Pricing() {
  const router = useRouter()
  const [selected, setSelected] = useState<Plan | null>(null)

  return (
    <section id="fiyatlar" className="bg-white py-20 md:py-28 px-5 md:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14 motion-safe:animate-fade-up">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Paketler
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Net, şeffaf{" "}
            <span className="text-[#1B6B8A]">fiyatlandırma.</span>
          </h2>
          <p className="text-zinc-500 text-base mt-4 leading-relaxed">
            Gizli ücret yok. İstediğin zaman paket değiştirebilirsin. İlk tanışma seansı her zaman ücretsiz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 md:p-7 h-full flex flex-col transition-transform duration-200 hover:-translate-y-1 ${
                plan.featured
                  ? "bg-[#0F1F28] text-white border-2 border-[#F97316] shadow-xl shadow-orange-500/10"
                  : "bg-white border border-zinc-200 text-zinc-900"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F97316] text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                  Önerilen
                </div>
              )}

              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full w-fit mb-5 ${
                  plan.featured ? "bg-white/10 text-orange-200" : "bg-orange-50 text-[#F97316]"
                }`}
              >
                {plan.badge}
              </span>

              <div className={`text-sm font-bold mb-1 ${plan.featured ? "text-zinc-300" : "text-zinc-500"}`}>
                {plan.name} Paket
              </div>

              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-extrabold tracking-tight">₺{plan.price}</span>
                <span className="text-sm mb-1.5 text-zinc-400">/ ay</span>
              </div>

              <p className={`text-xs leading-relaxed mb-6 ${plan.featured ? "text-zinc-400" : "text-zinc-500"}`}>
                {plan.desc}
              </p>

              <ul className="space-y-3 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`mt-0.5 shrink-0 w-4 h-4 ${
                        plan.featured ? "text-[#F97316]" : "text-[#1B6B8A]"
                      }`}
                      strokeWidth={2.5}
                    />
                    <span className={plan.featured ? "text-zinc-300" : "text-zinc-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setSelected(plan)}
                className={`block w-full text-center font-semibold py-3.5 rounded-full text-sm transition-colors ${
                  plan.featured
                    ? "bg-[#F97316] text-white hover:bg-[#ea6c10]"
                    : "border border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
                }`}
              >
                {plan.featured ? "Hemen Başvur" : "Başvur"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          Tüm paketler aylık yenilenebilir. İstediğin zaman iptal edebilirsin.
        </p>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#F97316] w-fit mb-2">
                  {selected.badge}
                </div>
                <DialogTitle className="text-xl text-zinc-900">
                  {selected.name} Paket — ₺{selected.price}/ay
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-600 leading-relaxed pt-2">
                  Paket satın almak için önce başvurunu tamamla. Seninle iletişime geçip uygun koç
                  eşleştirmesi yapacağız. İlk tanışma seansı ücretsiz.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-600 hover:bg-zinc-50 font-semibold py-3 rounded-full text-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = selected.name
                    setSelected(null)
                    router.push(`/basvuru?paket=${encodeURIComponent(name)}`)
                  }}
                  className="flex-1 bg-[#1B6B8A] hover:bg-[#155a75] text-white font-semibold py-3 rounded-full text-sm transition-colors"
                >
                  Başvuru Yap
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
