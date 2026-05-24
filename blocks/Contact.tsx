import Link from "next/link"
import { MessageCircle, Mail, Clock, ArrowRight } from "lucide-react"

export default function Contact() {
  return (
    <section id="iletisim" className="bg-[#0F1F28] py-20 md:py-28 px-5 md:px-8 lg:px-12 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="motion-safe:animate-fade-up">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
              İletişim
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
              İlk adımı sen at,{" "}
              <span className="text-[#F97316]">gerisini biz hallederiz.</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed mb-8 max-w-lg">
              Aklında bir soru varsa, başvurudan önce konuşmak istersen veya hızlıca bilgi almak
              istersen — en hızlı kanal WhatsApp.
            </p>

            <div className="space-y-4">
              <a
                href="https://wa.me/905333704391?text=Merhaba KoçUp"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl p-5 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">WhatsApp</div>
                  <div className="text-lg font-bold tracking-tight">0533 370 43 91</div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform shrink-0" />
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="mailto:info@kocupakedemi.com"
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#F97316]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/70">Email</div>
                    <div className="text-sm font-semibold text-white truncate">info@kocupakedemi.com</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#F97316]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/70">Çalışma Saatleri</div>
                    <div className="text-sm font-semibold text-white">09:00 — 21:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="motion-safe:animate-fade-up [animation-delay:120ms]">
            <div className="bg-white rounded-2xl p-8 md:p-10 text-zinc-900 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-5">
                <ArrowRight className="w-6 h-6 text-[#F97316]" />
              </div>

              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Başvuru formuna geç</h3>

              <p className="text-sm text-zinc-500 leading-relaxed mb-7">
                Formu doldurduktan sonra başvurun bize ulaşır. Sana uygun koçu eşleştirip
                en kısa sürede tanışma seansı planlarız. Bilgilerin gizli tutulur, spam yok.
              </p>

              <Link
                href="/basvuru"
                className="inline-flex w-full items-center justify-center gap-2 bg-[#1B6B8A] hover:bg-[#155873] text-white font-semibold py-3.5 rounded-full transition-colors text-sm"
              >
                Başvuru formunu aç
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
