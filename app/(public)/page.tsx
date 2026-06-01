import type { Metadata } from "next"
import { Navbar } from "@/blocks/Navbar"
import Hero from "@/blocks/Hero"
import { StatsBar } from "@/blocks/StatsBar"
import HowItWorks from "@/blocks/HowItWorks"
import Features from "@/blocks/Features"
import ExpertCoaches from "@/blocks/ExpertCoaches"
import IndependentCoachesCTA from "@/blocks/IndependentCoachesCTA"
import Pricing from "@/blocks/Pricing"
import FAQ from "@/blocks/FAQ"
import Contact from "@/blocks/Contact"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import {
  organizationSchema,
  websiteSchema,
  faqPageSchema,
  servicePlanSchema,
  expertCoachPersonSchema,
} from "@/lib/seo/schemas"
import { getSiteUrl } from "@/lib/site-url"

const siteUrl = getSiteUrl()

// FAQ bloğundaki sorularla aynı — zengin sonuç (FAQPage) için
const FAQ_FOR_SCHEMA = [
  {
    question: "Eğitim koçluğu nedir?",
    answer:
      "Eğitim koçluğu, öğrencinin kendi öğrenme sürecini yönetmesine yardım eden bir hizmettir. Özel ders gibi konu anlatmaz; öğrencinin nasıl çalışacağını, neye öncelik vereceğini ve hedefe nasıl ilerleyeceğini planlar, takip eder ve revize eder.",
  },
  {
    question: "Hangi sınıflar için uygundur?",
    answer:
      "9, 10, 11, 12. sınıf öğrencileri ve mezunlar için uygundur. YKS hazırlığı için en yaygın başlangıç 11. sınıf yazıdır; ancak 10. sınıftan itibaren başlamak avantaj sağlar.",
  },
  {
    question: "Ne zaman başlamak en iyisi?",
    answer:
      "Sınavdan önce ne kadar erken başlanırsa o kadar iyi. 24 ay önceden başlamak ideal, 12 ay yaygın, 9 ay ise hâlâ yapılabilir. Önemli olan başladıktan sonra disiplinli ilerlemek.",
  },
  {
    question: "Ücretler nasıl?",
    answer:
      "Aylık abonelik şeklinde 3 paketimiz var: Temel (₺2.500), Pro (₺4.500), Sprint (₺6.500). Gizli ücret yok, istediğin zaman paket değiştirebilir veya iptal edebilirsin. İlk tanışma seansı her zaman ücretsiz.",
  },
  {
    question: "Görüşmeler online mı, yüz yüze mi?",
    answer:
      "Tüm görüşmeler Zoom veya Google Meet üzerinden online yapılmaktadır. Türkiye'nin her yerinden başvurabilir, istediğin yerden seansa katılabilirsin.",
  },
  {
    question: "Koç değiştirebilir miyim?",
    answer:
      "Evet. Koçunla uyumun istediğin gibi gitmiyorsa müdüre bildirirsin, alternatif koç önerilir. Amacımız sürecin senin için verimli olması.",
  },
  {
    question: "Veliyi süreç içinde bilgilendiriyor musunuz?",
    answer:
      "Evet. Pro ve Sprint paketlerinde düzenli veli bilgilendirme görüşmeleri var. Temel pakette ise aylık yazılı rapor paylaşılıyor. Ailen her zaman gelişiminden haberdar.",
  },
  {
    question: "Koçlarınız sertifikalı mı?",
    answer:
      "Evet. Ekibimizdeki tüm koçlar üniversite onaylı Psikoloji veya Psikolojik Danışmanlık bölümü mezunudur ve MYK Onaylı Eğitim Koçluğu Sertifikası'na sahiptir.",
  },
]

// Pricing bloğundaki paketlerle aynı
const PLANS_FOR_SCHEMA = [
  {
    name: "Temel",
    description:
      "Koçluk dünyasına adım atmak isteyenler için. Haftada 1 görüşme, kişisel program, WhatsApp destek ve aylık ilerleme raporu.",
    priceMonthly: "2500",
    url: `${siteUrl}/#fiyatlar`,
  },
  {
    name: "Pro",
    description:
      "Ciddi hedefleri olan öğrenciler için en çok tercih edilen paket. Haftada 2 görüşme, 7/24 WhatsApp, haftalık rapor, veli görüşmesi, deneme analizi.",
    priceMonthly: "4500",
    url: `${siteUrl}/#fiyatlar`,
  },
  {
    name: "Sprint",
    description:
      "Sınava 3 ay kala yoğun hazırlık gerektirenler için. Haftada 3 görüşme, günlük takip, sınav simülasyonu ve psikolojik destek seansı.",
    priceMonthly: "6500",
    url: `${siteUrl}/#fiyatlar`,
  },
]

// ExpertCoaches bloğundaki uzmanlarla aynı
const COACHES_FOR_SCHEMA = [
  { name: "Ferda Tuna", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Süheyla Dalhançer", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Serap Fırış", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Ferah Tahtabaşı", title: "MYK Belgeli Öğrenci Koçu" },
]

export const metadata: Metadata = {
  title: "KoçUp Akademi — YKS & LGS Birebir Eğitim Koçluğu",
  description:
    "MYK belgeli psikoloji uzmanı eğitim koçlarıyla YKS ve LGS'ye birebir hazırlık. Haftalık program, deneme analizi, veli raporu. İlk tanışma seansı ücretsiz.",
  keywords: [
    "YKS koçluğu",
    "LGS koçluğu",
    "eğitim koçluğu",
    "TYT AYT hazırlık",
    "birebir özel koçluk",
    "online sınav koçluğu",
    "öğrenci koçluğu",
    "MYK belgeli koç",
    "psikoloji uzmanı koç",
    "veli raporu",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "KoçUp Akademi — YKS & LGS Birebir Eğitim Koçluğu",
    description:
      "MYK belgeli koçlarla YKS ve LGS'ye birebir hazırlık. Haftalık takip, deneme analizi, veli raporu.",
    url: "/",
    type: "website",
  },
}

export default async function Home() {
  const schemas = [
    organizationSchema(),
    websiteSchema(),
    faqPageSchema(FAQ_FOR_SCHEMA),
    ...PLANS_FOR_SCHEMA.map(servicePlanSchema),
    ...COACHES_FOR_SCHEMA.map(expertCoachPersonSchema),
  ]

  return (
    <>
      <JsonLd data={schemas} id="landing-jsonld" />
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <HowItWorks />
        <Features />
        <ExpertCoaches />
        <IndependentCoachesCTA />
        <Pricing />
        <FAQ />
        <Contact />
        <Footer />
      </main>
    </>
  )
}
