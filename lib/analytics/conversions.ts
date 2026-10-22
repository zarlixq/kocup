"use client"

import { CONSENT_COOKIE } from "@/lib/analytics/consent"

// Reklam dönüşüm olayları — Meta Pixel + Google Ads/GA4 (gtag).
// Yalnız çerez onayı "kabul" iken ve ilgili ID env'de tanımlıysa gönderilir;
// etiketler components/legal/cookie-consent.tsx'te onayla birlikte yüklenir.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

export type ConversionEvent = "signup" | "upplan_setup"

const GADS_ID = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID ?? ""
const GADS_LABELS: Record<ConversionEvent, string> = {
  signup: process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL ?? "",
  upplan_setup: process.env.NEXT_PUBLIC_GADS_SETUP_CONVERSION_LABEL ?? "",
}

export function hasAdConsent(): boolean {
  return typeof document !== "undefined" && new RegExp(`(?:^|; )${CONSENT_COOKIE}=kabul`).test(document.cookie)
}

function sendGoogle(event: ConversionEvent) {
  const gtag = window.gtag!
  if (GADS_LABELS[event]) gtag("event", "conversion", { send_to: `${GADS_ID}/${GADS_LABELS[event]}` })
  // GA4 olayı (GA4 yapılandırılmışsa raporlanır; yoksa etkisiz).
  gtag("event", event === "signup" ? "sign_up" : "upplan_setup_complete", { method: "ucretsiz" })
}

function sendMeta(event: ConversionEvent) {
  const fbq = window.fbq!
  if (event === "signup") fbq("track", "CompleteRegistration")
  else fbq("trackCustom", "UpPlanSetupComplete")
}

/** Etiket henüz yüklenmediyse ~6 sn boyunca 300 ms arayla yeniden dener. */
function whenReady(ready: () => boolean, run: () => void, tries = 0) {
  if (ready()) return run()
  if (tries < 20) window.setTimeout(() => whenReady(ready, run, tries + 1), 300)
}

/** Onay yoksa sessizce hiçbir şey yapmaz. ID tanımlı değilse o platforma gönderilmez. */
export function trackConversion(event: ConversionEvent): void {
  if (typeof window === "undefined" || !hasAdConsent()) return
  if (GADS_ID) whenReady(() => typeof window.gtag === "function", () => sendGoogle(event))
  // Pixel yalnız META_PIXEL_ID tanımlıyken yüklenir; yüklenmezse fbq hiç oluşmaz.
  whenReady(() => typeof window.fbq === "function", () => sendMeta(event))
}
