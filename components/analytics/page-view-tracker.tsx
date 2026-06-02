"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { trackPageView } from "@/lib/analytics/track"

/**
 * Public site içi her route değişiminde /api/track'e page_view gönderir.
 * Aynı pathname'i ardışık tekrar göndermez (React strict mode + duplicate effect koruması).
 * KVKK uyumu: hiçbir kişisel veri/IP göndermez — sadece path, anon session ve referrer.
 */
export function PageViewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (lastTracked.current === pathname) return
    lastTracked.current = pathname
    trackPageView(pathname)
  }, [pathname])

  return null
}
