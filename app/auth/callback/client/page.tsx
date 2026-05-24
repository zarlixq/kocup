"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function CallbackClientPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Bağlantı doğrulanıyor...")

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash

      if (!hash) {
        router.replace("/giris/koc?error=link_gecersiz")
        return
      }

      const params = new URLSearchParams(hash)
      const errorCode = params.get("error_code") ?? params.get("error")
      if (errorCode) {
        router.replace(`/giris/koc?error=${encodeURIComponent(errorCode)}`)
        return
      }

      const access_token = params.get("access_token")
      const refresh_token = params.get("refresh_token")

      if (!access_token || !refresh_token) {
        router.replace("/giris/koc?error=link_gecersiz")
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })

      // Token'ları URL'den temizle (history'de görünür kalmasın)
      window.history.replaceState(null, "", "/auth/callback/client")

      if (error) {
        router.replace(
          `/giris/koc?error=${encodeURIComponent(error.code ?? "session_failed")}`
        )
        return
      }

      setMessage("Yönlendiriliyorsun...")
      router.replace("/sifre-belirle")
      router.refresh()
    }

    run()
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-sm text-zinc-600">{message}</div>
    </div>
  )
}
