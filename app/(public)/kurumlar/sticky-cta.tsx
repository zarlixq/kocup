"use client"

import { useEffect, useState } from "react"
import { Phone } from "lucide-react"
import { KURUMLAR_CONTACT } from "./config"

/** Mobilde her an erişilebilir alt CTA barı; demo formu görünürken gizlenir. */
export function StickyCta() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const target = document.getElementById("demo")
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -25% 0px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
        <a
          href={KURUMLAR_CONTACT.phoneHref}
          aria-label={`Hemen arayın: ${KURUMLAR_CONTACT.phoneDisplay}`}
          className="w-12 h-12 shrink-0 rounded-xl border border-zinc-300 bg-white flex items-center justify-center text-[#1B6B8A] active:bg-zinc-50"
        >
          <Phone className="w-5 h-5" aria-hidden="true" />
        </a>
        <a
          href="#demo"
          className="flex-1 h-12 rounded-xl bg-[#F97316] active:bg-[#ea6c10] text-white text-sm font-bold flex items-center justify-center shadow-md shadow-orange-500/25"
        >
          Demo Talep Et
        </a>
      </div>
    </div>
  )
}
