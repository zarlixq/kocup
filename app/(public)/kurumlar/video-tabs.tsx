"use client"

import { useState } from "react"
import { Play, Clapperboard } from "lucide-react"
import { KURUMLAR_VIDEOS } from "./config"

const TABS = [
  {
    key: "mudur",
    label: "Müdür Paneli",
    promise: "Tüm dershanenizi tek ekrandan yönetin.",
  },
  {
    key: "koc",
    label: "Koç Paneli",
    promise: "Her koç, öğrencisini birebir takip etsin.",
  },
  {
    key: "ogrenci",
    label: "Öğrenci Paneli",
    promise: "Öğrenci ne yapacağını tam bilsin.",
  },
] as const

type TabKey = (typeof TABS)[number]["key"]

const isReady = (url: string) => /^https?:\/\//.test(url)

// YouTube/Vimeo linkini embed URL'e çevirir; düz dosya (mp4 vb.) için null döner.
function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  return null
}

export function VideoTabs() {
  const [active, setActive] = useState<TabKey>("mudur")
  // Video, kullanıcı oynat'a basana kadar DOM'a girmez (lazy-load / sayfa hızı).
  const [playing, setPlaying] = useState<TabKey | null>(null)

  const tab = TABS.find((t) => t.key === active)!
  const url = KURUMLAR_VIDEOS[active]
  const ready = isReady(url)
  const embedUrl = ready ? toEmbedUrl(url) : null

  return (
    <div>
      {/* Sekmeler */}
      <div
        role="tablist"
        aria-label="Panel tanıtım videoları"
        className="flex gap-1 rounded-full bg-zinc-100 p-1 max-w-md mx-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 min-h-[44px] rounded-full px-2 text-[13px] sm:text-sm font-semibold transition-colors ${
              active === t.key
                ? "bg-white text-[#1B6B8A] shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="mt-5 md:mt-8 rounded-2xl md:rounded-3xl overflow-hidden bg-[#0F1F28] ring-1 ring-zinc-900/10 shadow-xl shadow-zinc-900/10">
        <div className="relative aspect-video">
          {playing === active && ready ? (
            embedUrl ? (
              <iframe
                src={embedUrl}
                title={`${tab.label} tanıtım videosu`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <video
                src={url}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full"
              />
            )
          ) : (
            <button
              type="button"
              onClick={() => ready && setPlaying(active)}
              disabled={!ready}
              aria-label={ready ? `${tab.label} videosunu oynat` : "Video yakında"}
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] group"
            >
              {ready ? (
                <>
                  <span className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#F97316] flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                    <Play className="w-7 h-7 md:w-8 md:h-8 text-white translate-x-0.5" fill="currentColor" aria-hidden="true" />
                  </span>
                  <span className="text-white/90 text-sm font-medium">
                    {tab.label} tanıtımını izle
                  </span>
                </>
              ) : (
                <>
                  <span className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Clapperboard className="w-7 h-7 text-white/70" aria-hidden="true" />
                  </span>
                  <span className="text-white/80 text-sm font-medium">
                    {tab.label} tanıtım videosu çok yakında
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tek satır vaat */}
      <p className="text-center text-zinc-600 text-sm md:text-base font-medium mt-4 md:mt-5">
        {tab.promise}
      </p>
    </div>
  )
}
