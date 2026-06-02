import type { Metadata } from "next"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { TercihRehberi } from "@/components/tools/tercih-rehberi"
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
const tool = getTool("tercih-rehberi")!

export const metadata: Metadata = {
  title: "Tercih Rehberi — YÖK Atlas Nasıl Kullanılır",
  description:
    "YÖK Atlas üzerinden taban puan, başarı sıralaması ve bölüm verilerine nasıl bakılır? Yanlış tercihten kaçınmak için adım adım rehber.",
  keywords: tool.keywords,
  alternates: { canonical: tool.publicPath },
  openGraph: {
    title: "Tercih Rehberi — YÖK Atlas Adım Adım",
    description: "Taban puan, sıralama ve doğru tercih için resmi kaynağa yönlendirme.",
    url: `${siteUrl}${tool.publicPath}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tercih Rehberi — YÖK Atlas Adım Adım",
    description: "Taban puan, sıralama ve doğru tercih için resmi kaynağa yönlendirme.",
  },
}

export default function TercihRehberiPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="pb-24 bg-zinc-50/40 min-h-screen">
        <ToolHero
          eyebrow="Tercih Rehberi"
          title="YÖK Atlas ile Doğru Tercih"
          description="Resmi kaynağa nasıl bakılır, hangi veriye güvenilir — adım adım."
        />
        <ToolContentSection>
          <TercihRehberi />

            {tool.relatedBlogSlug && tool.relatedBlogTitle && (
              <RelatedBlogCallout
                blogSlug={tool.relatedBlogSlug}
                blogTitle={tool.relatedBlogTitle}
                caption="Sınav öncesi yol haritasıyla tercih sonrası planın da netleşir."
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
