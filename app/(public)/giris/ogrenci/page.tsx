import Link from "next/link"
import { BrandLogo } from "@/components/brand/logo"
import { OgrenciGirisForm } from "./form"

const LINK_ERRORS: Record<string, string> = {
  otp_expired: "Bağlantının süresi dolmuş veya daha önce kullanılmış. Giriş yapmayı dene ya da yeni bağlantı iste.",
  link_gecersiz: "Bağlantı geçersiz. Giriş yapmayı dene ya da yeni bağlantı iste.",
}

export default async function OgrenciGirisPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const linkError = error ? LINK_ERRORS[error] ?? "Bağlantı doğrulanamadı. Lütfen tekrar dene." : null

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Öğrenci Girişi</h1>
          <p className="text-sm text-zinc-500 mb-6">Öğrenci panelinize giriş yapın.</p>

          {linkError && (
            <p className="mb-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{linkError}</p>
          )}

          <OgrenciGirisForm />
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Henüz hesabın yok mu?{" "}
          <Link href="/ucretsiz" className="text-[#1B6B8A] font-medium hover:underline">
            Ücretsiz başla
          </Link>
        </p>
        <p className="text-center text-xs text-zinc-400 mt-2">
          Birebir koçluk mu istiyorsun?{" "}
          <Link href="/basvuru" className="hover:underline">
            Koçluk başvurusu
          </Link>
        </p>
      </div>
    </div>
  )
}
