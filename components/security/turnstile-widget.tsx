"use client"

import { useEffect } from "react"
import Script from "next/script"

// Cloudflare Turnstile widget'ı. Site key yoksa (env tanımsız) hiçbir şey çizmez.
// Widget, formun içine `cf-turnstile-response` gizli alanını kendisi ekler.
// Token tek kullanımlık: başarısız gönderimden sonra resetKey değiştirilerek yenilenir.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type TurnstileApi = { reset: (el?: string | HTMLElement) => void }

export function TurnstileWidget({ resetKey }: { resetKey?: unknown }) {
  useEffect(() => {
    if (!SITE_KEY || resetKey === undefined) return
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile
    api?.reset()
  }, [resetKey])

  if (!SITE_KEY) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-language="tr" data-theme="light" />
    </>
  )
}
