import Link from "next/link"
import { ArrowRight, CalendarRange, Route, SearchCheck } from "lucide-react"

// Koçu olmayan öğrencilere yönelik ücretsiz UpPlan bölümü (ana sayfa).
// Ekran görüntüsü alanları yer tutucudur — gerçek görüntüler public/images/upplan/ altına eklenecek.

const FEATURES = [
  {
    icon: Route,
    title: "Kişisel yol haritası",
    description: "Seviyene, hedefine ve kalan süreye göre hangi konuya ne zaman çalışacağın sıralanır.",
  },
  {
    icon: CalendarRange,
    title: "Haftalık program",
    description: "Müsait saatlerine göre her hafta konu çalışması, soru çözümü ve tekrar blokları.",
  },
  {
    icon: SearchCheck,
    title: "Yanlışlarından eksiklerin",
    description: "Yanlış yaptığın soruları işaretle; eksik formül ve konu başlıkların listelensin.",
  },
]

const SHOTS = ["Yol haritası", "Haftalık program", "Eksik formüller"]

export default function UpPlanFreeCTA() {
  return (
    <section id="ucretsiz" className="bg-white px-5 py-16 md:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#F97316]">
            Öğrenciler için ücretsiz
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
            Koçun yoksa bile planlı çalış.
          </h2>
          <p className="mt-3 text-zinc-600">
            UpPlan sana kişisel yol haritası ve haftalık program çıkarır, yanlışlarından eksik formüllerini bulur.
            Ücretsiz.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200 p-5">
              <f.icon className="h-6 w-6 text-[#1B6B8A]" />
              <h3 className="mt-3 font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SHOTS.map((s) => (
            <div
              key={s}
              className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400"
            >
              Ekran görüntüsü: {s}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            href="/ucretsiz-basla"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#ea6a0c]"
          >
            Ücretsiz başla
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-zinc-500">Kredi kartı gerekmez · YKS (LGS yakında)</span>
        </div>
      </div>
    </section>
  )
}
