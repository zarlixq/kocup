import Image from "next/image";

export default function Hero() {
  return (
    <section className="bg-[#FAFAF8] min-h-screen flex flex-col">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between gap-3 px-6 md:px-12 py-4 border-b border-[#EBEBEB] bg-[#FAFAF8]">
        <Image
          src="/logo.png"
          alt="KoçUp Logo"
          width={110}
          height={40}
          className="object-contain"
          priority
        />
        <div className="hidden md:flex items-center gap-8">
          <a href="#nasil-calisir" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Nasıl Çalışır
          </a>
          <a href="#koclarimiz" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Koçlarımız
          </a>
          <a href="#fiyatlar" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Fiyatlar
          </a>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <a
            href="/admin/giris"
            className="text-sm font-semibold text-[#F97316] border border-[#F97316] px-4 py-2 rounded-full hover:bg-[#F97316] hover:text-white transition-colors duration-200"
          >
            Koç Girişi
          </a>
          <a
            href="#basvuru"
            className="bg-[#1B6B8A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#155873] transition-colors duration-200"
          >
            Hemen Başvur
          </a>
        </div>
      </nav>

      {/* HERO CONTENT */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-16 max-w-5xl mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-orange-50 text-[#F97316] text-xs font-semibold px-4 py-2 rounded-full border border-orange-100 w-fit mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
          Uzman koçlarla birebir çalış
        </div>

        {/* Başlık */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#1A1A1A] mb-6 animate-fade-up [animation-delay:60ms]">
          Hedefin ne?{" "}
          <span className="block text-[#1B6B8A] italic font-serif">
            Oraya birlikte
          </span>
          ulaşalım.
        </h1>

        {/* Alt yazı */}
        <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-xl mb-10 animate-fade-up [animation-delay:120ms]">
          Psikoloji uzmanı koçlarımızla YKS ve LGS'ye hazırlan.
          Sana özel program, haftalık takip ve gerçek sonuçlar.
        </p>

        {/* CTA butonları */}
        <div className="flex items-center gap-4 flex-wrap mb-14 animate-fade-up [animation-delay:180ms]">
          <a
            href="#basvuru"
            className="inline-flex items-center gap-2 bg-[#F97316] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#ea6c10] transition-all hover:scale-[1.03] text-sm md:text-base"
          >
            Ücretsiz tanışma seansı al
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
          <a
            href="#koclarimiz"
            className="inline-flex items-center gap-2 border border-[#DDDDD8] text-[#1A1A1A] font-medium px-7 py-3.5 rounded-full hover:border-[#1B6B8A] hover:text-[#1B6B8A] transition-colors text-sm md:text-base"
          >
            Koçları incele
          </a>
        </div>

        {/* İstatistikler */}
        <div className="flex divide-x divide-[#EBEBEB] border border-[#EBEBEB] rounded-2xl w-fit bg-white mb-14 animate-fade-up [animation-delay:240ms]">
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]">
              4<span className="text-[#F97316]">+</span>
            </div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">Uzman koç</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]">
              1<span className="text-[#F97316]">:1</span>
            </div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">Birebir seans</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]">
              %100
            </div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">Psikoloji mezunu</div>
          </div>
        </div>

        {/* Feature kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-up [animation-delay:300ms]">

          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 hover:-translate-y-1 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 2" />
              </svg>
            </div>
            <div className="text-sm font-bold text-[#1A1A1A] mb-1">Haftalık seans</div>
            <div className="text-xs text-gray-400 leading-relaxed">Zoom üzerinden birebir koçluk görüşmesi</div>
          </div>

          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 hover:-translate-y-1 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1B6B8A" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 4h12M2 8h8M2 12h10" />
              </svg>
            </div>
            <div className="text-sm font-bold text-[#1A1A1A] mb-1">Kişisel program</div>
            <div className="text-xs text-gray-400 leading-relaxed">Sana özel çalışma takvimi ve yol haritası</div>
          </div>

          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 hover:-translate-y-1 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
            </div>
            <div className="text-sm font-bold text-[#1A1A1A] mb-1">Veli raporu</div>
            <div className="text-xs text-gray-400 leading-relaxed">Aileye düzenli ilerleme ve gelişim raporu</div>
          </div>

        </div>
      </div>
    </section>
  );
}