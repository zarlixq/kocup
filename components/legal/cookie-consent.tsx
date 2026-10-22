"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { CONSENT_COOKIE } from "@/lib/analytics/consent"

// Çerez bildirimi + Google Ads etiketi ve Meta Pixel'in izne bağlı yüklenmesi.
// Tercih birinci taraf çerezde (kocup_cerez) tutulur; localStorage kullanılmaz.

const COOKIE = CONSENT_COOKIE
// Etiket kimliği env'den; tanımlı değilse mevcut hesap (başvuru dönüşümü bozulmasın).
const ADS_ID = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID || "AW-18185085898"
const CHANGE_EVENT = "kocup-cerez-degisti"

type Choice = "kabul" | "red"

function readChoice(): Choice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(kabul|red)`))
  return (m?.[1] as Choice | undefined) ?? null
}

function writeChoice(choice: Choice | null) {
  const maxAge = choice ? 60 * 60 * 24 * 365 : 0
  document.cookie = `${COOKIE}=${choice ?? ""}; path=/; max-age=${maxAge}; samesite=lax`
  if (choice) document.documentElement.setAttribute("data-cerez", choice)
  else document.documentElement.removeAttribute("data-cerez")
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** metaPixelId: sunucuda META_PIXEL_ID env'inden (yalnız rakam); yoksa Pixel yüklenmez. */
export function CookieConsent({ metaPixelId }: { metaPixelId?: string | null }) {
  const pixelId = metaPixelId && /^\d{5,20}$/.test(metaPixelId) ? metaPixelId : null
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
          {pixelId && (
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
                n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
                document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
          )}
        </>
      )}
      {/* Sunucuda da render edilir (ilk boyamada görünür, LCP gecikmesin); tercih
          verilmişse kökteki inline betik html[data-cerez] koyar → CSS gizler. */}
      {(choice === null || choice === undefined) && (
        <div
          role="dialog"
          aria-label="Çerez bildirimi"
          className="cookie-banner fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg md:inset-x-auto md:left-4"
        >
          <p className="text-sm text-zinc-700">
            Sitenin çalışması için zorunlu çerezler kullanıyoruz. İzin verirsen reklam kampanyalarımızı ölçmek için
            Google Ads ve Meta (Facebook/Instagram) çerezleri de yüklenir.{" "}
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
