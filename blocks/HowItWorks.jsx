"use client";
import { useEffect, useRef } from "react";

const steps = [
  {
    num: "01",
    title: "Ücretsiz tanışma seansı",
    desc: "Koçunla 30 dakikalık ücretsiz görüşmede hedeflerin, güçlü ve zayıf yönlerin konuşulur. Seni tanımadan program yapılmaz.",
    color: "bg-orange-50",
    border: "border-orange-100",
    numColor: "text-[#F97316]",
  },
  {
    num: "02",
    title: "Kişisel yol haritası",
    desc: "Koçun sana özel haftalık çalışma programı, net hedefler ve öncelikli konular belirler. Artık ne yapacağını biliyorsun.",
    color: "bg-blue-50",
    border: "border-blue-100",
    numColor: "text-[#1B6B8A]",
  },
  {
    num: "03",
    title: "Haftalık koçluk seansları",
    desc: "Her hafta koçunla birebir Zoom görüşmesi. Gelişim takibi, motivasyon, program revizyonu. Yalnız değilsin.",
    color: "bg-green-50",
    border: "border-green-100",
    numColor: "text-green-600",
  },
  {
    num: "04",
    title: "Sonuç & veli raporu",
    desc: "Düzenli ilerleme raporları aileye iletilir. Sınav günü hazır, güvenli ve motive bir öğrenci olarak girersin.",
    color: "bg-purple-50",
    border: "border-purple-100",
    numColor: "text-purple-600",
  },
];

export default function HowItWorks() {
  const refs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-6");
          }
        });
      },
      { threshold: 0.15 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="nasil-calisir" className="bg-white py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Üst başlık */}
        <div
          ref={(el) => (refs.current[0] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-4">
            Süreç
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A1A] leading-tight max-w-lg">
            4 adımda hayalindeki{" "}
            <span className="text-[#1B6B8A]">okula.</span>
          </h2>
        </div>

        {/* Adımlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((step, i) => (
            <div
              key={i}
              ref={(el) => (refs.current[i + 1] = el)}
              className={`opacity-0 translate-y-6 transition-all duration-700`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className={`${step.color} border ${step.border} rounded-2xl p-7 h-full hover:-translate-y-1 transition-transform duration-200`}
              >
                <div className={`text-5xl font-extrabold tracking-tight ${step.numColor} mb-4 leading-none`}>
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alt CTA */}
        <div
          ref={(el) => (refs.current[5] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mt-12 flex items-center gap-4"
          style={{ transitionDelay: "360ms" }}
        >
          <a
            href="#basvuru"
            className="inline-flex items-center gap-2 bg-[#1B6B8A] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#F97316] transition-colors text-sm"
          >
            Hemen başla
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
          <span className="text-sm text-gray-400">İlk seans ücretsiz.</span>
        </div>

      </div>
    </section>
  );
}