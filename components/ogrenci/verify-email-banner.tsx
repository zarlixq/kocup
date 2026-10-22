"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, MailWarning, X } from "lucide-react"
import { sendMyVerificationEmail } from "@/app/ogrenci/verify-actions"
import { VERIFY_BANNER_COOKIE } from "@/lib/auth/verify-banner"

// Doğrulanmamış bireysel öğrenci bandı. Kapatma 3 gün çerezde (localStorage yok).
export function VerifyEmailBanner({ email }: { email: string }) {
  const [hidden, setHidden] = useState(false)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  if (hidden) return null

  function dismiss() {
    document.cookie = `${VERIFY_BANNER_COOKIE}=gizli; path=/ogrenci; max-age=${60 * 60 * 24 * 3}; samesite=lax`
    setHidden(true)
  }

  function send() {
    start(async () => {
      const res = await sendMyVerificationEmail()
      if (!res.success) return void toast.error(res.error ?? "Bir hata oluştu, tekrar deneyin.")
      setSent(true)
      toast.success(`Doğrulama bağlantısı ${email} adresine gönderildi.`)
    })
  }

  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:items-center sm:p-4">
      <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-900">
          E-postanı doğrula, böylece şifreni unutursan hesabını kurtarabilirsin.
        </p>
        <button
          type="button"
          onClick={send}
          disabled={pending || sent}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-[#1B6B8A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#155a75] disabled:opacity-60 sm:self-auto"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {sent ? "Gönderildi" : "Doğrulama e-postası gönder"}
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Bandı kapat" className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
