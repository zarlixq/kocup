import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
  expertCoachPersonSchema,
} from "@/lib/seo/schemas"
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
    question: "İlk ders ücretsiz mi?",
    answer:
      "Evet, tanışma amaçlı ilk ders tamamen ücretsiz. İlk derste hedeflerini ve seviyeni konuşuyoruz; hiçbir ön ödeme veya taahhüt yok.",
  },
  {
    question: "Ücretler nasıl?",
    answer:
      "Koçluk sana özel planlandığı için ihtiyacına göre belirlenir. Önce ücretsiz ilk derste tanışıyor, hedeflerini ve seviyeni konuşuyoruz; ardından sana en uygun planı birlikte netleştiriyoruz. Gizli ücret yok.",
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
      "Evet. Düzenli veli bilgilendirme görüşmeleri ve yazılı raporlarla ailen her zaman gelişiminden haberdar olur.",
  },
  {
    question: "Koçlarınız sertifikalı mı?",
    answer:
      "Evet. Ekibimizdeki tüm koçlar üniversite onaylı Psikoloji veya Psikolojik Danışmanlık bölümü mezunudur ve MYK Onaylı Eğitim Koçluğu Sertifikası'na sahiptir.",
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
        <section className="bg-zinc-50 border-t border-zinc-200 px-5 md:px-8 lg:px-12 py-5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-x-2 gap-y-1 text-center">
            <span className="text-sm text-zinc-600">
              Kurum musunuz? Dershane ve eğitim kurumlarına özel koçluk altyapısı.
            </span>
            <Link
              href="/kurumlar"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B6B8A] hover:text-[#155873] transition-colors"
            >
              Kurumlar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </>
  )
}
