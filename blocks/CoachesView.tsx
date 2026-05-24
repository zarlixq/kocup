"use client"

import { useEffect, useRef } from "react"

export type LandingCoach = {
  id: string
  full_name: string
  bio: string | null
  certificate_info: string | null
  specialties: string[]
  bgIndex: number
}

const bgClasses = ["bg-[#1B6B8A]", "bg-[#F97316]", "bg-emerald-600", "bg-violet-600"]

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function CoachesView({ coaches }: { coaches: LandingCoach[] }) {
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
      { threshold: 0.1 }
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [coaches.length])

  return (
    <section id="koclarimiz" className="bg-[#0F1F28] py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        <div
          ref={(el) => {
            refs.current[0] = el
          }}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-4">
            Ekibimiz
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-lg">
            Psikoloji mezunu,{" "}
            <span className="text-[#F97316]">sınav uzmanı</span> koçlar.
          </h2>
          <p className="text-gray-400 text-base mt-4 max-w-xl leading-relaxed">
            Ekibimizdeki her koç hem psikoloji eğitimi almış hem de MYK Onaylı Eğitim Koçluğu Sertifikası&apos;na sahip.
            Sadece ders değil, gerçek bir rehberlik alıyorsun.
          </p>
        </div>

        {coaches.length === 0 ? (
          <div
            ref={(el) => {
              refs.current[1] = el
            }}
            className="opacity-0 translate-y-6 transition-all duration-700 bg-white/5 border border-white/10 rounded-2xl p-12 text-center"
          >
            <p className="text-gray-400">Ekibimiz yakında.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coaches.map((coach, i) => (
              <div
                key={coach.id}
                ref={(el) => {
                  refs.current[i + 1] = el
                }}
                className="opacity-0 translate-y-6 transition-all duration-700"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full hover:bg-white/10 hover:-translate-y-1 transition-all duration-200">
                  <div
                    className={`w-12 h-12 rounded-xl ${bgClasses[coach.bgIndex]} flex items-center justify-center text-white font-bold text-base mb-4`}
                  >
                    {initials(coach.full_name)}
                  </div>

                  <h3 className="text-white font-bold text-base mb-0.5">{coach.full_name}</h3>
                  {coach.specialties.length > 0 && (
                    <p className="text-[#F97316] text-xs font-semibold mb-3">
                      {coach.specialties.slice(0, 2).join(" • ")}
                    </p>
                  )}
                  {coach.bio && (
                    <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-4">{coach.bio}</p>
                  )}

                  {coach.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {coach.specialties.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {coach.certificate_info && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#F97316"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M3 8l3.5 3.5L13 4" />
                      </svg>
                      <span className="text-xs text-gray-400">{coach.certificate_info}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
