import Link from "next/link"
import { Check, ArrowRight, Sparkles } from "lucide-react"

const INCLUDED = [
  "Sana özel MYK belgeli koç eşleştirmesi",
  "Haftalık kişiye özel çalışma programı",
  "Konu takibi ve eksik analizi",
  "Deneme sınavı analizi ve yönlendirme",
  "Düzenli veli bilgilendirme ve raporlama",
  "Randevu ve görüşme takvimi",
]

export default function Pricing() {
  return (
    <section id="fiyatlar" className="bg-white py-20 md:py-28 px-5 md:px-8 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl mb-12 motion-safe:animate-fade-up">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Nasıl Başlarsın?
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Sana özel koçluk,{" "}
            <span className="text-[#1B6B8A]">ücretsiz ilk dersle</span> başlar.
          </h2>
          <p className="text-zinc-500 text-base mt-4 leading-relaxed">
            Paket seçme derdi yok. Önce ücretsiz ilk derste tanışıyoruz; hedeflerini ve seviyeni
            konuşup sana özel planı birlikte belirliyoruz. Ön ödeme veya taahhüt yok.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch">
          {/* Koçluğun kapsamı */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-5">Koçluğun kapsamı</h3>
            <ul className="space-y-3.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 shrink-0 w-4 h-4 text-[#1B6B8A]" strokeWidth={2.5} />
                  <span className="text-zinc-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ücretsiz ilk ders CTA */}
          <div className="relative rounded-2xl bg-[#0F1F28] text-white p-6 md:p-8 flex flex-col border-2 border-[#F97316] shadow-xl shadow-orange-500/10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-orange-200 w-fit mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              Ücretsiz İlk Ders
            </span>

            <h3 className="text-2xl font-bold tracking-tight mb-2">Ücretsiz ilk dersle başla</h3>
            <p className="text-sm text-zinc-300 leading-relaxed mb-7">
              Sana özel planı birlikte belirleyelim. İlk derste hiçbir ücret yok; sadece tanışıyor
              ve yol haritanı çiziyoruz.
            </p>

            <Link
              href="/basvuru"
              className="mt-auto inline-flex w-full items-center justify-center gap-2 bg-[#F97316] text-white font-semibold py-3.5 rounded-full text-sm hover:bg-[#ea6c10] transition-colors"
            >
              Ücretsiz İlk Ders Al
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          İlk ders tamamen ücretsiz. Devamında planın tamamen sana özel belirlenir.
        </p>
      </div>
    </section>
  )
}
