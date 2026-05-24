import type { Metadata } from "next"
import Hero from "@/blocks/Hero"
import HowItWorks from "@/blocks/HowItWorks"
import Coaches from "@/blocks/Coaches"
import Pricing from "@/blocks/Pricing"
import ContactForm from "@/blocks/ContactForm"
import FAQ from "@/blocks/FAQ"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { organizationSchema, websiteSchema, personSchema } from "@/lib/seo/schemas"
import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, bio, certificate_info, specialties")
    .eq("role", "coach")
    .not("certificate_info", "is", null)
    .order("created_at", { ascending: true })

  const schemas = [
    organizationSchema(),
    websiteSchema(),
    ...(coaches ?? []).map((c) => personSchema(c)),
  ]

  return (
    <>
      <JsonLd data={schemas} id="landing-jsonld" />
      <main>
        <Hero />
        <HowItWorks />
        <Coaches />
        <Pricing />
        <ContactForm />
        <FAQ />
        <Footer />
      </main>
    </>
  )
}
