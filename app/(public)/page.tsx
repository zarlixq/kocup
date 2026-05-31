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
import { organizationSchema, websiteSchema } from "@/lib/seo/schemas"

export const metadata: Metadata = {
  title: "KoçUp Akademi — YKS Eğitim Koçluğu Platformu",
  description:
    "Sertifikalı eğitim koçları ile YKS hazırlığında bireysel takip, konu analizi, deneme yönlendirmesi. Psikoloji uzmanı koçlarla sana özel program.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "KoçUp Akademi — YKS Eğitim Koçluğu Platformu",
    description: "Psikoloji uzmanı koçlarla YKS ve LGS'ye hazırlan. Sana özel program, haftalık takip.",
    url: "/",
    type: "website",
  },
}

export default async function Home() {
  const schemas = [organizationSchema(), websiteSchema()]

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
