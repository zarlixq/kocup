"use client";
import { useEffect, useRef } from "react";

const plans = [
  {
    badge: "Başlangıç",
    name: "Temel",
    price: "2.500",
    desc: "Koçluk dünyasına adım atmak isteyenler için.",
    features: [
      "Haftada 1 görüşme (45 dk)",
      "Kişisel çalışma programı",
      "WhatsApp destek",
      "Aylık ilerleme raporu",
    ],
    cta: "Başvur",
    featured: false,
  },
  {
    badge: "En Popüler",
    name: "Pro",
    price: "4.500",
    desc: "Ciddi hedefleri olan öğrenciler için en çok tercih edilen paket.",
    features: [
      "Haftada 2 görüşme (45 dk)",
      "Kişisel çalışma programı",
      "7/24 WhatsApp destek",
      "Haftalık ilerleme raporu",
      "Veli bilgilendirme görüşmesi",
      "Deneme sınavı analizi",
    ],
    cta: "Hemen Başvur",
    featured: true,
  },
  {
    badge: "Yoğun Dönem",
    name: "Sprint",
    price: "6.500",
    desc: "Sınava 3 ay kala yoğun hazırlık gerektirenler için.",
    features: [
      "Haftada 3 görüşme (45 dk)",
      "Günlük program takibi",
      "Anlık mesaj desteği",
      "Haftalık veli raporu",
      "Sınav simülasyonu",
      "Psikolojik destek seansı",
    ],
    cta: "Başvur",
    featured: false,
  },
];

export default function Pricing() {
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
      { threshold: 0.1 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="fiyatlar" className="bg-[#FAFAF8] py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Başlık */}
        <div
          ref={(el) => (refs.current[0] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-4">
            Paketler
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A1A] leading-tight">
            Net, şeffaf{" "}
            <span className="text-[#1B6B8A]">fiyatlandırma.</span>
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-lg leading-relaxed">
            Gizli ücret yok. İstediğin zaman paket değiştirebilirsin. İlk tanışma seansı her zaman ücretsiz.
          </p>
        </div>

        {/* Fiyat kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => (
            <div
              key={i}
              ref={(el) => (refs.current[i + 1] = el)}
              className="opacity-0 translate-y-6 transition-all duration-700"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className={`rounded-2xl p-7 h-full flex flex-col ${
                  plan.featured
                    ? "bg-[#0F1F28] text-white border-2 border-[#F97316]"
                    : "bg-white border border-[#EBEBEB] text-[#1A1A1A]"
                }`}
              >
                {/* Badge */}
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full w-fit mb-5 ${
                    plan.featured
                      ? "bg-[#F97316] text-white"
                      : "bg-orange-50 text-[#F97316]"
                  }`}
                >
                  {plan.badge}
                </span>

                <div className={`text-sm font-bold mb-1 ${plan.featured ? "text-gray-300" : "text-gray-500"}`}>
                  {plan.name} Paket
                </div>

                {/* Fiyat */}
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-extrabold tracking-tight">
                    ₺{plan.price}
                  </span>
                  <span className={`text-sm mb-1.5 ${plan.featured ? "text-gray-400" : "text-gray-400"}`}>
                    / ay
                  </span>
                </div>

                <p className={`text-xs leading-relaxed mb-6 ${plan.featured ? "text-gray-400" : "text-gray-500"}`}>
                  {plan.desc}
                </p>

                {/* Özellikler */}
                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <svg
                        className="mt-0.5 shrink-0"
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke={plan.featured ? "#F97316" : "#1B6B8A"}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <path d="M3 8l3.5 3.5L13 4" />
                      </svg>
                      <span className={plan.featured ? "text-gray-300" : "text-gray-600"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href="#basvuru"
                  className={`block text-center font-semibold py-3.5 rounded-full text-sm transition-all hover:scale-[1.02] ${
                    plan.featured
                      ? "bg-[#F97316] text-white hover:bg-[#ea6c10]"
                      : "border border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Alt not */}
        <p
          ref={(el) => (refs.current[4] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 text-center text-xs text-gray-400 mt-8"
          style={{ transitionDelay: "320ms" }}
        >
          Tüm paketler aylık yenilenebilir. İstediğin zaman iptal edebilirsin.
        </p>

      </div>
    </section>
  );
}