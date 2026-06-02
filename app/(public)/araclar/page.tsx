import type { Metadata } from "next"
import Link from "next/link"
import { Calculator, AlarmClock, TimerReset, Compass, ArrowRight } from "lucide-react"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { TOOLS, type ToolIcon } from "@/lib/tools/config"
import { getSiteUrl } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/seo/schemas"

const siteUrl = getSiteUrl()

const ICONS: Record<ToolIcon, typeof Calculator> = {
  calculator: Calculator,
  "timer-reset": TimerReset,
  "alarm-clock": AlarmClock,
  compass: Compass,
}

export const metadata: Metadata = {
  title: "Ücretsiz Araçlar — Net Hesaplama, Geri Sayım, Pomodoro",
  description:
    "TYT/AYT/LGS net hesaplama, sınav geri sayım sayacı, pomodoro çalışma zamanlayıcısı ve YÖK Atlas tercih rehberi — KoçUp Akademi'den öğrencilere ücretsiz araçlar.",
  keywords:
    "tyt net hesaplama, ayt net hesaplama, lgs net hesaplama, sınav geri sayım, pomodoro, yök atlas, üniversite tercihi",
  alternates: { canonical: "/araclar" },
  openGraph: {
    title: "Ücretsiz Öğrenci Araçları — KoçUp Akademi",
    description:
      "Net hesaplama, geri sayım, pomodoro ve tercih rehberi. YKS ve LGS öğrencileri için ücretsiz.",
    url: `${siteUrl}/araclar`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ücretsiz Öğrenci Araçları — KoçUp Akademi",
    description:
      "Net hesaplama, geri sayım, pomodoro ve tercih rehberi. YKS ve LGS öğrencileri için ücretsiz.",
  },
}

export default function AraclarHubPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="pb-24 bg-zinc-50/40 min-h-screen">
        <section className="relative bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white px-5 md:px-8 lg:px-12 pt-14 md:pt-20 pb-20 md:pb-24 overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F97316]/15 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1B6B8A]/45 blur-3xl rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-6xl mx-auto relative">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
              Ücretsiz Araçlar
            </span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-3xl">
              YKS ve LGS için{" "}
              <span className="text-[#F97316]">tek tıkla</span> kullanılabilen araçlar
            </h1>
            <p className="text-white/75 text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
              Net hesaplama, sınav geri sayımı, pomodoro odak sayacı ve tercih rehberi. Hepsi ücretsiz,
              hepsi kayıt gerektirmiyor.
            </p>
          </div>
        </section>

        <section className="px-5 md:px-8 lg:px-12 -mt-12 md:-mt-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {TOOLS.map((tool) => {
                const Icon = ICONS[tool.iconKey]
                return (
                  <Link
                    key={tool.slug}
                    href={tool.publicPath}
                    className="group relative rounded-2xl border border-zinc-200 bg-white p-6 md:p-7 hover:border-[#F97316]/40 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-[#F97316] transition-colors">
                        <Icon
                          className="w-6 h-6 text-[#F97316] group-hover:text-white transition-colors"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-1.5">
                          {tool.shortTitle}
                        </h2>
                        <p className="text-sm text-zinc-500 leading-relaxed">{tool.description}</p>
                        <div className="inline-flex items-center gap-1 text-sm font-semibold text-[#F97316] mt-3 group-hover:gap-2 transition-all">
                          Aç
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-zinc-600 mb-3">
                Bireysel takiple birlikte daha fazlasını almak ister misin?
              </p>
              <Link
                href="/basvuru"
                className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#ea6c10] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors min-h-[44px] shadow-md shadow-orange-500/20"
              >
                Ücretsiz Başvur
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${siteUrl}/araclar`,
            name: "Ücretsiz Öğrenci Araçları",
            url: `${siteUrl}/araclar`,
            description:
              "TYT/AYT/LGS net hesaplama, sınav geri sayımı, pomodoro ve YÖK Atlas tercih rehberi.",
            inLanguage: "tr-TR",
            isPartOf: { "@id": `${siteUrl}#website` },
            hasPart: TOOLS.map((t) => ({
              "@type": "WebApplication",
              name: t.title,
              url: `${siteUrl}${t.publicPath}`,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              description: t.description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
            })),
          },
          breadcrumbSchema([
            { name: "Ana Sayfa", url: `${siteUrl}/` },
            { name: "Araçlar", url: `${siteUrl}/araclar` },
          ]),
        ]}
      />
    </>
  )
}
