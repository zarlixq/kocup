import Hero from "@/blocks/Hero"
import HowItWorks from "@/blocks/HowItWorks"
import Coaches from "@/blocks/Coaches"
import Pricing from "@/blocks/Pricing"
import ContactForm from "@/blocks/ContactForm"
import FAQ from "@/blocks/FAQ"
import Footer from "@/blocks/Footer"

export const metadata = {
  title: "KoçUp — Hedefine Çık",
  description:
    "Psikoloji uzmanı koçlarla YKS ve LGS'ye hazırlan. Sana özel program, haftalık takip ve gerçek sonuçlar.",
}

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Coaches />
      <Pricing />
      <ContactForm />
      <FAQ />
      <Footer />
    </main>
  )
}
