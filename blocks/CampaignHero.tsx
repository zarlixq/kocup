import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { FREE_SIGNUP_PATH } from "@/lib/campaign"

// Kampanya modunda ana sayfanın en üstü: koçu olmayan öğrenciye ücretsiz UpPlan.
// Ekran görüntüleri public/images/upplan/ altında; "Bugün" ekranı için yer tutucu.

type Shot = { label: string; src: string | null; width: number; height: number }

const SHOTS: Shot[] = [
  { label: "Bugün", src: null, width: 1600, height: 920 },
  { label: "Yol haritası", src: "/images/upplan/yol-haritasi.png", width: 1593, height: 912 },
  { label: "Haftalık program", src: "/images/upplan/haftalik-program.png", width: 1597, height: 920 },
]

function ShotFrame({ shot, priority, sizes }: { shot: Shot; priority?: boolean; sizes: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {shot.src ? (
        <Image src={shot.src} alt={`UpPlan ${shot.label.toLocaleLowerCase("tr")} ekranı`} width={shot.width} height={shot.height} sizes={sizes} priority={priority} className="h-auto w-full" />
      ) : (
        // TODO(görsel): "Bugün" ekran görüntüsü eklenince src doldurulacak.
        <div className="flex aspect-[1600/920] w-full flex-col items-center justify-center gap-2 bg-zinc-50 text-zinc-400">
          <CalendarDays className="h-8 w-8" aria-hidden />
          <span className="text-xs text-zinc-500">Ekran görüntüsü: {shot.label}</span>
        </div>
      )}
      <figcaption className="border-t border-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">{shot.label}</figcaption>
    </figure>
  )
}

export default function CampaignHero() {
  return (
    <section className="bg-gradient-to-b from-[#1B6B8A]/[0.07] to-white px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-14 lg:px-12">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <div>
          <span className="inline-block rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#c2410c]">
            Öğrenciler için ücretsiz
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl">
            Koçun yoksa da <span className="text-[#1B6B8A]">planlı çalış.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-600 md:text-lg">
            UpPlan sana sınava kadar kişisel yol haritası ve haftalık program çıkarır, izlediğin playlist&apos;i takip eder,
            yanlışlarından eksik konularını bulur. Tamamen ücretsiz.
          </p>
          <div className="mt-7">
            <Link
              href={FREE_SIGNUP_PATH}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#EA580C] px-8 text-xl font-bold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-[#c2410c] sm:w-auto"
            >
              Ücretsiz başla
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm text-zinc-500 sm:text-left">Kredi kartı yok · 2 dakikada kurulum</p>
          </div>
        </div>

        {/* Mobil: yatay kaydırmalı; masaüstü: büyük + iki küçük */}
        <div className="-mx-4 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:hidden">
          {SHOTS.map((s) => (
            <div key={s.label} className="w-[82%] shrink-0 snap-center sm:w-[60%]">
              <ShotFrame shot={s} sizes="(min-width: 640px) 60vw, 82vw" />
            </div>
          ))}
        </div>
        <div className="hidden gap-3 lg:grid lg:grid-cols-2">
          <div className="col-span-2">
            <ShotFrame shot={SHOTS[1]!} priority sizes="(min-width: 1024px) 600px, 100vw" />
          </div>
          <ShotFrame shot={SHOTS[0]!} sizes="300px" />
          <ShotFrame shot={SHOTS[2]!} sizes="300px" />
        </div>
      </div>
    </section>
  )
}
