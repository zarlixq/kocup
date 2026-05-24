"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";

export default function ContactForm() {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ref.current?.classList.add("opacity-100", "translate-y-0");
          ref.current?.classList.remove("opacity-0", "translate-y-6");
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="basvuru" className="bg-[#1B6B8A] py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div
            ref={ref}
            className="opacity-0 translate-y-6 transition-all duration-700"
          >
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-200 mb-4">
              Başvuru
            </span>

            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
              İlk adımı sen at,{" "}
              <span className="text-[#F97316]">gerisini biz hallederiz.</span>
            </h2>

            <p className="text-blue-100 text-base leading-relaxed mb-8">
              Başvuru formunu doldur, ekibimiz seninle en kısa sürede iletişime geçsin.
            </p>

            <div className="space-y-3">
              {[
                "Sana uygun koçluk süreci planlanır",
                "Hedefine göre kişisel yol haritası çıkarılır",
                "Başvurun hızlıca değerlendirilir",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M3 8l3.5 3.5L13 4" />
                    </svg>
                  </div>
                  <span className="text-blue-100 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F97316"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
              Başvuru formuna geç
            </h3>

            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              Formu doldurduktan sonra başvurun bize ulaşır. Seni en uygun şekilde yönlendirebiliriz.
            </p>

            <Link
              href="/basvuru"
              className="inline-flex w-full items-center justify-center bg-[#F97316] text-white font-semibold py-3.5 rounded-full hover:bg-[#ea6c10] transition-all hover:scale-[1.02] text-sm"
            >
              Başvuru formunu aç →
            </Link>

            <p className="text-center text-xs text-gray-400 mt-4">
              Bilgilerin gizli tutulur. Spam yok.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}