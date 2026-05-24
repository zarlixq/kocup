import {
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  PieChart,
  UserCheck,
} from "lucide-react"

const FEATURES = [
  {
    icon: Users,
    title: "Birebir Koçluk",
    desc: "Haftalık birebir Zoom seansları. Hedeflerin, eksiklerin ve motivasyonun düzenli olarak ele alınır.",
  },
  {
    icon: BookOpen,
    title: "Konu Takibi",
    desc: "TYT ve AYT müfredatının her konusu için durum: başla, devam, tamam, tekrar. Koçun seninle birlikte takipte.",
  },
  {
    icon: BarChart3,
    title: "Deneme Analizi",
    desc: "Her deneme sınavı ders bazında net olarak girilir; gelişimini haftalık grafiklerle görürsün.",
  },
  {
    icon: Calendar,
    title: "Haftalık Program",
    desc: "Koçunla birlikte oluşturulan kişisel haftalık çalışma programı. Esnek, takip edilebilir.",
  },
  {
    icon: PieChart,
    title: "Soru Çözüm İstatistiği",
    desc: "Günlük çözdüğün soruları kaydet, ders bazında doğru/yanlış oranlarını analiz et.",
  },
  {
    icon: UserCheck,
    title: "Veli Bilgilendirme",
    desc: "Aylık veya haftalık raporlarla aile sürecin neresinde olduğunu bilir. Şeffaf takip.",
  },
] as const

export default function Features() {
  return (
    <section id="hizmetler" className="bg-white py-20 md:py-28 px-5 md:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14 motion-safe:animate-fade-up">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Hizmetler
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Bir koçluk sürecinde olması{" "}
            <span className="text-[#1B6B8A]">gereken her şey</span> tek platformda.
          </h2>
          <p className="text-zinc-500 text-base mt-4 leading-relaxed">
            Görüşme, takip, analiz, program ve raporlama — sürecin her parçası bütüncül bir
            sistem üzerinde işler.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-zinc-200 bg-white p-6 md:p-7 hover:border-[#F97316]/40 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-[#F97316] transition-colors">
                  <Icon className="w-5 h-5 text-[#F97316] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
