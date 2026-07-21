import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Check,
  LineChart,
  Phone,
  PieChart,
  Play,
  ShieldCheck,
} from "lucide-react"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { JsonLd } from "@/components/seo/json-ld"
import { getSiteUrl } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { KURUMLAR_CONTACT } from "./config"
import { DemoForm } from "./demo-form"
import { HeroMockup } from "./hero-mockup"
import { StickyCta } from "./sticky-cta"
import { VideoTabs } from "./video-tabs"

const siteUrl = getSiteUrl()

const description =
  "Dershaneler için öğrenci takip, koçluk ve performans sistemi. Koç aktifliği, konu konu öğrenci analizi, haftalık program uyumu ve deneme net takibi tek panelde. Demo talep edin."

export const metadata: Metadata = {
  title: { absolute: "KoçUp — Dershaneler için Öğrenci Takip ve Koçluk Sistemi" },
  description,
  alternates: { canonical: "/kurumlar" },
  openGraph: {
    title: "KoçUp — Dershaneler için Öğrenci Takip ve Koçluk Sistemi",
    description,
    url: `${siteUrl}/kurumlar`,
    type: "website",
    locale: "tr_TR",
    siteName: "KoçUp Akademi",
  },
  twitter: {
    card: "summary_large_image",
    title: "KoçUp — Dershaneler için Öğrenci Takip ve Koçluk Sistemi",
    description,
  },
}

const BENEFITS = [
  {
    icon: Activity,
    title: "Koç aktiflik takibi",
    desc: "Hangi koç çalışıyor, hangi öğrenciyle ilgileniyor — tek tabloda görün.",
  },
  {
    icon: PieChart,
    title: "Konu konu öğrenci analizi",
    desc: "Öğrencinin nerede takıldığını tahminle değil, veriyle görün.",
  },
  {
    icon: CalendarCheck,
    title: "Haftalık program ve uyum oranı",
    desc: "Koçlar plan versin; uyumu yüzde olarak siz ölçün.",
  },
  {
    icon: LineChart,
    title: "Deneme ve net takibi",
    desc: "Denemeler, netler ve gidişat grafiklerle önünüzde.",
  },
]

const STEPS = [
  {
    n: "1",
    title: "Demo görüşmesi ayarlayın",
    desc: "Formu doldurun, aynı gün sizi arayalım; ihtiyacınızı birlikte netleştirelim.",
  },
  {
    n: "2",
    title: "Dershanenizi birlikte kuralım",
    desc: "Koçlarınızı ve öğrencilerinizi birlikte tanımlayalım, yapınıza göre hazırlayalım.",
  },
  {
    n: "3",
    title: "Koçlarınız aynı gün kullanmaya başlasın",
    desc: "Kısa bir tanıtımın ardından ekibiniz ilk günden takibe başlar.",
  },
]

const FAQS = [
  {
    q: "Kurulum ne kadar sürer?",
    a: "Genellikle tek bir görüşme yeterli. Dershanenizi birlikte kuruyoruz; koçlarınız aynı gün kullanmaya başlayabilir.",
  },
  {
    q: "Öğrenci verilerimiz güvende mi?",
    a: "Evet. Veriler KVKK'ya uygun şekilde, kuruma özel yetkilendirmeyle saklanır; herkes yalnızca kendi yetkisindeki veriyi görür. Verileriniz üçüncü taraflarla paylaşılmaz.",
  },
  {
    q: "Mevcut sistemimizden geçiş zor mu?",
    a: "Hayır. Öğrenci listenizi (Excel dahi olsa) kurulum sırasında birlikte topluca aktarıyoruz; sıfırdan veri girişi gerekmez.",
  },
  {
    q: "Koçlarımızın alışması zor olur mu?",
    a: "Panel sade ve tamamen Türkçe. Kısa bir tanıtımdan sonra koçlar günlük akışı dakikalar içinde öğrenir.",
  },
  {
    q: "Fiyatlandırma nasıl?",
    a: "Fiyat, dershanenizin büyüklüğüne (öğrenci ve koç sayısına) göre belirlenir; demo görüşmesinde ihtiyacınıza göre net teklif sunuyoruz.",
  },
]

export default function KurumlarPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative -mt-16 md:-mt-[4.5rem] bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F97316]/15 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1B6B8A]/40 blur-3xl rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-6xl mx-auto px-5 md:px-8 lg:px-12 pt-28 md:pt-40 pb-16 md:pb-24 min-h-[92svh] md:min-h-0 flex flex-col justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
              <div className="animate-fade-up">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 mb-5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" />
                  Dershaneler için
                </span>
                <h1 className="text-[2rem] leading-[1.12] sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight lg:leading-[1.05]">
                  Dershane ölçeğinde{" "}
                  <span className="text-[#F97316]">birebir koç ilgisi</span>
                </h1>
                <p className="text-white/75 text-base md:text-lg mt-4 max-w-xl leading-relaxed">
                  Öğrenci takip, koçluk ve performans sistemi
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Link
                    href="#demo"
                    className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#ea6c10] text-white text-[15px] font-bold px-7 min-h-[52px] rounded-full transition-colors shadow-lg shadow-orange-500/25"
                  >
                    Demo Talep Et
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="#video"
                    className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white hover:text-[#0F1F28] text-[15px] font-semibold px-7 min-h-[52px] rounded-full transition-colors"
                  >
                    <Play className="w-4 h-4" fill="currentColor" aria-hidden="true" />
                    Tanıtımı İzle
                  </Link>
                </div>
                <p className="text-white/50 text-xs mt-6">
                  Kurulum aynı hafta · KVKK uyumlu altyapı · Kuruma özel fiyat
                </p>
              </div>

              <div className="animate-fade-up [animation-delay:120ms]">
                <HeroMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── VİDEO / SEKMELER ─────────────────────────────────────────── */}
        <section id="video" className="px-5 md:px-8 lg:px-12 py-14 md:py-24 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Tanıtım
              </span>
              <h2 className="text-[1.6rem] leading-tight md:text-4xl font-extrabold tracking-tight text-zinc-900">
                Üç panel, tek sistem
              </h2>
              <p className="text-zinc-500 text-sm md:text-base mt-3">
                Müdür, koç ve öğrenci — herkes kendi ekranında, siz hepsinin üstünde.
              </p>
            </div>
            <VideoTabs />
          </div>
        </section>

        {/* ── FAYDALAR ─────────────────────────────────────────────────── */}
        <section className="px-5 md:px-8 lg:px-12 py-14 md:py-24 bg-zinc-50/70 border-y border-zinc-100">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-8 md:mb-12">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Ne Kazanırsınız
              </span>
              <h2 className="text-[1.6rem] leading-tight md:text-4xl font-extrabold tracking-tight text-zinc-900">
                Dershanenizin nabzı, tek panelde
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {BENEFITS.map((b) => {
                const Icon = b.icon
                return (
                  <div
                    key={b.title}
                    className="rounded-2xl border border-zinc-200 bg-white p-6 hover:shadow-lg hover:shadow-zinc-200/60 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#1B6B8A]/10 flex items-center justify-center mb-4">
                      <Icon className="w-[22px] h-[22px] text-[#1B6B8A]" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 mb-1.5">{b.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── NASIL ÇALIŞIR ────────────────────────────────────────────── */}
        <section className="px-5 md:px-8 lg:px-12 py-14 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-8 md:mb-12">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Nasıl Çalışır
              </span>
              <h2 className="text-[1.6rem] leading-tight md:text-4xl font-extrabold tracking-tight text-zinc-900">
                Üç adımda kullanıma hazır
              </h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {STEPS.map((s, i) => (
                <li key={s.n} className="relative rounded-2xl border border-zinc-200 bg-white p-6 md:p-7">
                  {i < STEPS.length - 1 && (
                    <ArrowRight
                      className="hidden md:block absolute top-1/2 -right-[22px] -translate-y-1/2 w-5 h-5 text-zinc-300 z-10"
                      aria-hidden="true"
                    />
                  )}
                  <div className="w-10 h-10 rounded-full bg-[#1B6B8A] text-white flex items-center justify-center font-bold mb-4">
                    {s.n}
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── SSS ──────────────────────────────────────────────────────── */}
        <section className="px-5 md:px-8 lg:px-12 py-14 md:py-24 bg-zinc-50/70 border-y border-zinc-100">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 md:mb-10">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Sık Sorulanlar
              </span>
              <h2 className="text-[1.6rem] leading-tight md:text-4xl font-extrabold tracking-tight text-zinc-900">
                Aklınıza takılanlar
              </h2>
            </div>
            <Accordion
              type="single"
              collapsible
              className="rounded-2xl border border-zinc-200 bg-white px-5 md:px-7"
            >
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-[15px] md:text-base font-semibold text-zinc-900 hover:no-underline py-5">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm md:text-[15px] text-zinc-500 leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── DEMO TALEP ───────────────────────────────────────────────── */}
        <section id="demo" className="px-5 md:px-8 lg:px-12 py-14 md:py-24 scroll-mt-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Demo Talebi
              </span>
              <h2 className="text-[1.6rem] leading-tight md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4">
                Dershaneniz için demo ayarlayalım
              </h2>
              <p className="text-zinc-500 text-[15px] md:text-base leading-relaxed mb-6 max-w-lg">
                Formu doldurun; sistemin dershanenizde nasıl çalışacağını 15 dakikalık bir
                görüşmede birlikte görelim.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Aynı gün geri dönüş",
                  "Kuruma özel fiyat teklifi",
                  "Kurulum ve eğitim bizden",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <Check className="mt-0.5 shrink-0 w-4 h-4 text-[#1B6B8A]" strokeWidth={2.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Telefon / WhatsApp alternatifi */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
                <p className="text-sm font-semibold text-zinc-900 mb-3">
                  Formla uğraşmak istemiyorsanız:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={KURUMLAR_CONTACT.phoneHref}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl border border-zinc-300 bg-white text-[#1B6B8A] text-sm font-bold hover:border-[#1B6B8A] transition-colors"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    {KURUMLAR_CONTACT.phoneDisplay}
                  </a>
                  <a
                    href={KURUMLAR_CONTACT.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:brightness-95 transition-[filter]"
                  >
                    <svg viewBox="0 0 32 32" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
                      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 01-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 01-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.046 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.99 2.722.99.288 0 .53-.042.788-.157.215-.1.788-.358 1.06-.658.215-.243.301-.473.301-.703 0-.5-.401-1.247-.43-1.595zM16.176 28C9.493 28 4 22.526 4 15.81 4 9.16 9.494 3.66 16.175 3.66c6.654 0 12.149 5.5 12.149 12.15 0 6.715-5.494 12.19-12.149 12.19zm0-21.84A9.692 9.692 0 006.498 15.81c0 1.83.546 3.602 1.563 5.115L7.062 24l3.182-.99a9.578 9.578 0 005.932 2.005c5.36 0 9.708-4.345 9.708-9.677 0-5.345-4.348-9.677-9.708-9.677z" />
                    </svg>
                    WhatsApp&apos;tan Yazın
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 md:p-8 shadow-lg shadow-zinc-200/50 lg:sticky lg:top-24">
              <DemoForm />
            </div>
          </div>
        </section>

        {/* Mobil sticky bar ile son bölümün çakışmaması için nefes payı */}
        <div className="h-20 md:hidden" aria-hidden="true" />
      </main>
      <Footer />
      <StickyCta />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${siteUrl}/kurumlar`,
            name: "KoçUp — Dershaneler için Öğrenci Takip ve Koçluk Sistemi",
            url: `${siteUrl}/kurumlar`,
            description,
            inLanguage: "tr-TR",
            isPartOf: { "@id": `${siteUrl}#website` },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          breadcrumbSchema([
            { name: "Ana Sayfa", url: `${siteUrl}/` },
            { name: "Kurumlar", url: `${siteUrl}/kurumlar` },
          ]),
        ]}
      />
    </>
  )
}
