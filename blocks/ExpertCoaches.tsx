"use client"

import { useEffect, useRef } from "react"

type ExpertCoach = {
  name: string
  title: string
  /** Foto opsiyonel — şimdilik harfli gradient avatar gösteriliyor. */
  image?: string
}

const expertCoaches: ExpertCoach[] = [
  { name: "Ferda Tuna", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Süheyla Dalhançer", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Serap Fırış", title: "MYK Belgeli Öğrenci Koçu" },
  { name: "Ferah Tahtabaşı", title: "MYK Belgeli Öğrenci Koçu" },
]

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function ExpertCoaches() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0")
            entry.target.classList.remove("opacity-0", "translate-y-6")
          }
        })
      },
      { threshold: 0.1 },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="koclarimiz"
      className="bg-[#0F1F28] py-20 sm:py-24 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-6xl mx-auto">
        <div
          ref={(el) => {
            refs.current[0] = el
          }}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-12 sm:mb-16 text-center sm:text-left"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3 sm:mb-4">
            Ekibimiz
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-2xl mx-auto sm:mx-0">
            MYK Belgeli{" "}
            <span className="text-[#F97316]">Uzman Koçlarımız</span>
          </h2>
          <p className="text-gray-400 text-base mt-4 max-w-2xl mx-auto sm:mx-0 leading-relaxed">
            Öğrenci koçluğunda MYK (Mesleki Yeterlilik Kurumu) belgesine sahip,
            alanında uzman ekibimizle yanındayız.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {expertCoaches.map((coach, i) => (
            <div
              key={coach.name}
              ref={(el) => {
                refs.current[i + 1] = el
              }}
              className="opacity-0 translate-y-6 transition-all duration-700"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <article className="group bg-white/[0.04] border border-white/10 rounded-2xl p-6 h-full hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-200">
                <div className="flex justify-center mb-5">
                  {coach.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coach.image}
                      alt={coach.name}
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl ring-2 ring-white/10"
                      style={{
                        background:
                          "linear-gradient(135deg, #1B6B8A 0%, #F97316 100%)",
                      }}
                      aria-hidden
                    >
                      {initials(coach.name)}
                    </div>
                  )}
                </div>

                <h3 className="text-white font-semibold text-base text-center mb-1">
                  {coach.name}
                </h3>
                <p className="text-[#F97316] text-xs font-medium text-center">
                  {coach.title}
                </p>

                <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M3 8l3.5 3.5L13 4" />
                  </svg>
                  <span className="text-[11px] text-gray-400">MYK Belgeli</span>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
