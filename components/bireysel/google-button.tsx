"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { currentUtm, UTM_KEYS } from "@/lib/analytics/utm"

// "Google ile devam et" — yalnız Supabase'de Google sağlayıcısı açıkken gösterilir.
// İlk girişte /ucretsiz/tamamla sınıf/alan ve onayları sorar; UTM oraya taşınır.

export function GoogleButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setPending(true)
    setError(null)
    const utm = currentUtm()
    const next = new URLSearchParams()
    for (const k of UTM_KEYS) if (utm[k]) next.set(k, utm[k]!)
    const nextPath = `/ucretsiz/tamamla${next.size ? `?${next.toString()}` : ""}`
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    })
    if (err) {
      setPending(false)
      setError("Google ile bağlanılamadı, tekrar dene.")
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
        </svg>
        {pending ? "Google'a yönlendiriliyor..." : "Google ile devam et"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
