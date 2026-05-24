import Link from "next/link"
import { ArrowRight, MessageCircle, Map, Repeat, FileText } from "lucide-react"

const STEPS = [
  {
    icon: MessageCircle,
    num: "01",
    title: "Ücretsiz tanışma seansı",
    desc: "30 dakikalık ücretsiz görüşmede hedeflerin, güçlü ve zayıf yönlerin konuşulur.",
    accent: "from-orange-50 to-orange-100/40",
    iconColor: "text-[#F97316]",
  },
  {
    icon: Map,
    num: "02",
    title: "Kişisel yol haritası",
    desc: "Koçun sana özel haftalık çalışma programı, net hedefler ve öncelikli konular belirler.",
    accent: "from-blue-50 to-blue-100/40",
    iconColor: "text-[#1B6B8A]",
  },
  {
    icon: Repeat,
    num: "03",
    title: "Haftalık koçluk seansları",
    desc: "Her hafta birebir görüşme. Gelişim takibi, motivasyon, program revizyonu.",
    accent: "from-emerald-50 to-emerald-100/40",
    iconColor: "text-emerald-600",
  },
  {
    icon: FileText,
    num: "04",
    title: "Sonuç & veli raporu",
    desc: "Düzenli ilerleme raporları aileye iletilir. Sınav günü hazır ve motive olarak girersin.",
    accent: "from-violet-50 to-violet-100/40",
    iconColor: "text-violet-600",
  },
] as const

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="bg-[#FAFAF8] py-20 md:py-28 px-5 md:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14 motion-safe:animate-fade-up">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Süreç
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            4 adımda hayalindeki{" "}
            <span className="text-[#1B6B8A]">okula.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className={`relative rounded-2xl bg-gradient-to-br ${step.accent} border border-zinc-200/60 p-6 h-full hover:-translate-y-1 transition-transform duration-200`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center ${step.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-300">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <Link
            href="/basvuru"
            className="inline-flex items-center gap-2 bg-[#1B6B8A] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#155873] transition-colors text-sm"
          >
            Hemen başla
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-sm text-zinc-400">İlk seans ücretsiz.</span>
        </div>
      </div>
    </section>
  )
}
