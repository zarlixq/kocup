"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"

// Çerez bildirimi + Google Ads etiketinin izne bağlı yüklenmesi.
// Tercih birinci taraf çerezde (kocup_cerez) tutulur; localStorage kullanılmaz.

const COOKIE = "kocup_cerez"
const ADS_ID = "AW-18185085898"
const CHANGE_EVENT = "kocup-cerez-degisti"

type Choice = "kabul" | "red"

function readChoice(): Choice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(kabul|red)`))
  return (m?.[1] as Choice | undefined) ?? null
}

function writeChoice(choice: Choice | null) {
  const maxAge = choice ? 60 * 60 * 24 * 365 : 0
  document.cookie = `${COOKIE}=${choice ?? ""}; path=/; max-age=${maxAge}; samesite=lax`
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined)

  useEffect(() => {
    const sync = () => setChoice(readChoice())
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    return () => window.removeEventListener(CHANGE_EVENT, sync)
  }, [])

  return (
    <>
      {choice === "kabul" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`} strategy="afterInteractive" />
          <Script id="google-ads-tag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${ADS_ID}');
            `}
          </Script>
        </>
      )}
      {choice === null && (
        <div
          role="dialog"
          aria-label="Çerez bildirimi"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg md:inset-x-auto md:left-4"
        >
          <p className="text-sm text-zinc-700">
            Sitenin çalışması için zorunlu çerezler kullanıyoruz. İzin verirsen reklam kampanyalarımızı ölçmek için
            Google Ads çerezleri de yüklenir.{" "}
            <Link href="/cerez-politikasi" className="text-[#1B6B8A] underline">
              Çerez Politikası
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => writeChoice("red")}>
              Yalnız zorunlu
            </Button>
            <Button size="sm" className="bg-[#1B6B8A] hover:bg-[#155a75]" onClick={() => writeChoice("kabul")}>
              Kabul et
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/** Çerez Politikası sayfasında tercihi sıfırlar (bildirim yeniden çıkar). */
export function CookiePreferenceReset() {
  return (
    <Button variant="outline" size="sm" onClick={() => writeChoice(null)}>
      Çerez tercihimi sıfırla
    </Button>
  )
}
