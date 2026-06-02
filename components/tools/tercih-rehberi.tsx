"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  ExternalLink,
  Search,
  BarChart3,
  ListChecks,
  Map,
  Compass,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { trackToolUse } from "@/lib/analytics/track"

const STEPS = [
  {
    icon: Search,
    title: "1. YÖK Atlas'a gir",
    body: "yokatlas.yok.gov.tr — Türkiye'deki tüm üniversite bölümlerinin resmi geçmiş yıl verilerine buradan ulaşırsın. Başka site, başka kaynak gerekmez.",
  },
  {
    icon: Map,
    title: "2. Doğru aramayı yap",
    body: "Bölüm adını ve puan türünü (sayısal/eşit ağırlık/sözel/dil) seç. Bölümün geçtiği tüm üniversiteler tek listede karşına gelir.",
  },
  {
    icon: BarChart3,
    title: "3. Taban puana DEĞİL, başarı sıralamasına bak",
    body: "Puan baremleri yıldan yıla değişir; sıralama görece sabittir. Geçen yıl 50.000. sıradaki bölüm bu yıl da yaklaşık o civar açılır. Hedefini sıralama olarak belirle.",
  },
  {
    icon: ListChecks,
    title: "4. Tercih listeni 3 katmanda kur",
    body: "Hedef (sıralamandan üst, zorlu), Beklenen (sıralamana yakın) ve Garanti (sıralamandan kolay) bölümler. Her katmandan dengeli sayıda tercih yap.",
  },
]

const WARNINGS = [
  'Forumdan, gruplardan duyduğun "tahmin" puanlara güvenme. Tek resmi veri YÖK Atlas\'tadır.',
  "Boş kontenjanı çok olan bölümleri ilk tercihlerine yazma — taban puanı yanıltıcı düşük olabilir.",
  "Vakıf üniversitesi bursları, yurt durumu, şehir tercihi gibi kişisel faktörler de önemli — sadece puan/sıralama yetmez.",
]

export function TercihRehberi() {
  // YÖK Atlas dış linkine tıklayınca OTURUM/MOUNT başına BİR KEZ tool_use eventi gönder.
  // Mount'ta gönderme — sayfa sadece açılmış olabilir, gerçek "kullanım" linke tıklamadır.
  const trackedRef = useRef(false)
  const handleAtlasClick = () => {
    if (trackedRef.current) return
    trackedRef.current = true
    trackToolUse("tercih-rehberi")
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-[#1B6B8A] to-[#0F4A60] text-white border-0">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2 leading-tight">
              YÖK Atlas — Tek Resmi Kaynak
            </h2>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed mb-4">
              Üniversite tercihinde geçen yıllara ait taban puan, başarı sıralaması, kontenjan ve yerleşen
              profili gibi tüm <em>resmi</em> veriler yokatlas.yok.gov.tr&apos;dedir.
            </p>
            <a
              href="https://yokatlas.yok.gov.tr/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAtlasClick}
              className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#ea6c10] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors min-h-[44px]"
            >
              YÖK Atlas&apos;ı Aç
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-lg sm:text-xl font-bold text-zinc-900 mb-4">
          Adım Adım Tercih Kararı
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.title} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#F97316]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-900 mb-1.5">{step.title}</div>
                    <p className="text-sm text-zinc-600 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="p-5 sm:p-6 bg-amber-50/60 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-zinc-900 mb-2">Dikkat Edilmesi Gerekenler</div>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {WARNINGS.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-amber-600 shrink-0" aria-hidden="true">•</span>
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-bold text-zinc-900">Tercih sürecini koçunla planla</div>
            <p className="text-sm text-zinc-500 mt-1">
              Sınav sonrası tercih danışmanlığı KoçUp paketlerinde dahildir.
            </p>
          </div>
          <Link
            href="/basvuru"
            className="inline-flex items-center gap-1.5 bg-[#F97316] hover:bg-[#ea6c10] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shrink-0 min-h-[44px]"
          >
            Hemen Başvur
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  )
}
