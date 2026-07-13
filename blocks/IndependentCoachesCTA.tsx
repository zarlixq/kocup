"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight, BarChart3, CalendarCheck, Wallet, Mail } from "lucide-react"

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.02 21.785h-.005a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.511-5.26c.002-5.45 4.436-9.884 9.889-9.884a9.821 9.821 0 016.987 2.898 9.825 9.825 0 012.892 6.992c-.003 5.45-4.437 9.887-9.888 9.887m8.413-18.298A11.815 11.815 0 0012.02 0C5.495 0 .184 5.31.18 11.836a11.815 11.815 0 001.582 5.918L.057 24l6.41-1.681a11.831 11.831 0 005.66 1.441h.005c6.524 0 11.835-5.31 11.838-11.836a11.778 11.778 0 00-3.467-8.437" />
    </svg>
  )
}

const benefits = [
  {
    icon: BarChart3,
    title: "Görsel öğrenci takip paneli",
    description: "Soru çözüm, deneme net, konu ilerleme grafikleri tek panelde.",
  },
  {
    icon: CalendarCheck,
    title: "Otomatik randevu sistemi",
    description: "Çakışma kontrolü, tekrarlı randevu, hatırlatmalar — kafa karışıklığı yok.",
  },
  {
    icon: Wallet,
    title: "Ödeme & paket yönetimi",
    description: "Aylık ödeme takibi, geç ödeme uyarıları, tek noktadan finans.",
  },
  {
    icon: Mail,
    title: "Veliye haftalık özet",
    description: "Profesyonel raporlar, daha güçlü müşteri ilişkisi.",
  },
]

const WA_URL =
  "https://wa.me/905333704391?text=" +
  encodeURIComponent(
    "Merhaba, KoçUp platformunu bağımsız koç olarak kullanmak istiyorum.",
  )

export default function IndependentCoachesCTA() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0")
            entry.target.classList.remove("opacity-0", "translate-y-6")
          }
        })
      },
      { threshold: 0.1 },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="bagimsiz-koclar"
      className="relative overflow-hidden bg-gradient-to-br from-[#0F1F28] via-[#143A4D] to-[#1B6B8A] py-20 sm:py-24 px-6 md:px-12 lg:px-24"
    >
      {/* Dekoratif accent blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #F97316, transparent)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #1B6B8A, transparent)" }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div
          ref={(el) => {
            refs.current[0] = el
          }}
          className="opacity-0 translate-y-6 transition-all duration-700 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* Sol — başlık + açıklama */}
          <div className="text-center lg:text-left">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3 sm:mb-4">
              Bağımsız Koçlar İçin
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bireysel Koç{" "}
              <span className="text-[#F97316]">musun?</span>
            </h2>
            <p className="text-gray-300 text-base sm:text-lg mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Excel ve WhatsApp kaosundan kurtul. Öğrencilerini profesyonelce yönet,
              velilerine gerçek raporlar sun.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:justify-start justify-center">
              <Link
                href="/koc-basvuru"
                className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#ea6c10] text-white font-semibold text-base px-6 py-3.5 rounded-full shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Başvuru Formu
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1FB855] text-white font-semibold text-base px-6 py-3.5 rounded-full shadow-lg shadow-[#25D366]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <WhatsAppIcon className="w-5 h-5" />
                WhatsApp ile İletişime Geç
              </a>
            </div>
          </div>

          {/* Sağ — fayda kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {benefits.map((b, i) => {
              const Icon = b.icon
              return (
                <div
                  key={b.title}
                  ref={(el) => {
                    refs.current[i + 1] = el
                  }}
                  className="opacity-0 translate-y-6 transition-all duration-700"
                  style={{ transitionDelay: `${(i + 1) * 80}ms` }}
                >
                  <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-5 h-full hover:bg-white/[0.1] transition-colors">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(249,115,22,0.25), rgba(27,107,138,0.25))",
                      }}
                    >
                      <Icon className="h-5 w-5 text-[#F97316]" />
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1 leading-snug">
                      {b.title}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
