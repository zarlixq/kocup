import type { Metadata } from "next"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { GeriSayim } from "@/components/tools/geri-sayim"
import {
  ToolHero,
  ToolContentSection,
  RelatedBlogCallout,
  BackToTools,
} from "@/components/tools/tool-page-shell"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { getSiteUrl } from "@/lib/site-url"
import { getTool } from "@/lib/tools/config"

const siteUrl = getSiteUrl()
const tool = getTool("geri-sayim")!

export const metadata: Metadata = {
  title: "YKS & LGS Geri Sayım — Sınava Kaç Gün Kaldı",
  description:
    "TYT, AYT ve LGS sınavlarına kaç gün, saat, dakika kaldığını canlı geri sayımla izle. Hedefe odaklan, planı sıkı tut.",
  keywords: tool.keywords,
  alternates: { canonical: tool.publicPath },
  openGraph: {
    title: "YKS & LGS Geri Sayım",
    description: "Sınava kaç gün kaldığını canlı geri sayımla gör.",
    url: `${siteUrl}${tool.publicPath}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YKS & LGS Geri Sayım",
    description: "Sınava kaç gün kaldığını canlı geri sayımla gör.",
  },
}

export default function GeriSayimPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="pb-24 bg-zinc-50/40 min-h-screen">
        <ToolHero
          eyebrow="Geri Sayım"
          title="YKS & LGS Geri Sayım Sayacı"
          description="Sınava kaç gün, saat, dakika ve saniye kaldığını canlı izle."
        />
        <ToolContentSection>
          <GeriSayim />

            <div className="rounded-2xl bg-white border border-zinc-200 p-5 sm:p-6">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-3">
                Geri sayımı nasıl kullan?
              </h2>
              <div className="space-y-3 text-sm text-zinc-600 leading-relaxed">
                <p>
                  Geri sayım tek başına motivasyon değildir; planın taşıyıcısıdır. Kalan gün
                  sayısını <strong className="text-zinc-900">haftalık çalışma haftalarına</strong>{" "}
                  bölerek konuları dengeli dağıtırsın.
                </p>
                <p>
                  Sınav tarihleri ÖSYM ve MEB tarafından yıl başında açıklanır. Resmi takvim
                  açıklanmadan önceki dönemde tahmini tarih kullanılır.
                </p>
              </div>
            </div>

            {tool.relatedBlogSlug && tool.relatedBlogTitle && (
              <RelatedBlogCallout
                blogSlug={tool.relatedBlogSlug}
                blogTitle={tool.relatedBlogTitle}
                caption="Kalan zamanı plana dönüştürmek için yol haritasını oku."
              />
            )}

          <BackToTools />
        </ToolContentSection>
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
