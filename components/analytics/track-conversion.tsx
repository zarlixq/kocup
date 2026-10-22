"use client"

import { useEffect, useRef } from "react"
import { trackConversion, type ConversionEvent } from "@/lib/analytics/conversions"

/**
 * Sayfa açılışında bir kez dönüşüm olayı gönderir ve tetikleyen sorgu parametresini
 * (ör. ?kayit=1) adres çubuğundan siler — yenilemede tekrar sayılmaz.
 */
export function TrackConversion({ event, param }: { event: ConversionEvent; param: string }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackConversion(event)
    const url = new URL(window.location.href)
    url.searchParams.delete(param)
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  }, [event, param])

  return null
}
