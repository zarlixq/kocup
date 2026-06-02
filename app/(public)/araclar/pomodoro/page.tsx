import type { Metadata } from "next"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { PomodoroPublic } from "@/components/tools/pomodoro-public"
import {
  ToolHero,
  RelatedBlogCallout,
  BackToTools,
} from "@/components/tools/tool-page-shell"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { getSiteUrl } from "@/lib/site-url"
import { getTool } from "@/lib/tools/config"

const siteUrl = getSiteUrl()
const tool = getTool("pomodoro")!

export const metadata: Metadata = {
  title: "Pomodoro — Ders Çalışma Zamanlayıcısı",
  description:
    "25 dakika odak, 5 dakika mola. Pomodoro tekniğiyle dikkatini topla ve dağılmadan çalış.",
  keywords: tool.keywords,
  alternates: { canonical: tool.publicPath },
  openGraph: {
    title: "Pomodoro — Ders Çalışma Zamanlayıcısı",
    description: "25 dakika odak, 5 dakika mola. Telefon dikkat dağıtmadan çalış.",
    url: `${siteUrl}${tool.publicPath}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pomodoro — Ders Çalışma Zamanlayıcısı",
    description: "25 dakika odak, 5 dakika mola. Telefon dikkat dağıtmadan çalış.",
  },
}

export default function PomodoroPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="pb-24 bg-zinc-50/40 min-h-screen">
        <ToolHero
          eyebrow="Pomodoro"
          title="Pomodoro Çalışma Zamanlayıcısı"
          description="25 dakika odak, 5 dakika mola. Dikkatini topla, dağılmadan ilerle."
        />
        <section className="px-5 md:px-8 lg:px-12 -mt-10 md:-mt-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <PomodoroPublic withProvider={true} />

            <div className="rounded-2xl bg-white border border-zinc-200 p-5 sm:p-6">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-3">
                Pomodoro neden işe yarar?
              </h2>
              <div className="space-y-3 text-sm text-zinc-600 leading-relaxed">
                <p>
                  Beyin sürekli aynı seviyede odak tutamaz. 25 dakikalık kısa bloklar dikkatini taze
                  tutar, mola döngüleri öğrenmeyi pekiştirir.
                </p>
                <p>
                  Telefonu uzaklaştır, sadece bir kaynakla başla, blok bitene kadar başka sekmeye
                  geçme. Tek tek tamamlanmış pomodorolar, bitmek bilmeyen &ldquo;açık çalışma&rdquo; saatlerinden
                  çok daha verimli ilerletir.
                </p>
              </div>
            </div>

            {tool.relatedBlogSlug && tool.relatedBlogTitle && (
              <RelatedBlogCallout
                blogSlug={tool.relatedBlogSlug}
                blogTitle={tool.relatedBlogTitle}
                caption="Verim teknikleriyle dikkatini topla, çalışma süresini netine çevir."
              />
            )}

            <BackToTools />
          </div>
        </section>
      </main>
      <Footer />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": `${siteUrl}${tool.publicPath}`,
            name: tool.title,
            url: `${siteUrl}${tool.publicPath}`,
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            description: tool.longDescription,
            inLanguage: "tr-TR",
            offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
            publisher: { "@id": `${siteUrl}#organization` },
          },
          breadcrumbSchema([
            { name: "Ana Sayfa", url: `${siteUrl}/` },
            { name: "Araçlar", url: `${siteUrl}/araclar` },
            { name: tool.shortTitle, url: `${siteUrl}${tool.publicPath}` },
          ]),
        ]}
      />
    </>
  )
}
