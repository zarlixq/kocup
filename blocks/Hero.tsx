import Link from "next/link"
import { ArrowRight, Sparkles, ShieldCheck, BarChart3 } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-[#F97316]/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-[440px] h-[440px] rounded-full bg-[#1B6B8A]/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="motion-safe:animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white text-xs font-semibold px-4 py-2 rounded-full w-fit mb-7">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              Sertifikalı Eğitim Koçluğu Platformu
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-6">
              Eğitim koçluğunda{" "}
              <span className="text-[#F97316]">dijital dönüşüm.</span>
            </h1>

            <p className="text-base md:text-lg text-blue-100/90 leading-relaxed max-w-xl mb-9">
              MYK onaylı koçlarla bireysel takip, konu analizi, deneme yönlendirmesi ve veri destekli haftalık program. Öğrencinin için bütüncül bir hazırlık sistemi.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8">
              <Link
                href="/basvuru"
                className="inline-flex items-center justify-center gap-2 bg-[#F97316] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#ea6c10] transition-colors text-sm md:text-base shadow-lg shadow-orange-500/20"
              >
                Ücretsiz tanışma seansı
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#nasil-calisir"
                className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors text-sm md:text-base"
              >
                Nasıl çalışır?
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-blue-100/70">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                MYK Onaylı koçlar
              </span>
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#F97316]" />
                Veriye dayalı takip
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                Veli raporu
              </span>
            </div>
          </div>

          {/* Right: SVG dashboard illustration */}
          <div className="hidden md:block motion-safe:animate-fade-up [animation-delay:140ms]">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow */}
      <div className="absolute -inset-6 bg-[#F97316]/20 blur-3xl rounded-full" aria-hidden />

      {/* Main card */}
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-6">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Bu Hafta
            </div>
            <div className="text-lg font-bold text-zinc-900 mt-0.5">İlerleme Raporu</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1B6B8A] to-[#0F1F28] flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3.5">
          {[
            { label: "Matematik", value: 78, color: "bg-[#1B6B8A]" },
            { label: "Türkçe", value: 92, color: "bg-[#F97316]" },
            { label: "Fizik", value: 64, color: "bg-emerald-500" },
            { label: "Kimya", value: 45, color: "bg-violet-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-600">{item.label}</span>
                <span className="text-xs font-bold text-zinc-900">%{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-100">
          <div>
            <div className="text-xl font-extrabold text-zinc-900 tracking-tight">42</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Net</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#F97316] tracking-tight">+8.5</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Artış</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-zinc-900 tracking-tight">24<span className="text-xs text-zinc-400">sa</span></div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Çalışma</div>
          </div>
        </div>
      </div>

      {/* Floating badge — top right */}
      <div className="absolute -top-4 -right-3 bg-white shadow-xl rounded-xl px-3 py-2 flex items-center gap-2 border border-zinc-100">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 leading-none">Sertifikalı</div>
          <div className="text-xs font-bold text-zinc-900 leading-tight">MYK Onaylı</div>
        </div>
      </div>

      {/* Floating badge — bottom left */}
      <div className="absolute -bottom-4 -left-3 bg-white shadow-xl rounded-xl px-3 py-2 flex items-center gap-2 border border-zinc-100">
        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#F97316]" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 leading-none">Bu hafta</div>
          <div className="text-xs font-bold text-zinc-900 leading-tight">+3 konu tamam</div>
        </div>
      </div>
    </div>
  )
}
