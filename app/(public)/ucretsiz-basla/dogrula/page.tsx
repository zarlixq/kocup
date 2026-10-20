import type { Metadata } from "next"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { ResendVerificationForm } from "./resend-form"

export const metadata: Metadata = {
  title: "E-postanı Doğrula",
  robots: { index: false, follow: false },
}

export default async function DogrulaPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <MailCheck className="mx-auto h-10 w-10 text-[#1B6B8A]" />
          <h1 className="mt-4 text-xl font-bold text-zinc-900">E-postanı kontrol et</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {email ? (
              <>
                <span className="font-medium text-zinc-900">{email}</span> adresine bir doğrulama bağlantısı
                gönderdik.
              </>
            ) : (
              "E-posta adresine bir doğrulama bağlantısı gönderdik."
            )}{" "}
            Bağlantıya tıkladığında UpPlan kurulumuna yönlendirileceksin.
          </p>
          <p className="mt-2 text-xs text-zinc-500">Gelmediyse istenmeyen (spam) klasörüne de bak.</p>
          <div className="mt-6 text-left">
            <ResendVerificationForm email={email ?? ""} />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Doğruladın mı?{" "}
          <Link href="/giris/ogrenci" className="font-medium text-[#1B6B8A] hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
