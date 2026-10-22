"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { safeNext } from "@/lib/auth/safe-next"
import { markVerifiedFromEmailLink } from "@/lib/auth/verification-actions"

export default function CallbackClientPage() {
  const [message, setMessage] = useState("Bağlantı doğrulanıyor...")

  useEffect(() => {
    const run = async () => {
      // E-posta doğrulaması gibi akışlar ?next= ile hedef taşır.
      const next = safeNext(new URLSearchParams(window.location.search).get("next"))
      const loginPath = next?.startsWith("/ogrenci") ? "/giris/ogrenci" : "/giris/koc"
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash

        if (!hash) {
          window.location.replace(`${loginPath}?error=link_gecersiz`)
          return
        }

        const params = new URLSearchParams(hash)
        const errorCode = params.get("error_code") ?? params.get("error")
        if (errorCode) {
          window.location.replace(
            `${loginPath}?error=${encodeURIComponent(errorCode)}`
          )
          return
        }

        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")

        if (!access_token || !refresh_token) {
          window.location.replace(`${loginPath}?error=link_gecersiz`)
          return
        }

        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })

        if (error) {
          window.location.replace(
            `${loginPath}?error=${encodeURIComponent(error.code ?? "session_failed")}`
          )
          return
        }

        // E-posta bağlantısıyla gelindiyse bireysel öğrencinin e-postası doğrulandı.
        await markVerifiedFromEmailLink()

        // Hash'i URL'den temizle (token bar'da kalmasın)
        window.history.replaceState(null, "", "/auth/callback/client")

        setMessage("Yönlendiriliyorsun...")
        // Hard navigation — yeni cookie ile Server Component'in yeniden
        // session okuması için gerekli. router.replace soft nav yapar ve
        // RSC payload stale kalabilir.
        window.location.replace(next ?? "/sifre-belirle")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "callback_error"
        window.location.replace(
          `${loginPath}?error=${encodeURIComponent(msg)}`
        )
      }
    }

    run()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-sm text-zinc-600">{message}</div>
    </div>
  )
}
