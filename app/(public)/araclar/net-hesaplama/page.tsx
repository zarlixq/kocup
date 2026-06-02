import type { Metadata } from "next"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { NetHesaplama } from "@/components/tools/net-hesaplama"
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
const tool = getTool("net-hesaplama")!

export const metadata: Metadata = {
  title: "Net Hesaplama — TYT, AYT ve LGS Net Hesaplayıcı",
  description:
    "TYT, AYT ve LGS netini saniyeler içinde hesapla. YKS için 4 yanlış 1 doğru, LGS için 3 yanlış 1 doğru kuralı uygulanır.",
  keywords: tool.keywords,
  alternates: { canonical: tool.publicPath },
  openGraph: {
    title: "Net Hesaplama — TYT, AYT ve LGS",
    description: "Doğru/yanlış sayılarınla ders başına ve toplam neti anında gör.",
    url: `${siteUrl}${tool.publicPath}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Net Hesaplama — TYT, AYT ve LGS",
    description: "Doğru/yanlış sayılarınla ders başına ve toplam neti anında gör.",
  },
}

export default function NetHesaplamaPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="pb-24 bg-zinc-50/40 min-h-screen">
        <ToolHero
          eyebrow="Net Hesaplama"
          title="TYT, AYT, LGS Net Hesaplayıcı"
          description="Doğru ve yanlış sayılarını gir, ders başına ve toplam neti anında gör."
        />
        <ToolContentSection>
          <NetHesaplama />

            <div className="rounded-2xl bg-white border border-zinc-200 p-5 sm:p-6">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 mb-3">
                Net nasıl hesaplanır?
              </h2>
              <div className="space-y-3 text-sm text-zinc-600 leading-relaxed">
                <p>
                  <strong className="text-zinc-900">YKS (TYT/AYT) formülü:</strong> Doğru − (Yanlış /
                  4). Yani 4 yanlış 1 doğruyu götürür.
                </p>
                <p>
                  <strong className="text-zinc-900">LGS formülü:</strong> Doğru − (Yanlış / 3). LGS&apos;de
                  3 yanlış 1 doğruyu götürür.
                </p>
                <p>
                  Boş bıraktığın sorular nete etki etmez. Bu hesaplama ÖSYM ve MEB tarafından
                  kullanılan resmi yöntemdir.
                </p>
              </div>
            </div>

            {tool.relatedBlogSlug && tool.relatedBlogTitle && (
              <RelatedBlogCallout
                blogSlug={tool.relatedBlogSlug}
                blogTitle={tool.relatedBlogTitle}
                caption="Net hesaplamak başlangıç. Asıl iş hangi netleri yükseltmen gerektiğini bilmekte."
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
