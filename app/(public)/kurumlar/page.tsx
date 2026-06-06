import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpenCheck,
  LayoutDashboard,
  Workflow,
  Wallet,
  Check,
  Users,
  CalendarClock,
  ClipboardList,
  LineChart,
  MessageSquare,
} from "lucide-react"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { getSiteUrl } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { DemoForm } from "./demo-form"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Kurumlar İçin — KoçUp | Dershane ve Kurumlara Koçluk Altyapısı",
  description:
    "Dershane ve eğitim kurumları için Maarif uyumlu, uygun fiyatlı öğrenci koçluğu altyapısı. Müdür, koç, öğrenci ve veli tek panelde. Demo talep edin.",
  alternates: { canonical: "/kurumlar" },
  openGraph: {
    title: "Kurumlar İçin — KoçUp",
    description:
      "Dershane ve eğitim kurumları için Maarif uyumlu, uygun fiyatlı öğrenci koçluğu altyapısı. Demo talep edin.",
    url: `${siteUrl}/kurumlar`,
    type: "website",
  },
}

const REASONS = [
  {
    icon: BookOpenCheck,
    title: "Maarif Uyumlu Müfredat",
    desc: "9, 10 ve 11. sınıf Maarif müfredatı sisteme yüklü. Normal düzen ile Maarif düzen arasında tek tıkla geçiş; yeni müfredata uyum derdi yok.",
  },
  {
    icon: LayoutDashboard,
    title: "Tek Panelden Yönetim",
    desc: "Müdür panelinden tüm koçlarınızı, öğrencilerinizi ve kontenjanınızı tek yerden yönetin.",
  },
  {
    icon: Workflow,
    title: "Koçluk Akışı Hazır",
    desc: "Koç-öğrenci eşleştirme, konu ve program atama, randevu yönetimi ve deneme/konu analizi kutudan çıktığı gibi hazır.",
  },
  {
    icon: Wallet,
    title: "Uygun Fiyat",
    desc: "Kurumsal koçluk yazılımlarının çok altında, kurumunuza özel fiyatlandırma.",
  },
]

const STEPS = [
  { n: "1", title: "Talep edin", desc: "Kısa formu doldurun, size dönelim." },
  {
    n: "2",
    title: "Kurumunuza özel kurulum",
    desc: "Koç ve öğrenci kapasitenize göre panelinizi hazırlayalım.",
  },
  {
    n: "3",
    title: "Hemen başlayın",
    desc: "Koçlarınız ve öğrencileriniz kendi panelinden takibe başlasın.",
  },
]

const FEATURES = [
  { icon: LayoutDashboard, label: "Müdür/kurum paneli (koltuk bazlı)" },
  { icon: Users, label: "Koç-öğrenci eşleştirme" },
  { icon: ClipboardList, label: "Konu & program atama (Normal + Maarif)" },
  { icon: CalendarClock, label: "Randevu/görüşme takvimi" },
  { icon: LineChart, label: "Deneme ve konu analizi" },
  { icon: MessageSquare, label: "Veli bilgilendirme/raporlama" },
  { icon: BookOpenCheck, label: "Öğrenci ilerleme takibi" },
]

export default function KurumlarPage() {
  return (
    <>
      <Navbar variant="solid" />
      <main className="bg-zinc-50/40">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white px-5 md:px-8 lg:px-12 pt-14 md:pt-20 pb-20 md:pb-24 overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F97316]/15 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1B6B8A]/45 blur-3xl rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-6xl mx-auto relative">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
              Kurumlar İçin
            </span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-3xl">
              Kurumunuz için{" "}
              <span className="text-[#F97316]">öğrenci koçluğu</span> altyapısı
            </h1>
            <p className="text-white/75 text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
              Dershaneler ve eğitim kurumları için Maarif uyumlu, uygun fiyatlı koçluk sistemi.
              Müdür, koç, öğrenci ve veli — hepsi tek panelde.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#ea6c10] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors min-h-[44px] shadow-md shadow-orange-500/20"
              >
                Demo Talep Et
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="#ozellikler"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white hover:text-[#0F1F28] text-sm font-semibold px-6 py-3 rounded-full transition-colors min-h-[44px]"
              >
                Özellikleri İncele
              </Link>
            </div>
          </div>
        </section>

        {/* NEDEN KOÇUP */}
        <section className="px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Neden KoçUp
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Kurumunuza hazır bir koçluk altyapısı
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {REASONS.map((r) => {
                const Icon = r.icon
                return (
                  <div
                    key={r.title}
                    className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-7 hover:shadow-lg hover:shadow-zinc-200/50 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#F97316]" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1.5">{r.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{r.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* NASIL ÇALIŞIR */}
        <section className="px-5 md:px-8 lg:px-12 py-16 md:py-24 bg-white border-y border-zinc-200">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Nasıl Çalışır
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Üç adımda başlayın
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 md:p-7"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1B6B8A] text-white flex items-center justify-center font-bold mb-4">
                    {s.n}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ÖZELLİKLER */}
        <section id="ozellikler" className="px-5 md:px-8 lg:px-12 py-16 md:py-24 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-12">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Özellikler
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Koçluk için ihtiyacınız olan her şey
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#1B6B8A]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#1B6B8A]" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium text-zinc-800">{f.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* VİTRİN */}
        <section className="px-5 md:px-8 lg:px-12 pb-16 md:pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl bg-[#0F1F28] text-white p-8 md:p-12 text-center">
              <p className="text-lg md:text-2xl font-bold tracking-tight max-w-2xl mx-auto leading-snug">
                “KoçUp&apos;ı kendi koçluk ekibimizle her gün kullanıyoruz.”
              </p>
              <p className="text-white/60 text-sm mt-4">
                [buraya gerçek rakam: ör. X aktif öğrenci, Y koç]
              </p>
            </div>
          </div>
        </section>

        {/* DEMO FORMU */}
        <section id="demo" className="px-5 md:px-8 lg:px-12 py-16 md:py-24 bg-white border-t border-zinc-200 scroll-mt-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
                Demo / Teklif
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-900 leading-tight mb-4">
                Kurumunuza özel demo talep edin
              </h2>
              <p className="text-zinc-500 text-base leading-relaxed mb-6 max-w-lg">
                Formu doldurun; koç ve öğrenci kapasitenize göre size en uygun kurulumu ve
                fiyatlandırmayı konuşmak için en kısa sürede dönelim.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Maarif uyumlu müfredat hazır",
                  "Kuruma özel fiyatlandırma",
                  "Hızlı kurulum, eğitim desteği",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <Check className="mt-0.5 shrink-0 w-4 h-4 text-[#1B6B8A]" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm">
              <DemoForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${siteUrl}/kurumlar`,
            name: "Kurumlar İçin — KoçUp",
            url: `${siteUrl}/kurumlar`,
            description:
              "Dershane ve eğitim kurumları için Maarif uyumlu, uygun fiyatlı öğrenci koçluğu altyapısı.",
            inLanguage: "tr-TR",
            isPartOf: { "@id": `${siteUrl}#website` },
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
