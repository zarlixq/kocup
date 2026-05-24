"use client"

import { useEffect, useRef, useState } from "react"
import { Users, GraduationCap, TrendingUp, Headphones } from "lucide-react"

type Stat = {
  icon: typeof Users
  value: number
  suffix?: string
  prefix?: string
  label: string
}

const STATS: Stat[] = [
  { icon: Users, value: 150, suffix: "+", label: "Aktif öğrenci" },
  { icon: GraduationCap, value: 4, label: "Sertifikalı koç" },
  { icon: TrendingUp, value: 92, prefix: "%", label: "YKS başarı" },
  { icon: Headphones, value: 24, suffix: "/7", label: "Koç desteği" },
]

function useCountUp(target: number, durationMs = 1500) {
  const [value, setValue] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setValue(target)
      return
    }
    if (!shouldAnimate) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shouldAnimate, target, durationMs])

  return { value, start: () => setShouldAnimate(true) }
}

function StatCell({ stat, started }: { stat: Stat; started: boolean }) {
  const { value, start } = useCountUp(stat.value)
  useEffect(() => {
    if (started) start()
  }, [started, start])
  const Icon = stat.icon
  return (
    <div className="flex items-center gap-4 px-5 py-5">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-[#1B6B8A]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#1B6B8A]" />
      </div>
      <div className="flex flex-col">
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 leading-none tabular-nums">
          {stat.prefix}
          {value}
          <span className="text-[#F97316]">{stat.suffix}</span>
        </div>
        <div className="text-xs font-medium text-zinc-500 mt-1.5">{stat.label}</div>
      </div>
    </div>
  )
}

export function StatsBar() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="relative -mt-10 md:-mt-14 z-10 px-5 md:px-8 lg:px-12">
      <div
        ref={ref}
        className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl shadow-black/5 border border-zinc-100 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-zinc-100"
      >
        {STATS.map((s) => (
          <StatCell key={s.label} stat={s} started={started} />
        ))}
      </div>
    </section>
  )
}
